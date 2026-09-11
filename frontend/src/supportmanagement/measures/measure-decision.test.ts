import { expect, test } from 'vitest';

import {
  measureCanBeDecided,
  measureContentIsLocked,
  measureDecisionPresentation,
  measureIsApproved,
} from './measure-decision';

test.each([
  ['TRUE', 'Godkänd', true],
  ['FALSE', 'Avslagen', false],
  ['REWORK', 'Delvis godkänd', true],
] as const)('presents decision %s consistently and only permits approved execution', (accept, label, approved) => {
  const measure = { id: '1', accept };
  expect(measureDecisionPresentation(measure).label).toBe(label);
  expect(measureIsApproved(measure)).toBe(approved);
  expect(measureContentIsLocked(measure)).toBe(true);
  expect(measureCanBeDecided(measure)).toBe(false);
});

test('only an existing, undecided, unexecuted proposal can be assessed', () => {
  expect(measureCanBeDecided({ id: '1' })).toBe(true);
  expect(measureCanBeDecided({})).toBe(false);
  expect(measureCanBeDecided({ id: '1', executed: '2026-09-09T00:00:00Z' })).toBe(false);
  expect(measureIsApproved({})).toBe(false);
  expect(measureContentIsLocked({})).toBe(false);
});

test('unknown persisted decisions remain visible and never become writable proposals', () => {
  const measure = { id: '1', accept: 'UNKNOWN' };
  expect(measureDecisionPresentation(measure).label).toBe('UNKNOWN');
  expect(measureContentIsLocked(measure)).toBe(true);
  expect(measureIsApproved(measure)).toBe(false);
  expect(measureCanBeDecided(measure)).toBe(false);
});
