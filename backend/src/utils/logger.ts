import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

const EVENTS = new Set([
  'application.event',
  'application.warning',
  'application.failure',
  'http.request.completed',
  'http.request.failed',
  'upstream.request.completed',
  'upstream.request.failed',
  'process.uncaught_exception',
  'process.unhandled_rejection',
  'logging.invalid_record',
]);
const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'UNKNOWN']);
const ERROR_KINDS = new Set(['http', 'programming', 'syntax', 'internal', 'upstream_http', 'upstream_network', 'fatal']);
const ERROR_CODES = new Set([
  'HTTP_ERROR',
  'TYPE_ERROR',
  'RANGE_ERROR',
  'SYNTAX_ERROR',
  'UNEXPECTED_ERROR',
  'UPSTREAM_HTTP_ERROR',
  'UPSTREAM_REQUEST_ERROR',
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ERR_NETWORK',
  'ERR_CANCELED',
  'UNCAUGHT_EXCEPTION',
  'UNHANDLED_REJECTION',
  'INVALID_DIAGNOSTIC_RECORD',
]);
const ROLES = new Set(['draken_developer', 'draken_admin', 'draken_superadmin', 'draken_casedata_developer', 'draken_casedata_admin']);
const CHANNELS = new Set(['MINA_SIDOR', 'KATLA', 'DIGITAL_MAIL', 'EMAIL', 'WEBMESSAGE']);
const DELIVERY_STATUSES = new Set(['sent', 'failed', 'skipped']);
const ENVIRONMENTS = new Set(['production', 'development', 'test']);
const CONFIGURATION_FIELDS = new Set([
  'NODE_ENV',
  'SECRET_KEY',
  'API_BASE_URL',
  'CLIENT_KEY',
  'CLIENT_SECRET',
  'PORT',
  'BASE_URL_PREFIX',
  'SAML_CALLBACK_URL',
  'SAML_LOGOUT_CALLBACK_URL',
  'SAML_SUCCESS_REDIRECT',
  'SAML_FAILURE_REDIRECT',
  'SAML_FAILURE_REDIRECT_MESSAGE',
  'SAML_ENTRY_SSO',
  'SAML_ISSUER',
  'SAML_IDP_PUBLIC_CERT',
  'SAML_PRIVATE_KEY',
  'SAML_PUBLIC_KEY',
  'AUTHORIZED_GROUPS',
  'LOG_DIR',
  'LOG_RETENTION_DAYS',
  'ADMIN_GROUP',
  'DEVELOPER_GROUP',
  'SUPERADMIN_GROUP',
  'APPLICATION',
  'MUNICIPALITY_ID',
  'DOMAIN',
  'CASEDATA_SENDER_EMAIL',
  'CASEDATA_REPLY_TO',
  'CASEDATA_SENDER',
  'CASEDATA_SENDER_SMS',
  'CASEDATA_NAMESPACE',
  'SUPPORTMANAGEMENT_NAMESPACE',
  'SUPPORTMANAGEMENT_TEST_EMAIL',
  'SUPPORTMANAGEMENT_SENDER_EMAIL',
  'SUPPORTMANAGEMENT_SENDER_SMS',
]);

interface DiagnosticInput {
  readonly event?: unknown;
  readonly operation?: unknown;
  readonly requestId?: unknown;
  readonly route?: unknown;
  readonly method?: unknown;
  readonly status?: unknown;
  readonly durationMs?: unknown;
  readonly errorKind?: unknown;
  readonly errorCode?: unknown;
  readonly environment?: unknown;
  readonly port?: unknown;
  readonly role?: unknown;
  readonly count?: unknown;
  readonly channel?: unknown;
  readonly deliveryStatus?: unknown;
  readonly configurationFields?: unknown;
}

const allowed = (value: unknown, values: ReadonlySet<string>): string | undefined =>
  typeof value === 'string' && values.has(value) ? value : undefined;
