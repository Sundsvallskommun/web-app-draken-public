import assert from 'node:assert/strict';

import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, test, vi } from 'vitest';

import { logClientFailure, logClientWarning } from './client-diagnostics';

afterEach(() => vi.restoreAllMocks());

const sensitive = 'Anna Andersson 19900101-1234 anna@example.test +46701234567 hemlig-anteckning secret-token';
const requestId = 'b609e0b8-2644-47da-8c90-a6f9ce13ad69';

test('an Axios failure retains status and correlation while excluding request, response and error contents', () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const config = {
    url: `https://example.test/people/${sensitive}`,
    headers: new AxiosHeaders({ Authorization: sensitive, Cookie: sensitive }),
    data: { emails: [sensitive], phoneNumbers: [sensitive], note: sensitive },
  };
  const error = new AxiosError(
    sensitive,
    'ERR_BAD_RESPONSE',
    config,
    { payload: sensitive },
    {
      config,
      data: { message: sensitive, personId: sensitive },
      status: 503,
      statusText: sensitive,
      headers: new AxiosHeaders({ 'x-request-id': requestId, 'set-cookie': sensitive }),
    }
  );
  error.stack = sensitive;

  logClientFailure('support-message.send', error);

  assert.deepEqual(output.mock.calls, [
    [
      'client.failure',
      {
        operation: 'support-message.send',
        errorKind: 'http',
        status: 503,
        requestId,
      },
    ],
  ]);
  assert.ok(!JSON.stringify(output.mock.calls).includes(sensitive));
});

test('warnings use the same bounded fields and normalize a valid request UUID', () => {
  const output = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  logClientWarning('investigation.load', {
    response: { status: 404, headers: { 'X-Request-Id': requestId.toUpperCase() }, data: sensitive },
    message: sensitive,
  });
  assert.deepEqual(output.mock.calls, [
    [
      'client.warning',
      {
        operation: 'investigation.load',
        errorKind: 'http',
        status: 404,
        requestId,
      },
    ],
  ]);
});

test.each([
  ['ERR_NETWORK', 'network'],
  ['ECONNABORTED', 'timeout'],
  ['ETIMEDOUT', 'timeout'],
  ['ERR_CANCELED', 'cancelled'],
])('classifies %s without emitting the original error text', (code, expectedKind) => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  logClientFailure('message.send', new AxiosError(sensitive, code));
  assert.deepEqual(output.mock.calls, [['client.failure', { operation: 'message.send', errorKind: expectedKind }]]);
});

test('unknown codes, names, strings and nested payloads cannot become diagnostic fields', () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  for (const error of [sensitive, { name: sensitive, code: sensitive, message: sensitive }, null, undefined]) {
    logClientFailure('note.save', error);
  }
  assert.deepEqual(
    output.mock.calls,
    Array.from({ length: 4 }, () => ['client.failure', { operation: 'note.save', errorKind: 'unknown' }])
  );
});

test('ordinary errors and deployment mismatch have fixed categories', () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const mismatch = new Error(sensitive);
  mismatch.name = 'ApiDeploymentMismatchError';
  logClientFailure('application.render', new TypeError(sensitive));
  logClientFailure('application.render', mismatch);
  assert.deepEqual(output.mock.calls, [
    ['client.failure', { operation: 'application.render', errorKind: 'error' }],
    ['client.failure', { operation: 'application.render', errorKind: 'deployment-mismatch' }],
  ]);
});

test('rejects malformed statuses and correlation IDs instead of coercing or truncating them', () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const statuses: unknown[] = [99, 600, 500.5, NaN, Infinity, '500', sensitive, { toString: () => '500' }];
  const ids: unknown[] = [
    sensitive,
    `${requestId}\n${sensitive}`,
    ` ${requestId}`,
    [requestId],
    '00000000-0000-0000-0000-000000000000',
    { toString: () => requestId },
  ];
  for (const status of statuses) {
    for (const id of ids) {
      logClientFailure('stakeholder.save', { response: { status, headers: { 'x-request-id': id } } });
    }
  }
  for (const call of output.mock.calls) {
    assert.deepEqual(call, ['client.failure', { operation: 'stakeholder.save', errorKind: 'unknown' }]);
  }
});

test('does not invoke accessors or serializers and tolerates circular and revoked thrown objects', () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const trap = vi.fn(() => {
    throw new Error(sensitive);
  });
  const error = Object.defineProperties(
    { toJSON: trap, toString: trap },
    {
      response: { get: trap },
      name: { get: trap },
      code: { get: trap },
      status: { get: trap },
    }
  );
  const circular: { cause?: unknown } = {};
  circular.cause = circular;
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  for (const failure of [error, circular, revoked.proxy]) logClientFailure('message.send', failure);
  assert.equal(trap.mock.calls.length, 0);
  assert.deepEqual(
    output.mock.calls,
    Array.from({ length: 3 }, () => ['client.failure', { operation: 'message.send', errorKind: 'unknown' }])
  );
});

test('malformed operation text is never written to the console', () => {
  const output = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  logClientWarning(sensitive);
  assert.deepEqual(output.mock.calls, [['client.warning', { operation: 'invalid-operation', errorKind: 'unknown' }]]);
});

test('a configuration field is kept only when it is a plain identifier', () => {
  const output = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  logClientWarning('config.flags', undefined, { configurationField: 'useBillng' });
  for (const configurationField of [sensitive, 'x'.repeat(65), '1flag', 'flag name', '', undefined]) {
    logClientWarning('config.flags', undefined, { configurationField } as { configurationField?: string });
  }
  assert.deepEqual(output.mock.calls, [
    ['client.warning', { operation: 'config.flags', errorKind: 'unknown', configurationField: 'useBillng' }],
    ...Array.from({ length: 6 }, () => ['client.warning', { operation: 'config.flags', errorKind: 'unknown' }]),
  ]);
  assert.ok(!JSON.stringify(output.mock.calls).includes(sensitive));
});
