import assert from 'node:assert/strict';

import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { saveChangedErrandParameters } from '@supportmanagement/services/support-parameter-service';
import { beforeEach, test, vi } from 'vitest';

import { masMarTakeErrand, saveMasMarHandler } from './mas-mar-handler-service';

vi.mock('@supportmanagement/services/support-parameter-service', () => ({ saveChangedErrandParameters: vi.fn() }));

const errand = (parameters: unknown[] = []) => ({ id: 'errand-id', parameters } as unknown as SupportErrand);

beforeEach(() => {
  vi.mocked(saveChangedErrandParameters).mockReset();
});

test('MAS/MAR take an errand as its MAS/MAR handler; nobody else, an administrator neither', () => {
  assert.notEqual(masMarTakeErrand({ roleKeys: ['mas-mar'] }), undefined);
  assert.notEqual(masMarTakeErrand({ roleKeys: ['enhetschef', 'mas-mar'] }), undefined);
  assert.equal(masMarTakeErrand({ roleKeys: [], superadmin: true }), undefined);
  assert.equal(masMarTakeErrand({ roleKeys: ['lex-ansvarig'] }), undefined);
  assert.equal(masMarTakeErrand({}), undefined);
});

test('an errand is taken by the MAS/MAR it records, whoever is assigned it', () => {
  const takeErrand = masMarTakeErrand({ roleKeys: ['mas-mar'] })!;
  const recorded = errand([{ key: 'masMarHandler', values: ['mas.mar'] }]);

  assert.equal(takeErrand.isTakenBy(recorded, 'mas.mar'), true);
  assert.equal(takeErrand.isTakenBy(recorded, 'other.mas.mar'), false);
  assert.equal(takeErrand.isTakenBy({ ...errand(), assignedUserId: 'mas.mar' } as SupportErrand, 'mas.mar'), false);
});

test('taking the errand records the viewer in masMarHandler, on the parameters the errand has', async () => {
  const parameters = [{ key: 'masMarHandler', values: ['other.mas.mar'], version: 3 }];

  await masMarTakeErrand({ roleKeys: ['mas-mar'] })!.take('2281', errand(parameters), 'mas.mar');

  assert.deepEqual(vi.mocked(saveChangedErrandParameters).mock.calls, [
    ['2281', 'errand-id', parameters, [{ key: 'masMarHandler', displayName: 'MAS/MAR', values: ['mas.mar'] }]],
  ]);
});

test('an errand without an id records no MAS/MAR handler', async () => {
  await assert.rejects(saveMasMarHandler('2281', { parameters: [] } as unknown as SupportErrand, 'mas.mar'));
  assert.equal(vi.mocked(saveChangedErrandParameters).mock.calls.length, 0);
});
