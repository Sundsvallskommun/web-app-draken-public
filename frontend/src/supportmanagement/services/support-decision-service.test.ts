import type { DecisionOutcome, Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { expect, test } from 'vitest';

import {
  outcomeForTerms,
  selectableSupportDecisionOutcomes,
  supportDecisionOutcomesOf,
  supportDecisionPermitType,
} from './support-decision-service';

/** The nine outcomes registered for AOT, in the order the metadata has them. */
const REGISTERED: DecisionOutcome[] = [
  { name: 'APPROVAL', displayName: 'Bifall' },
  { name: 'APPROVAL_WITH_CONDITIONS', displayName: 'Bifall med villkor' },
  { name: 'REJECTED', displayName: 'Avslag' },
  { name: 'INADMISSIBLE', displayName: 'Ärendet avvisas' },
  { name: 'DISMISSED', displayName: 'Ärendet avskrivs' },
  { name: 'REPRIMAND', displayName: 'Erinran' },
  { name: 'WARNING', displayName: 'Varning' },
  { name: 'REVOCATION', displayName: 'Återkallelse' },
  { name: 'NO_ACTION', displayName: 'Ingen åtgärd' },
];

const namesOf = (outcomes: DecisionOutcome[]): (string | undefined)[] => outcomes.map((outcome) => outcome.name);

test('an action errand is decided by the outcomes its own process knows, and by no application outcome', () => {
  const offered = supportDecisionOutcomesOf(REGISTERED, 'ATGARD');

  expect(namesOf(offered)).toEqual(['REPRIMAND', 'WARNING', 'REVOCATION', 'NO_ACTION']);
  expect(namesOf(selectableSupportDecisionOutcomes(offered))).toHaveLength(4);
});

test('an application is decided by the five it always was, conditions included', () => {
  expect(namesOf(supportDecisionOutcomesOf(REGISTERED, 'SERVERINGSTILLSTAND'))).toEqual([
    'APPROVAL',
    'APPROVAL_WITH_CONDITIONS',
    'REJECTED',
    'INADMISSIBLE',
    'DISMISSED',
  ]);
  expect(namesOf(supportDecisionOutcomesOf(REGISTERED, 'TOBAKSFORSALJNING'))).toHaveLength(5);
  expect(namesOf(supportDecisionOutcomesOf(REGISTERED, 'TILLSYN'))).toHaveLength(5);
});

test('the conditions variant is still found for an application, so att-satser carry the outcome', () => {
  const offered = supportDecisionOutcomesOf(REGISTERED, 'SERVERINGSTILLSTAND');

  expect(outcomeForTerms('APPROVAL', ['Ett villkor'], offered)).toBe('APPROVAL_WITH_CONDITIONS');
  expect(namesOf(selectableSupportDecisionOutcomes(offered))).not.toContain('APPROVAL_WITH_CONDITIONS');
});

test('a sanction has no conditions variant, so it stands as it is', () => {
  const offered = supportDecisionOutcomesOf(REGISTERED, 'ATGARD');

  expect(outcomeForTerms('WARNING', ['Ett villkor'], offered)).toBe('WARNING');
});

test('an outcome the metadata has not registered yet is not offered', () => {
  const withoutNoAction = REGISTERED.filter((outcome) => outcome.name !== 'NO_ACTION');

  expect(namesOf(supportDecisionOutcomesOf(withoutNoAction, 'ATGARD'))).toEqual(['REPRIMAND', 'WARNING', 'REVOCATION']);
  expect(supportDecisionOutcomesOf([], 'ATGARD')).toEqual([]);
});

test('the action errand process decides sanctions, whether or not the label carries the attribute yet', () => {
  expect(supportDecisionPermitType(undefined, 'action-errand')).toBe('ATGARD');
  expect(supportDecisionPermitType({ attributes: [{ key: 'permitType', value: 'ATGARD' }] } as Label, undefined)).toBe(
    'ATGARD'
  );
  expect(supportDecisionPermitType(undefined, 'internal-inspection')).toBe('TILLSYN');
  expect(supportDecisionPermitType(undefined, 'alcohol-serving')).toBe('SERVERINGSTILLSTAND');
});