const invalidRecord = () => ({ event: 'logging.invalid_record', errorCode: 'INVALID_DIAGNOSTIC_RECORD' });

/** Rebuild records from approved fields before serialization; never spread caller data. */
function safeRecord(value: unknown) {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidRecord();
    const field = (key: keyof DiagnosticInput): unknown => Object.getOwnPropertyDescriptor(value, key)?.value;
    const input: DiagnosticInput = {
      event: field('event'),
      operation: field('operation'),
      requestId: field('requestId'),
      route: field('route'),
      method: field('method'),
      status: field('status'),
      durationMs: field('durationMs'),
      errorKind: field('errorKind'),
      errorCode: field('errorCode'),
      environment: field('environment'),
      port: field('port'),
      role: field('role'),
      count: field('count'),
      channel: field('channel'),
      deliveryStatus: field('deliveryStatus'),
      configurationFields: field('configurationFields'),
    };
    const event = allowed(input.event, EVENTS);
    if (!event) return invalidRecord();
    const operation =
      typeof input.operation === 'string' && input.operation.length <= 240 && !/[\r\n\0]/u.test(input.operation) ? input.operation : undefined;
    const requestId =
      typeof input.requestId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(input.requestId)
        ? input.requestId
        : undefined;
    const route =
      typeof input.route === 'string' &&
      input.route.length <= 512 &&
      (/^\/[A-Za-z0-9_/:.*()\\-]*$/u.test(input.route) || ['<unmatched>', '<background>', '<pattern>'].includes(input.route))
        ? input.route
        : undefined;
    const method = allowed(input.method, METHODS);
    const status =
      typeof input.status === 'number' && Number.isInteger(input.status) && input.status >= 100 && input.status <= 599
        ? input.status
        : input.status === 'no-response'
          ? 'no-response'
          : undefined;
    const durationMs =
      typeof input.durationMs === 'number' &&
      Number.isFinite(input.durationMs) &&
      input.durationMs >= 0 &&
      input.durationMs <= Number.MAX_SAFE_INTEGER / 100
        ? Math.round(input.durationMs * 100) / 100
        : undefined;
    const portNumber =
      typeof input.port === 'number' ? input.port : typeof input.port === 'string' && /^\d{1,5}$/u.test(input.port) ? Number(input.port) : undefined;
    const port = portNumber !== undefined && Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535 ? portNumber : undefined;
    const count = typeof input.count === 'number' && Number.isSafeInteger(input.count) && input.count >= 0 ? input.count : undefined;
    const configurationFields = Array.isArray(input.configurationFields)
      ? [
          ...new Set(
            Object.values(Object.getOwnPropertyDescriptors(input.configurationFields))
              .map(descriptor => descriptor.value)
              .filter((field): field is string => typeof field === 'string' && CONFIGURATION_FIELDS.has(field)),
          ),
        ]
      : undefined;
    return {
      event,
      ...(operation !== undefined ? { operation } : {}),
      ...(requestId !== undefined ? { requestId } : {}),
      ...(route !== undefined ? { route } : {}),
      ...(method !== undefined ? { method } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(durationMs !== undefined ? { durationMs } : {}),
      ...(allowed(input.errorKind, ERROR_KINDS) ? { errorKind: input.errorKind } : {}),
      ...(allowed(input.errorCode, ERROR_CODES) ? { errorCode: input.errorCode } : {}),
      ...(allowed(input.environment, ENVIRONMENTS) ? { environment: input.environment } : {}),
      ...(port !== undefined ? { port } : {}),
      ...(allowed(input.role, ROLES) ? { role: input.role } : {}),
      ...(count !== undefined ? { count } : {}),
      ...(allowed(input.channel, CHANNELS) ? { channel: input.channel } : {}),
      ...(allowed(input.deliveryStatus, DELIVERY_STATUSES) ? { deliveryStatus: input.deliveryStatus } : {}),
      ...(configurationFields?.length ? { configurationFields } : {}),
    };
  } catch {
    return invalidRecord();
  }
}

