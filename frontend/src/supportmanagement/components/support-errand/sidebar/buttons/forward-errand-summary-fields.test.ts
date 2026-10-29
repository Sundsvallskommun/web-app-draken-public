import { describe, expect, test } from 'vitest';

import { getMissingFieldsNote, hasVisibleText } from './forward-errand-summary-fields';

describe('hasVisibleText', () => {
  test.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['an emptied editor', '<p><br></p>'],
    ['non-breaking spaces only', '<p>&nbsp; </p>'],
  ])('is false for %s', (_, html) => {
    expect(hasVisibleText(html)).toBe(false);
  });

  test('is true for text inside markup', () => {
    expect(hasVisibleText('<p>Trasig gatlykta</p>')).toBe(true);
  });
});

describe('getMissingFieldsNote', () => {
  test('is undefined when nothing is missing', () => {
    expect(getMissingFieldsNote([])).toBeUndefined();
  });

  test('names a single missing field', () => {
    expect(getMissingFieldsNote(['Parter'])).toBe(
      'Parter saknas i detta ärende och kommer därför inte att överlämnas.'
    );
  });

  test('lists several missing fields in one sentence, starting with a capital only', () => {
    expect(getMissingFieldsNote(['Inkom via', 'Ärendebeskrivning', 'Parter'])).toBe(
      'Inkom via, ärendebeskrivning och parter saknas i detta ärende och kommer därför inte att överlämnas.'
    );
  });
});
