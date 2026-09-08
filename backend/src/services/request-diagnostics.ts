import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import axios from 'axios';
import { HttpError } from 'routing-controllers';

import type { DecisionChannel } from '@/dtos/message.dto';
import type { InternalRole } from '@/interfaces/users.interface';
import { exitAfterDiagnostics, writeDiagnosticRecord } from '@/utils/logger';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number] | 'UNKNOWN';

export interface RequestDiagnostics {
  readonly requestId: string;
  readonly method: HttpMethod;
  readonly startedAt: number;
  /** Reads the route registered by the server, never the requested URL or router baseUrl. */
  readonly routeTemplate: () => string;
}

const requests = new AsyncLocalStorage<RequestDiagnostics>();

const safeHttpMethod = (method: string | undefined): HttpMethod =>
  HTTP_METHODS.find(candidate => candidate === (typeof method === 'string' ? method.toUpperCase() : undefined)) ?? 'UNKNOWN';

export const createRequestDiagnostics = (method?: string, routeTemplate = () => '<background>'): RequestDiagnostics => ({
  requestId: randomUUID(),
  method: safeHttpMethod(method),
  startedAt: performance.now(),
  routeTemplate,
});

export const currentRequestDiagnostics = (): RequestDiagnostics | undefined => requests.getStore();

export const withRequestDiagnostics = <T>(diagnostics: RequestDiagnostics, action: () => T): T => requests.run(diagnostics, action);

// Error names, messages, stacks and arbitrary codes can contain request data. Only
// fixed classifications enter diagnostic records, including for unexpected errors.
const safeErrorDetails = (error: unknown) => {
  try {
    if (axios.isAxiosError(error)) {
      return {
        errorKind: error.response ? 'upstream_http' : 'upstream_network',
        errorCode: error.response ? 'UPSTREAM_HTTP_ERROR' : (NETWORK_ERROR_CODES.find(code => code === error.code) ?? 'UPSTREAM_REQUEST_ERROR'),
      } as const;
    }
    if (error instanceof HttpError) return { errorKind: 'http', errorCode: 'HTTP_ERROR' } as const;
    if (error instanceof TypeError) return { errorKind: 'programming', errorCode: 'TYPE_ERROR' } as const;
    if (error instanceof RangeError) return { errorKind: 'programming', errorCode: 'RANGE_ERROR' } as const;
    if (error instanceof SyntaxError) return { errorKind: 'syntax', errorCode: 'SYNTAX_ERROR' } as const;
  } catch {
    /* Unknown errors may have throwing accessors or be revoked proxies. */
  }
  return { errorKind: 'internal', errorCode: 'UNEXPECTED_ERROR' } as const;
};

const diagnosticFields = (diagnostics: RequestDiagnostics) => ({
  requestId: diagnostics.requestId,
  route: diagnostics.routeTemplate(),
});

/** Input fields have specific operational purposes; the transport validates their values before serialization. */
export interface ApplicationDiagnosticMetadata {
  readonly environment?: string;
  readonly port?: number | string;
  readonly role?: InternalRole;
  readonly count?: number;
  readonly channel?: DecisionChannel;
  readonly deliveryStatus?: 'sent' | 'failed' | 'skipped';
  readonly configurationFields?: readonly string[];
}

const ownMetadataValue = (metadata: ApplicationDiagnosticMetadata | undefined, field: keyof ApplicationDiagnosticMetadata): unknown => {
  try {
    return metadata ? Object.getOwnPropertyDescriptor(metadata, field)?.value : undefined;
  } catch {
    return undefined;
  }
};

const applicationRecord = (
  event: 'application.event' | 'application.warning' | 'application.failure',
  operation: string,
  metadata?: ApplicationDiagnosticMetadata,
) => ({
  event,
  operation,
  ...diagnosticFields(currentRequestDiagnostics() ?? createRequestDiagnostics()),
  environment: ownMetadataValue(metadata, 'environment'),
  port: ownMetadataValue(metadata, 'port'),
  role: ownMetadataValue(metadata, 'role'),
  count: ownMetadataValue(metadata, 'count'),
  channel: ownMetadataValue(metadata, 'channel'),
  deliveryStatus: ownMetadataValue(metadata, 'deliveryStatus'),
  configurationFields: ownMetadataValue(metadata, 'configurationFields'),
});

export const logApplicationEvent = (operation: string, metadata?: ApplicationDiagnosticMetadata): void => {
  writeDiagnosticRecord('info', applicationRecord('application.event', operation, metadata));
};

export const logApplicationWarning = (operation: string, metadata?: ApplicationDiagnosticMetadata): void => {
  writeDiagnosticRecord('warn', applicationRecord('application.warning', operation, metadata));
};

/** Operation names are static, code-owned labels. Never pass an error message or request value as the operation. */
export const logApplicationFailure = (operation: string, error?: unknown, metadata?: ApplicationDiagnosticMetadata): void => {
  writeDiagnosticRecord('error', {
    ...applicationRecord('application.failure', operation, metadata),
    ...(error === undefined ? {} : safeErrorDetails(error)),
  });
};

/** Startup validation exits through the same flush as fatal errors, so its records reach the log files. */
export const exitAfterDiagnosticFailure = (): Promise<never> => exitAfterDiagnostics(1);

/** `no-response` records a request whose socket closed before a response was written. */
export const logHttpRequest = (diagnostics: RequestDiagnostics, status: number | 'no-response', error?: unknown): void => {
  const record = {
    event: error === undefined ? 'http.request.completed' : 'http.request.failed',
    ...diagnosticFields(diagnostics),
    method: diagnostics.method,
    status,
    durationMs: Math.round((performance.now() - diagnostics.startedAt) * 100) / 100,
    ...(error === undefined ? {} : safeErrorDetails(error)),
  };
  if (error === undefined) writeDiagnosticRecord('info', record);
  else writeDiagnosticRecord('error', record);
};

const NETWORK_ERROR_CODES = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ERR_NETWORK',
  'ERR_CANCELED',
] as const;

interface UpstreamDiagnostics {
  readonly method: string | undefined;
  readonly startedAt: number;
  readonly status?: number;
  readonly error?: unknown;
}

/** Transport diagnostics reuse the incoming request id; no upstream URL, headers or payload enter logs. */
export const logUpstreamRequest = (diagnostics: RequestDiagnostics, upstream: UpstreamDiagnostics): void => {
  const { method, status, startedAt, error } = upstream;
  const failure = 'error' in upstream;
  const record = {
    event: failure ? 'upstream.request.failed' : 'upstream.request.completed',
    ...diagnosticFields(diagnostics),
    method: safeHttpMethod(method),
    status: status ?? 'no-response',
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    ...(failure ? safeErrorDetails(error) : {}),
  };
  if (failure) writeDiagnosticRecord('error', record);
  else writeDiagnosticRecord('info', record);
};