const logDir = resolve(__dirname, process.env.LOG_DIR ?? '');

for (const directory of [logDir, join(logDir, 'debug'), join(logDir, 'error')]) {
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true, mode: 0o700 });
}

const retentionDays = process.env.LOG_RETENTION_DAYS;
if (retentionDays !== undefined && (!/^[1-9]\d*$/u.test(retentionDays) || !Number.isSafeInteger(Number(retentionDays)))) {
  throw new Error('LOG_RETENTION_DAYS must be a positive integer');
}
// Retain the existing file-count policy until an approved duration is configured.
const maxFiles = retentionDays === undefined ? 30 : `${retentionDays}d`;

// Define log format
const logFormat = winston.format.printf(({ timestamp, level, message }) => JSON.stringify({ timestamp, level, ...JSON.parse(String(message)) }));

/*
 * Log Level
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */
const logger = winston.createLogger({
  exitOnError: true,
  format: winston.format.combine(
    // Only approved records can reach a transport, even if a future internal
    // caller supplies an invalid message or attaches extra Winston metadata.
    winston.format(info => {
      let input: unknown;
      try {
        input = typeof info.message === 'string' ? JSON.parse(info.message) : undefined;
      } catch {
        input = undefined;
      }
      const level = ['info', 'warn', 'error'].includes(info.level) ? info.level : 'error';
      return { level, [Symbol.for('level')]: level, message: JSON.stringify(safeRecord(input)) };
    })(),
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    logFormat,
  ),
  transports: [
    // debug log setting
    new winstonDaily({
      level: 'debug',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir + '/debug', // log file /logs/debug/*.log in save
      filename: `%DATE%.log`,
      maxFiles,
      options: { flags: 'a', mode: 0o600 },
      json: false,
      zippedArchive: false,
    }),
    // error log setting
    new winstonDaily({
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      dirname: logDir + '/error', // log file /logs/error/*.log in save
      filename: `%DATE%.log`,
      maxFiles,
      options: { flags: 'a', mode: 0o600 },
      json: false,
      zippedArchive: false,
    }),
  ],
});

logger.add(new winston.transports.Console({}));

/** Only request-diagnostics may write runtime records; source enforcement protects that ownership. */
export const writeDiagnosticRecord = (level: 'info' | 'warn' | 'error', record: unknown): void => {
  const safeLevel = level === 'info' || level === 'warn' ? level : 'error';
  logger[safeLevel](JSON.stringify(safeRecord(record)));
};

// Own the process lifecycle explicitly: never hand raw thrown/rejected values to
// Winston's exception formatter, which reads arbitrary error messages and stacks.
let fatalStarted = false;
const terminateAfterFatalDiagnostic = (event: 'process.uncaught_exception' | 'process.unhandled_rejection'): void => {
  if (fatalStarted) return;
  fatalStarted = true;
  process.exitCode = 1;
  const forceExit = setTimeout(() => process.exit(1), 1500);
  const finish = () => {
    clearTimeout(forceExit);
    process.exit(1);
  };
  logger.error(
    JSON.stringify(
      safeRecord({ event, errorKind: 'fatal', errorCode: event === 'process.uncaught_exception' ? 'UNCAUGHT_EXCEPTION' : 'UNHANDLED_REJECTION' }),
    ),
  );
  const fileTransports = logger.transports.filter((transport): transport is winstonDaily => transport instanceof winstonDaily);
  const flushed = fileTransports.map(transport => new Promise<void>(resolve => transport.once('finish', resolve)));
  // close() unpipes each transport; DailyRotateFile emits finish after the file
  // stream's end callback. Ending the logger alone can exit before files flush.
  logger.close();
  Promise.all(flushed).then(() => process.stdout.write('', finish), finish);
};

process.on('uncaughtException', () => terminateAfterFatalDiagnostic('process.uncaught_exception'));
process.on('unhandledRejection', () => terminateAfterFatalDiagnostic('process.unhandled_rejection'));

export { logger };
