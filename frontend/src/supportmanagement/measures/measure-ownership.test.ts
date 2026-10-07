import { expect, test } from 'vitest';

import { isOwnMeasure, mayFollowUpMeasure } from './measure-ownership';

test('a measure is own only for the same user, compared case-insensitively', () => {
  expect(isOwnMeasure({ addedByUser: 'ab12cd' }, 'ab12cd')).toBe(true);
  expect(isOwnMeasure({ addedByUser: 'AB12CD' }, 'ab12cd')).toBe(true);
  expect(isOwnMeasure({ addedByUser: 'ab12cd' }, 'xy99zz')).toBe(false);
  expect(isOwnMeasure({ addedByUser: undefined }, 'ab12cd')).toBe(false);
  expect(isOwnMeasure({ addedByUser: 'ab12cd' }, undefined)).toBe(false);
});

test("follows up by role where the BFF answers by role, and the registrar's own measure where it does not", () => {
  // The unit's manager follows up a measure a LEX investigator proposed.
  expect(mayFollowUpMeasure({ addedByUser: 'lex01inv' }, 'ab12cd', true)).toBe(true);
  // Without the role, proposing the measure is not enough.
  expect(mayFollowUpMeasure({ addedByUser: 'ab12cd' }, 'ab12cd', false)).toBe(false);
  expect(mayFollowUpMeasure({ addedByUser: 'ab12cd' }, 'ab12cd', undefined)).toBe(true);
  expect(mayFollowUpMeasure({ addedByUser: 'ab12cd' }, 'xy99zz', undefined)).toBe(false);
});
