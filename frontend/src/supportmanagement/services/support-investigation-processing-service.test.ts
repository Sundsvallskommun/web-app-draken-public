import type { CParameter } from 'src/data-contracts/backend/data-contracts';
import { expect, test } from 'vitest';

import {
  supportApplicationCompleteAt,
  withSupportApplicationCompleteAt,
} from './support-investigation-processing-service';

const INSPECTED_AT: CParameter = { key: 'PREMISES_INSPECTED_AT', values: ['2026-04-01'] };

test('the day the application was complete is read off the errand', () => {
  expect(supportApplicationCompleteAt([{ key: 'APPLICATION_COMPLETE_AT', values: ['2026-04-10'] }])).toBe('2026-04-10');
  expect(supportApplicationCompleteAt([INSPECTED_AT])).toBe('');
  expect(supportApplicationCompleteAt(undefined)).toBe('');
});

test('the day is written onto the errand and the other parameters are left alone', () => {
  expect(withSupportApplicationCompleteAt([INSPECTED_AT], '2026-04-10')).toEqual([
    INSPECTED_AT,
    { key: 'APPLICATION_COMPLETE_AT', displayName: 'Ansökan komplett', values: ['2026-04-10'] },
  ]);
});

test('a day that is cleared is removed instead of saved as a blank', () => {
  expect(
    withSupportApplicationCompleteAt([INSPECTED_AT, { key: 'APPLICATION_COMPLETE_AT', values: ['2026-04-10'] }], '')
  ).toEqual([INSPECTED_AT]);
});
