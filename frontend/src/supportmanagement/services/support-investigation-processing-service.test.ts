import type { CParameter } from 'src/data-contracts/backend/data-contracts';
import { expect, test } from 'vitest';

import { supportApplicationCompleteAt } from './support-investigation-processing-service';

const INSPECTED_AT: CParameter = { key: 'PREMISES_INSPECTED_AT', values: ['2026-04-01'] };

test('the day the application was complete is read off the errand', () => {
  expect(supportApplicationCompleteAt([{ key: 'APPLICATION_COMPLETE_AT', values: ['2026-04-10'] }])).toBe('2026-04-10');
  expect(supportApplicationCompleteAt([INSPECTED_AT])).toBe('');
  expect(supportApplicationCompleteAt(undefined)).toBe('');
});
