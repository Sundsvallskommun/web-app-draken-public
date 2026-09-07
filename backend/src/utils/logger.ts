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
  'ORIGIN',
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

function safeOperation(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= 240 && !/[\r\n\0]/u.test(value) ? value : undefined;
}

function safeRequestId(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/u.test(value) ? value : undefined;
}

function safeRoute(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 512) return undefined;
  return /^\/[A-Za-z0-9_/:.*()\\-]*$/u.test(value) || ['<unmatched>', '<background>', '<pattern>'].includes(value) ? value : undefined;
}

function integerInRange(value: unknown, minimum: number, maximum: number): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : undefined;
}

function safeStatus(value: unknown): number | 'no-response' | undefined {
  if (value === 'no-response') return value;
  return integerInRange(value, 100, 599);
}

function safeDuration(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER / 100) return undefined;
  return Math.round(value * 100) / 100;
}

function safePort(value: unknown): number | undefined {
  const port = typeof value === 'string' && /^\d{1,5}$/u.test(value) ? Number(value) : value;
  return integerInRange(port, 1, 65535);
}

function safeConfigurationFields(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const fields = [
    ...new Set(
      Object.values(Object.getOwnPropertyDescriptors(value))
        .map(descriptor => descriptor.value)
        .filter((field): field is string => typeof field === 'string' && CONFIGURATION_FIELDS.has(field)),
    ),
  ];
  return fields.length ? fields : undefined;
}

/** Rebuild records from approved data properties; never invoke accessors or spread caller data. */
function safeRecord(value: unknown) {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalidRecord();
    const field = (key: keyof DiagnosticInput): unknown => Object.getOwnPropertyDescriptor(value, key)?.value;
    const event = allowed(field('event'), EVENTS);
    if (!event) return invalidRecord();
    const record = {
      event,
      operation: safeOperation(field('operation')),
      requestId: safeRequestId(field('requestId')),
      route: safeRoute(field('route')),
      method: allowed(field('method'), METHODS),
      status: safeStatus(field('status')),
      durationMs: safeDuration(field('durationMs')),
      errorKind: allowed(field('errorKind'), ERROR_KINDS),
      errorCode: allowed(field('errorCode'), ERROR_CODES),
      environment: allowed(field('environment'), ENVIRONMENTS),
      port: safePort(field('port')),
      role: allowed(field('role'), ROLES),
      count: integerInRange(field('count'), 0, Number.MAX_SAFE_INTEGER),
      channel: allowed(field('channel'), CHANNELS),
      deliveryStatus: allowed(field('deliveryStatus'), DELIVERY_STATUSES),
      configurationFields: safeConfigurationFields(field('configurationFields')),
    };
    return Object.fromEntries(Object.entries(record).filter(([, field]) => field !== undefined));
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
