import assert from 'node:assert/strict';

import { apiService } from '@common/services/api-service';
import { AxiosHeaders } from 'axios';
import { afterEach, test, vi } from 'vitest';

import { closeSupportErrand, setSupportErrandStatus } from './support-errand-service';

afterEach(() => vi.restoreAllMocks());

test('a dragon-specific closing code reaches the status command with its concurrency precondition intact', async () => {
  const patch = vi.spyOn(apiService, 'patch').mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
  assert.equal(
    await closeSupportErrand('test-errand', '2281', 'COMPANY_SUPPORTED', {
      status: 'WAITING_FOR_COMPANY',
      version: 4,
    }),
    true
  );
  assert.deepEqual(patch.mock.calls[0], [
    'supporterrands/2281/test-errand/status',
    {
      status: 'SOLVED',
      expectedStatus: 'WAITING_FOR_COMPANY',
      expectedVersion: 4,
      resolution: 'COMPANY_SUPPORTED',
    },
  ]);
});

test('a dragon-specific target status is preserved by the shared write operation', async () => {
  const patch = vi.spyOn(apiService, 'patch').mockResolvedValue({
    data: {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  });
  await setSupportErrandStatus('test-errand', '2281', 'WAITING_FOR_COMPANY', { status: 'ONGOING', version: 4 });
  assert.deepEqual(patch.mock.calls[0], [
    'supporterrands/2281/test-errand/status',
    {
      status: 'WAITING_FOR_COMPANY',
      expectedStatus: 'ONGOING',
      expectedVersion: 4,
      suspension: { suspendedFrom: undefined, suspendedTo: undefined },
    },
  ]);
});

test('supporting custom codes does not turn a conflicting close into success', async () => {
  const conflict = { response: { status: 412 } };
  vi.spyOn(apiService, 'patch').mockRejectedValue(conflict);
  await assert.rejects(
    closeSupportErrand('test-errand', '2281', 'COMPANY_SUPPORTED', {
      status: 'WAITING_FOR_COMPANY',
      version: 4,
    }),
    (error) => error === conflict
  );
});
