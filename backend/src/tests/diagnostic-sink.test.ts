import { logApplicationEvent, logApplicationFailure } from '@/services/request-diagnostics';
import { logger, writeDiagnosticRecord } from '@/utils/logger';

const privateValue = 'synthetic-private-case-and-token';
const record = (): unknown => JSON.parse(String(vi.mocked(logger.info).mock.calls.at(-1)?.[0]));

beforeEach(() => {
  vi.spyOn(logger, 'info').mockReturnValue(logger);
  vi.spyOn(logger, 'error').mockReturnValue(logger);
});
afterEach(() => vi.restoreAllMocks());

it('keeps useful typed fields and drops extra data before invoking transport serialization', () => {
  const fields = {
    event: 'http.request.completed',
    operation: 'Completed operation',
    requestId: '8f2a4c88-79cc-4000-8888-a51c18f44cba',
    route: '/errands/:id',
    method: 'POST',
    status: 201,
    durationMs: 12.349,
    environment: 'production',
    port: '3000',
    role: 'draken_admin',
    count: 2,
    channel: 'EMAIL',
    deliveryStatus: 'sent',
    configurationFields: ['PORT', privateValue],
    body: privateValue,
    toJSON: () => {
      throw new Error(privateValue);
    },
  };
  writeDiagnosticRecord('info', fields);
  expect(record()).toEqual({
    event: 'http.request.completed',
    operation: 'Completed operation',
    requestId: fields.requestId,
    route: '/errands/:id',
    method: 'POST',
    status: 201,
    durationMs: 12.35,
    environment: 'production',
    port: 3000,
    role: 'draken_admin',
    count: 2,
    channel: 'EMAIL',
    deliveryStatus: 'sent',
    configurationFields: ['PORT'],
  });
});

it('rejects invalid and forged diagnostic field values', () => {
  writeDiagnosticRecord('info', {
    event: 'upstream.request.failed',
    requestId: privateValue,
    route: `/errands/${privateValue}?secret=${privateValue}`,
    method: privateValue,
    status: 600,
    durationMs: Infinity,
    errorKind: privateValue,
    errorCode: privateValue,
    environment: privateValue,
    port: privateValue,
    role: privateValue,
    count: -1,
    channel: privateValue,
    deliveryStatus: privateValue,
  });
  expect(record()).toEqual({ event: 'upstream.request.failed' });
  writeDiagnosticRecord('info', { event: privateValue });
  expect(record()).toEqual({ event: 'logging.invalid_record', errorCode: 'INVALID_DIAGNOSTIC_RECORD' });
});

it('does not evaluate accessors, toJSON or circular metadata and cannot overwrite diagnostic identity', () => {
  const getter = vi.fn(() => {
    throw new Error(privateValue);
  });
  const metadata = { count: 3, event: privateValue, operation: privateValue, requestId: privateValue, toJSON: getter };
  Object.defineProperty(metadata, 'role', { get: getter });
  Object.defineProperty(metadata, 'extra', { value: metadata });
  logApplicationEvent('Example operation completed', metadata);
  expect(record()).toMatchObject({ event: 'application.event', operation: 'Example operation completed', count: 3 });
  expect(JSON.stringify(record())).not.toContain(privateValue);
  expect(getter).not.toHaveBeenCalled();
  writeDiagnosticRecord('info', Object.defineProperty({}, 'event', { get: getter }));
  expect(record()).toEqual({ event: 'logging.invalid_record', errorCode: 'INVALID_DIAGNOSTIC_RECORD' });
  expect(getter).not.toHaveBeenCalled();
});

it('classifies hostile unknown error values without changing application control flow', () => {
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const getter = Object.defineProperty({}, 'isAxiosError', {
    get: () => {
      throw new Error(privateValue);
    },
  });
  for (const error of [revoked.proxy, getter]) {
    expect(() => logApplicationFailure('Example operation failed', error)).not.toThrow();
  }
  const failures = vi.mocked(logger.error).mock.calls.map(([message]) => JSON.parse(String(message)));
  expect(failures).toHaveLength(2);
  expect(failures).toEqual(expect.arrayContaining([expect.objectContaining({ errorKind: 'internal', errorCode: 'UNEXPECTED_ERROR' })]));
  expect(JSON.stringify(failures)).not.toContain(privateValue);
});
