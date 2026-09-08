type ClientErrorKind = 'http' | 'network' | 'timeout' | 'cancelled' | 'deployment-mismatch' | 'error' | 'unknown';

interface ClientDiagnostic {
  operation: string;
  errorKind: ClientErrorKind;
  status?: number;
  requestId?: string;
  configurationField?: string;
}

/** Configuration identifiers are code-owned names (a feature flag, an environment key), never values. */
export interface ClientDiagnosticMetadata {
  readonly configurationField?: string;
}

const configurationField = (metadata: ClientDiagnosticMetadata | undefined): string | undefined => {
  const candidate = dataProperty(metadata, 'configurationField');
  return typeof candidate === 'string' && /^[a-z][a-z0-9_]{0,63}$/iu.test(candidate) ? candidate : undefined;
};

// Inspect only data properties. A thrown object may contain getters, a custom toJSON,
// circular payloads or Axios request/response objects; none may enter the console.
const dataProperty = (value: unknown, key: string): unknown => {
  if (typeof value !== 'object' || value === null) return undefined;
  try {
    return Object.getOwnPropertyDescriptor(value, key)?.value;
  } catch {
    return undefined;
  }
};

const errorKind = (error: unknown, httpStatus: number | undefined): ClientErrorKind => {
  if (dataProperty(error, 'name') === 'ApiDeploymentMismatchError') return 'deployment-mismatch';
  switch (dataProperty(error, 'code')) {
    case 'ERR_CANCELED':
      return 'cancelled';
    case 'ECONNABORTED':
    case 'ETIMEDOUT':
      return 'timeout';
    case 'ERR_NETWORK':
      return 'network';
  }
  if (httpStatus !== undefined) return 'http';
  try {
    return error instanceof Error ? 'error' : 'unknown';
  } catch {
    return 'unknown';
  }
};

const diagnostic = (operation: string, error: unknown, metadata?: ClientDiagnosticMetadata): ClientDiagnostic => {
  const response = dataProperty(error, 'response');
  const status = dataProperty(response, 'status') ?? dataProperty(error, 'status');
  const httpStatus =
    typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599 ? status : undefined;
  const headers = dataProperty(response, 'headers');
  const candidate = dataProperty(headers, 'x-request-id') ?? dataProperty(headers, 'X-Request-Id');
  const requestId =
    typeof candidate === 'string' &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu.test(candidate)
      ? candidate.toLowerCase()
      : undefined;

  return {
    // The logging contract check requires a literal at every callsite. This guard also
    // rejects malformed calls; it is not a substitute for that static privacy boundary.
    operation:
      typeof operation === 'string' && /^[a-z][a-z0-9._-]{0,159}$/iu.test(operation) ? operation : 'invalid-operation',
    errorKind: errorKind(error, httpStatus),
    ...(httpStatus === undefined ? {} : { status: httpStatus }),
    ...(requestId === undefined ? {} : { requestId }),
    ...(configurationField(metadata) === undefined ? {} : { configurationField: configurationField(metadata) }),
  };
};

/** Use a static operation label owned by the callsite. Never pass payload metadata. */
export const logClientFailure = (operation: string, error?: unknown, metadata?: ClientDiagnosticMetadata): void => {
  console.error('client.failure', diagnostic(operation, error, metadata));
};

/** Warnings have the same privacy boundary as failures, including in development. */
export const logClientWarning = (operation: string, error?: unknown, metadata?: ClientDiagnosticMetadata): void => {
  console.warn('client.warning', diagnostic(operation, error, metadata));
};
