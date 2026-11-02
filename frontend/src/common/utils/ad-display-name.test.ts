import { describe, expect, test } from 'vitest';

import { compareByDisplayName, displayNameMatchesQuery, splitAdDisplayName } from './ad-display-name';

describe('splitAdDisplayName', () => {
  test('takes the first word as last name and the second as first name', () => {
    expect(splitAdDisplayName('Svensson Anna')).toEqual({ firstName: 'Anna', lastName: 'Svensson' });
  });

  test('keeps every word after the last name as first name', () => {
    expect(splitAdDisplayName('Svensson Karin E')).toEqual({ firstName: 'Karin E', lastName: 'Svensson' });
  });

  test('ignores repeated and surrounding whitespace', () => {
    expect(splitAdDisplayName('  Svensson   Anna ')).toEqual({ firstName: 'Anna', lastName: 'Svensson' });
  });

  test('returns an empty first name for a single word', () => {
    expect(splitAdDisplayName('Svensson')).toEqual({ firstName: '', lastName: 'Svensson' });
  });

  test('returns empty names for an empty display name', () => {
    expect(splitAdDisplayName('')).toEqual({ firstName: '', lastName: '' });
  });
});

describe('compareByDisplayName', () => {
  test('sorts in Swedish alphabetical order with å, ä and ö after z', () => {
    const names = ['Öberg Per', 'Åberg Lisa', 'Zetterlund Ola', 'Ärlig Eva'].map((displayName) => ({ displayName }));

    expect(names.sort(compareByDisplayName).map((name) => name.displayName)).toEqual([
      'Zetterlund Ola',
      'Åberg Lisa',
      'Ärlig Eva',
      'Öberg Per',
    ]);
  });

  test('orders people with the same last name by first name', () => {
    const names = ['Kcsson My', 'Kcsson Bertil'].map((displayName) => ({ displayName }));

    expect(names.sort(compareByDisplayName).map((name) => name.displayName)).toEqual(['Kcsson Bertil', 'Kcsson My']);
  });
});

describe('displayNameMatchesQuery', () => {
  test('matches any part of the display name regardless of case', () => {
    expect(displayNameMatchesQuery({ displayName: 'Svensson Anna Maria' }, 'maria')).toBe(true);
  });

  test('matches across the last and first name', () => {
    expect(displayNameMatchesQuery({ displayName: 'Svensson Anna' }, 'svensson an')).toBe(true);
  });

  test('does not match a name that is not in the display name', () => {
    expect(displayNameMatchesQuery({ displayName: 'Svensson Anna' }, 'Lisa')).toBe(false);
  });
});
