import { apiService } from '@common/services/api-service';
import { beforeEach, expect, test, vi } from 'vitest';

import { createSupportMeasure, decideSupportMeasure, updateSupportMeasure } from './support-measure-service';

vi.mock('@common/services/api-service', () => ({ apiService: { patch: vi.fn(), post: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

test('creates with a UUID and role key without an errand version or browser-supplied creator', async () => {
  const data = {
    measureTypeId: 'dd000000-0000-4000-8000-000000000100',
    addedByRole: 'NURSE',
    goal: 'Säkrare arbetssätt',
    description: 'Gemensam utbildning',
  };
  await createSupportMeasure('2281', 'errand-id', data);
  expect(apiService.post).toHaveBeenCalledWith('supporterrands/2281/errand-id/measures', data);
});

test('sends the edited measure version and UUID reference in separate header and body fields', async () => {
  const changes = { measureTypeId: 'dd000000-0000-4000-8000-000000000100' };
  await updateSupportMeasure('2281', 'errand-id', 'measure-id', 3, changes);
  expect(apiService.patch).toHaveBeenCalledWith('supporterrands/2281/errand-id/measures/measure-id', changes, {
    headers: { 'If-Match': '"3"' },
  });
});

test('accepts the initial measure version zero', async () => {
  await updateSupportMeasure('2281', 'errand-id', 'measure-id', 0, { goal: 'Revised' });
  expect(apiService.patch).toHaveBeenCalledWith(
    expect.any(String),
    { goal: 'Revised' },
    { headers: { 'If-Match': '"0"' } }
  );
});

test.each([undefined, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
  'does not write with an invalid measure version: %s',
  async (version) => {
    await expect(updateSupportMeasure('2281', 'errand-id', 'measure-id', version, { goal: 'Revised' })).rejects.toThrow(
      'measure version'
    );
    expect(apiService.patch).not.toHaveBeenCalled();
  }
);

test('sends only the decision to the dedicated route using the measure version', async () => {
  const decision = { accept: 'REWORK' as const, acceptMotivation: 'Genomför del A, del B utgår därför att…' };
  await decideSupportMeasure('2281', 'errand/id', 'measure/id', 0, decision);
  expect(apiService.patch).toHaveBeenCalledWith(
    'supporterrands/2281/errand%2Fid/measures/measure%2Fid/decision',
    decision,
    {
      headers: { 'If-Match': '"0"' },
    }
  );
});

test.each([undefined, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
  'does not decide without a valid measure version: %s',
  async (version) => {
    await expect(decideSupportMeasure('2281', 'errand-id', 'measure-id', version, { accept: 'TRUE' })).rejects.toThrow(
      'measure version'
    );
    expect(apiService.patch).not.toHaveBeenCalled();
  }
);
