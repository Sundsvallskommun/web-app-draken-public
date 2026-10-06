import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  distinctFollowUpOptions,
  EMPTY_UNIT_FOLLOW_UP_FILTERS,
  hasActiveFollowUpFilters,
  matchesFollowUpErrandFilters,
  matchesFollowUpMeasureFilters,
  type UnitFollowUpFilters,
} from './unit-follow-up-filters';
import type { FollowUpErrandRow, FollowUpMeasureRow } from './unit-follow-up-rows';

const errand: FollowUpErrandRow = {
  id: 'e1',
  errandNumber: 'VOF-2026-0011',
  unit: 'Granlunda 2',
  reportType: { value: 'abuse', label: 'Missförhållande' },
  causeAreas: [{ value: 'procedures_routines_guidelines', label: 'Processer' }],
  created: '2026-05-24',
  riskValueSolLss: 9,
  ivoNotification: { value: 'yes', label: 'Ja' },
  status: { value: 'INQUIRY', label: 'Pågående' },
  legalBases: [{ value: 'sol', label: 'SoL' }],
  categories: [],
  subcategories: [],
  measureCount: 1,
};

const measure: FollowUpMeasureRow = {
  key: 'e1:m1',
  errand,
  type: { value: 'TRAINING', label: 'Utbildning' },
  status: { value: 'executed', label: 'Genomförd' },
  effect: { value: 'no', label: 'Nej' },
};

const filters = (chosen: Partial<UnitFollowUpFilters>): UnitFollowUpFilters => ({
  ...EMPTY_UNIT_FOLLOW_UP_FILTERS,
  ...chosen,
});

test('shows every errand while nothing is chosen', () => {
  assert.equal(matchesFollowUpErrandFilters(errand, EMPTY_UNIT_FOLLOW_UP_FILTERS), true);
  assert.equal(hasActiveFollowUpFilters(EMPTY_UNIT_FOLLOW_UP_FILTERS), false);
});

test('keeps an errand that carries any of the chosen values', () => {
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ reportTypes: ['deviation', 'abuse'] })), true);
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ legalBases: ['hsl'] })), false);
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ ivoNotification: ['no'] })), false);
  // An errand with no answer is not one with the chosen answer.
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ policeReport: ['yes'] })), false);
});

test('finds the unit by any part of its name, whatever the case', () => {
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ unitQuery: ' granlunda ' })), true);
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ unitQuery: 'Nacksta' })), false);
});

test('matches a chosen risk value exactly, and only on the errand that has one', () => {
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ riskValueSolLss: '9' })), true);
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ riskValueSolLss: '12' })), false);
  assert.equal(matchesFollowUpErrandFilters(errand, filters({ riskValueHsl: '9' })), false);
  assert.equal(hasActiveFollowUpFilters(filters({ riskValueHsl: '9' })), true);
});

test('filters a measure on its errand as well as on itself', () => {
  assert.equal(
    matchesFollowUpMeasureFilters(measure, filters({ measureStatuses: ['executed'], effects: ['no'] })),
    true
  );
  assert.equal(matchesFollowUpMeasureFilters(measure, filters({ effects: ['yes'] })), false);
  assert.equal(matchesFollowUpMeasureFilters(measure, filters({ reportTypes: ['deviation'] })), false);
});

test('offers each value once, by name', () => {
  assert.deepEqual(
    distinctFollowUpOptions([
      { value: 'b', label: 'Öst' },
      undefined,
      { value: 'a', label: 'Ankarsvik' },
      { value: 'b', label: 'Öst' },
    ]),
    [
      { value: 'a', label: 'Ankarsvik' },
      { value: 'b', label: 'Öst' },
    ]
  );
});
