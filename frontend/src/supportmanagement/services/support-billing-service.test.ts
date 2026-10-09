import assert from 'node:assert/strict';

import { apiService } from '@common/services/api-service';
import { beforeEach, test, vi } from 'vitest';

import { saveBillingRecord } from './support-billing-service';
import type { SupportErrand } from './support-errand-service';

vi.mock('@common/services/api-service', () => ({ apiService: { put: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
vi.mock('@sk-web-gui/react', () => ({ useSnackbar: vi.fn() }));
vi.mock('@stores/index', () => ({ useBillingStore: vi.fn(), useConfigStore: vi.fn() }));
vi.mock('./support-errand-service', () => ({}));

const errandPointingAt = (billingRecordId?: string) =>
  ({
    id: 'errand-1',
    version: 4,
    externalTags: billingRecordId ? [{ key: 'billingRecordId', value: billingRecordId }] : [],
  } as unknown as SupportErrand);

/** An invoice as the form hands it over: no rows is enough for what is under test. */
const invoiceRecord = (id?: string) =>
  ({ ...(id ? { id } : {}), type: 'INTERNAL', invoice: { invoiceRows: [] } } as never);

beforeEach(() => {
  vi.mocked(apiService.put)
    .mockReset()
    .mockResolvedValue({ data: { id: 'record-1' } } as never);
  vi.mocked(apiService.post)
    .mockReset()
    .mockResolvedValue({ data: { id: 'record-1' } } as never);
  vi.mocked(apiService.patch)
    .mockReset()
    .mockResolvedValue({ data: true } as never);
});

test('leaves the errand alone when it already points to the saved invoice', async () => {
  assert.equal(await saveBillingRecord(errandPointingAt('record-1'), '2281', invoiceRecord('record-1')), true);

  assert.equal(vi.mocked(apiService.patch).mock.calls.length, 0);
});

test('points the errand to a new invoice', async () => {
  await saveBillingRecord(errandPointingAt(), '2281', invoiceRecord());

  const [url, body] = vi.mocked(apiService.patch).mock.calls[0];
  assert.equal(url, 'supporterrands/2281/errand-1');
  assert.deepEqual(body, { externalTags: [{ key: 'billingRecordId', value: 'record-1' }] });
});
