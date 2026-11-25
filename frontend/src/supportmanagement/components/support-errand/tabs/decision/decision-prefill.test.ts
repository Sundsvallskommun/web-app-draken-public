import type { DecisionOutcome } from '@common/data-contracts/supportmanagement/data-contracts';
import { ACTION_ERRAND_PERMIT_TYPE } from '@supportmanagement/services/support-decision-service';
import type { SupportInvestigation } from '@supportmanagement/services/support-investigation-service';
import { expect, test } from 'vitest';

import { decisionPrefillOf } from './decision-prefill';

const OUTCOMES: DecisionOutcome[] = [
  { name: 'REPRIMAND', displayName: 'Erinran' },
  { name: 'WARNING', displayName: 'Varning' },
  { name: 'WARNING_WITH_CONDITIONS', displayName: 'Varning med villkor' },
  { name: 'REVOCATION', displayName: 'Återkallelse' },
];

const investigationOf = (overrides: Partial<SupportInvestigation>): SupportInvestigation =>
  ({ id: 'investigation-1', sections: [], ...overrides } as SupportInvestigation);

test('the decision starts from the outcome the investigation recommends', () => {
  expect(
    decisionPrefillOf(investigationOf({ recommendation: 'WARNING' }), undefined, OUTCOMES, ACTION_ERRAND_PERMIT_TYPE)
      .outcome
  ).toBe('WARNING');
});

test('a recommendation carrying conditions prefills the plain outcome, since the terms decide the conditions', () => {
  expect(
    decisionPrefillOf(
      investigationOf({ recommendation: 'WARNING_WITH_CONDITIONS' }),
      undefined,
      OUTCOMES,
      ACTION_ERRAND_PERMIT_TYPE
    ).outcome
  ).toBe('WARNING');
});

test('an outcome the decision does not offer leaves the choice to the handler', () => {
  expect(
    decisionPrefillOf(investigationOf({ recommendation: 'NO_ACTION' }), undefined, OUTCOMES, ACTION_ERRAND_PERMIT_TYPE)
      .outcome
  ).toBe('');
  expect(decisionPrefillOf(investigationOf({}), undefined, OUTCOMES, ACTION_ERRAND_PERMIT_TYPE).outcome).toBe('');
  expect(decisionPrefillOf(undefined, undefined, OUTCOMES, ACTION_ERRAND_PERMIT_TYPE).outcome).toBe('');
  expect(
    decisionPrefillOf(investigationOf({ recommendation: 'WARNING' }), undefined, [], ACTION_ERRAND_PERMIT_TYPE).outcome
  ).toBe('');
});

test('a permit decision picks its own outcome, and keeps the att-satser it always had', () => {
  const investigation = investigationOf({ recommendation: 'WARNING', summary: '<p>att bevilja</p>' });
  const permitOutcomes: DecisionOutcome[] = [{ name: 'WARNING', displayName: 'Varning' }];

  expect(decisionPrefillOf(investigation, undefined, permitOutcomes, 'PERMANENT_SERVING')).toMatchObject({
    outcome: '',
    clauses: 'att bevilja',
  });
  expect(decisionPrefillOf(investigation, undefined, permitOutcomes, 'TOBACCO_SALES').outcome).toBe('');
});

test('the paragraphs of the decision start from the examinations they rest on', () => {
  const investigation = investigationOf({
    summary: '<p>att meddela varning</p>',
    sections: [
      { sectionKey: 'established_faults', text: '<p>Bristerna</p>' },
      { sectionKey: 'permit_holder_statement', text: '<p>Yttrandet</p>' },
      { sectionKey: 'assessment', text: '<p>Bedömningen</p>' },
    ],
  });

  expect(decisionPrefillOf(investigation, undefined, OUTCOMES, ACTION_ERRAND_PERMIT_TYPE)).toMatchObject({
    clauses: 'att meddela varning',
    justificationDeficiencies: 'Bristerna',
    justificationStatement: 'Yttrandet',
    justificationOutcome: 'Bedömningen',
  });
});

test('the permit of the inspection follows where its relation names one', () => {
  const origin = {
    inspectionDate: '2026-11-18',
    inspectionCaseNumber: 'AOT-26117701',
    permitType: 'Stadigvarande servering',
    permitCaseNumber: 'AOT-26110158',
  };

  expect(decisionPrefillOf(investigationOf({}), origin, OUTCOMES, ACTION_ERRAND_PERMIT_TYPE)).toMatchObject({
    permitType: 'Stadigvarande servering',
    permitCaseNumber: 'AOT-26110158',
  });
});
