// @vitest-environment jsdom
import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import type { SupportDecision } from '@supportmanagement/services/support-decision-service';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { mockEnv } from '../../../../../tests/mock-env';
import { NO_DECISION_PREFILL, useDecisionForm } from './use-decision-form';

const ROLE = 'Handläggare';
const APPLICATION_PHONE = mockEnv.mockPhoneNumber;
const PREMISES: DecisionPremises = {
  street: mockEnv.mockCompanyAddress.street,
  postalCode: mockEnv.mockCompanyAddress.postalCode,
  city: mockEnv.mockCompanyAddress.city,
  choice: { kind: 'EXISTING', restaurantNumber: '00000000' },
};

const NOTHING_DECIDED = { beverages: [], servingHours: {} };

const saved = (overrides: Partial<SupportDecision> = {}): SupportDecision =>
  ({
    id: 'decision-1',
    version: 1,
    status: 'DRAFT',
    outcome: 'APPROVAL_WITH_CONDITIONS',
    decidedByRole: 'Utskottet',
    validFrom: '2026-11-01',
    terms: [
      { text: 'Villkor B', sortOrder: 2 },
      { text: 'Villkor A', sortOrder: 1 },
    ],
    jsonParameters: [
      {
        key: 'aot_alcohol_decision',
        schemaId: '2281_aot_alcohol_decision_1.0',
        value: {
          externalCaseRegistrationNumber: 'KS 2026/123',
          premises: { phoneNumber: mockEnv.mockSecondaryPhoneNumber },
          servingArea: { description: 'Matsalen' },
          decision: { executionDate: '2026-10-20' },
        },
      },
    ],
    ...overrides,
  } as SupportDecision);

const form = (input: Partial<Parameters<typeof useDecisionForm>[0]> = {}) =>
  renderHook((props: Parameters<typeof useDecisionForm>[0]) => useDecisionForm(props), {
    initialProps: {
      decision: undefined,
      editable: true,
      savedPremises: undefined,
      premisesToSend: undefined,
      applicationPremisesPhone: APPLICATION_PHONE,
      prefill: NO_DECISION_PREFILL,
      scopeAsSaved: NOTHING_DECIDED,
      defaultRole: ROLE,
      errandCaseRegistrationNumber: '',
      ...input,
    },
  });

afterEach(cleanup);

test('a decision not yet saved starts its att-satser from the investigation, also when that arrives late', () => {
  const props = {
    decision: undefined,
    editable: true,
    savedPremises: undefined,
    premisesToSend: undefined,
    applicationPremisesPhone: APPLICATION_PHONE,
    prefill: NO_DECISION_PREFILL,
    scopeAsSaved: NOTHING_DECIDED,
    defaultRole: ROLE,
    errandCaseRegistrationNumber: '',
  };
  const { result, rerender } = form(props);
  expect(result.current.values.clauses).toBe('');

  rerender({ ...props, prefill: { ...NO_DECISION_PREFILL, clauses: 'att bevilja' } });
  expect(result.current.values.clauses).toBe('att bevilja');
  expect(result.current.unsaved).toBe(false);
});

test('a newer investigation changes only att-satser the handler has left as prefilled', () => {
  const props = {
    decision: undefined,
    editable: true,
    savedPremises: undefined,
    premisesToSend: undefined,
    applicationPremisesPhone: APPLICATION_PHONE,
    prefill: { ...NO_DECISION_PREFILL, clauses: 'att bevilja' },
    scopeAsSaved: NOTHING_DECIDED,
    defaultRole: ROLE,
    errandCaseRegistrationNumber: '',
  };
  const { result, rerender } = form(props);

  act(() => result.current.set('justification', 'Motivering'));
  rerender({ ...props, prefill: { ...NO_DECISION_PREFILL, clauses: 'att bevilja\natt servera' } });
  expect(result.current.values).toMatchObject({ clauses: 'att bevilja\natt servera', justification: 'Motivering' });

  act(() => result.current.set('clauses', 'egen'));
  rerender({ ...props, prefill: { ...NO_DECISION_PREFILL, clauses: 'att avslå' } });
  expect(result.current.values).toMatchObject({ clauses: 'egen', justification: 'Motivering' });
});

test('a decision not yet saved starts its outcome from the recommended one, and a saved one keeps its own', () => {
  const props = {
    decision: undefined,
    editable: true,
    savedPremises: undefined,
    premisesToSend: undefined,
    applicationPremisesPhone: APPLICATION_PHONE,
    prefill: NO_DECISION_PREFILL,
    scopeAsSaved: NOTHING_DECIDED,
    defaultRole: ROLE,
    errandCaseRegistrationNumber: '',
  };
  const { result, rerender } = form(props);
  expect(result.current.values.outcome).toBe('');

  rerender({ ...props, prefill: { ...NO_DECISION_PREFILL, outcome: 'WARNING' } });
  expect(result.current.values.outcome).toBe('WARNING');
  // With an outcome the decision can be created, so what the investigation filled in is there to be saved.
  expect(result.current.unsaved).toBe(true);

  act(() => result.current.set('outcome', 'REVOCATION'));
  rerender({ ...props, prefill: { ...NO_DECISION_PREFILL, outcome: 'REPRIMAND' } });
  expect(result.current.values.outcome).toBe('REVOCATION');

  expect(
    form({ decision: saved(), prefill: { ...NO_DECISION_PREFILL, outcome: 'WARNING' } }).result.current.values.outcome
  ).toBe('APPROVAL');
});

test('a saved decision says what it says, and the investigation does not fill it in again', () => {
  const withClauses = saved({
    jsonParameters: [
      {
        key: 'aot_alcohol_decision',
        schemaId: '2281_aot_alcohol_decision_1.1',
        value: { decision: { clauses: 'att bevilja' } },
      },
    ],
  });

  expect(
    form({ decision: withClauses, prefill: { ...NO_DECISION_PREFILL, clauses: 'annat' } }).result.current.values.clauses
  ).toBe('att bevilja');
  // A saved decision without att-satser is a decision the handler left without them, not one to fill in again.
  expect(
    form({ decision: saved(), prefill: { ...NO_DECISION_PREFILL, clauses: 'annat' } }).result.current.values.clauses
  ).toBe('');
});

test('a decision that is no longer a draft keeps its empty fields, whatever the investigation says', () => {
  const completed = saved({ status: 'COMPLETED' });
  const prefill = {
    ...NO_DECISION_PREFILL,
    clauses: 'annat',
    justificationDeficiencies: 'Bristerna',
    outcome: 'WARNING',
  };

  expect(form({ decision: completed, editable: false, prefill }).result.current.values).toMatchObject({
    clauses: '',
    justificationDeficiencies: '',
    outcome: 'APPROVAL',
  });
});

test('a draft shows what it has saved, so a field left empty stays empty', () => {
  const draft = saved({ outcome: undefined, jsonParameters: [] });
  const prefill = {
    ...NO_DECISION_PREFILL,
    clauses: 'att meddela erinran',
    justificationDeficiencies: 'Bristerna',
    justificationStatement: 'Yttrandet',
    justificationOutcome: 'Bedömningen',
    outcome: 'REPRIMAND',
  };

  // A blank field is left out of the saved JSON, so an empty one the investigation filled in again could never be
  // left empty: the save would write nothing and the text would come back on the next read.
  expect(form({ decision: draft, prefill }).result.current.values).toMatchObject({
    clauses: '',
    justificationDeficiencies: '',
    justificationStatement: '',
    justificationOutcome: '',
    outcome: '',
  });
});

test('what the investigation filled in is there to write, without counting as a change the handler made', () => {
  const props = {
    decision: undefined,
    editable: true,
    savedPremises: undefined,
    premisesToSend: undefined,
    applicationPremisesPhone: APPLICATION_PHONE,
    prefill: NO_DECISION_PREFILL,
    scopeAsSaved: NOTHING_DECIDED,
    defaultRole: ROLE,
    errandCaseRegistrationNumber: '',
  };
  const { result, rerender } = form(props);
  expect(result.current).toMatchObject({ unsaved: false });

  // The service cannot create a decision without an outcome, so until the investigation names one there is
  // nothing to save and nothing to warn about.
  rerender({ ...props, prefill: { ...NO_DECISION_PREFILL, clauses: 'att meddela erinran' } });
  expect(result.current).toMatchObject({ unsaved: false });

  // With an outcome there is a decision to create, and what the investigation filled in is part of it.
  rerender({
    ...props,
    prefill: { ...NO_DECISION_PREFILL, outcome: 'REPRIMAND', clauses: 'att meddela erinran' },
  });
  expect(result.current).toMatchObject({ unsaved: true });

  const concluded = form({ decision: saved({ status: 'COMPLETED' }), editable: false });
  expect(concluded.result.current).toMatchObject({ unsaved: false });
});

test('emptying a field of a draft is a change to save, and the investigation does not put it back', () => {
  const withText = saved({
    outcome: 'REPRIMAND',
    jsonParameters: [
      {
        key: 'aot_action_errand_decision',
        schemaId: '2281_aot_action_errand_decision_1.2',
        value: { decision: { justificationDeficiencies: 'Bristerna' } },
      },
    ],
  });
  const prefill = { ...NO_DECISION_PREFILL, outcome: 'REPRIMAND', justificationDeficiencies: 'Ur utredningen' };
  const { result } = form({ decision: withText, prefill });

  expect(result.current.values.justificationDeficiencies).toBe('Bristerna');
  expect(result.current.unsaved).toBe(false);

  act(() => result.current.set('justificationDeficiencies', ''));
  expect(result.current.unsaved).toBe(true);

  // Once the draft holds nothing there either the question is settled, so a save cannot be undone by the next read.
  const emptied = form({ decision: saved({ outcome: 'REPRIMAND', jsonParameters: [] }), prefill });
  expect(emptied.result.current.values.justificationDeficiencies).toBe('');
  expect(emptied.result.current.unsaved).toBe(false);
});

test('a permit decision not yet saved still starts its att-satser from the investigation', () => {
  const props = {
    decision: undefined,
    editable: true,
    savedPremises: undefined,
    premisesToSend: undefined,
    applicationPremisesPhone: APPLICATION_PHONE,
    prefill: NO_DECISION_PREFILL,
    scopeAsSaved: NOTHING_DECIDED,
    defaultRole: ROLE,
    errandCaseRegistrationNumber: '',
  };
  const { result, rerender } = form(props);

  rerender({ ...props, prefill: { ...NO_DECISION_PREFILL, clauses: 'att bevilja' } });
  expect(result.current.values.clauses).toBe('att bevilja');
  expect(result.current).toMatchObject({ unsaved: false });
});

test('a draft keeps what is written in it, and the outcome it was saved with', () => {
  const draft = saved({
    outcome: 'REVOCATION',
    jsonParameters: [
      {
        key: 'aot_action_errand_decision',
        schemaId: '2281_aot_action_errand_decision_1.2',
        value: { decision: { justificationDeficiencies: 'Egen text' } },
      },
    ],
  });
  const prefill = {
    ...NO_DECISION_PREFILL,
    justificationDeficiencies: 'Bristerna',
    justificationStatement: 'Yttrandet',
    outcome: 'REPRIMAND',
  };

  expect(form({ decision: draft, prefill }).result.current.values).toMatchObject({
    justificationDeficiencies: 'Egen text',
    justificationStatement: '',
    outcome: 'REVOCATION',
  });
});

test('a decision that exists fills the fields, and its conditions come in their order', () => {
  const { result } = form({ decision: saved() });

  expect(result.current.values).toMatchObject({
    outcome: 'APPROVAL',
    decidedByRole: 'Utskottet',
    validFrom: '2026-11-01',
    executionDate: '2026-10-20',
    servingAreaDescription: 'Matsalen',
    premisesPhoneNumber: mockEnv.mockSecondaryPhoneNumber,
    externalCaseRegistrationNumber: 'KS 2026/123',
    terms: ['Villkor A', 'Villkor B'],
  });
  expect(result.current.unsaved).toBe(false);
});

test('without a decision the telephone starts as the one the application gave', () => {
  const { result } = form();

  expect(result.current.values.premisesPhoneNumber).toBe(APPLICATION_PHONE);
  expect(result.current.values.decidedByRole).toBe(ROLE);
  expect(result.current.unsaved).toBe(false);
});

test('a field that is written counts as unsaved, and stops counting when it is written back', () => {
  const { result } = form();

  act(() => result.current.set('justification', 'Motivering'));
  expect(result.current.unsaved).toBe(true);

  act(() => result.current.set('justification', ''));
  expect(result.current.unsaved).toBe(false);
});

test('choosing premises the errand does not carry is an unsaved change of its own', () => {
  const { result } = form({ premisesToSend: PREMISES });

  expect(result.current.unsaved).toBe(true);
});

test('a concluded decision is read, so nothing counts as unsaved', () => {
  const { result } = form({ decision: saved(), editable: false });

  act(() => result.current.set('justification', 'Motivering'));
  expect(result.current.unsaved).toBe(false);
});

test('the fields follow a newer version of the decision, and keep what is written until then', () => {
  const { result, rerender } = form({ decision: saved() });

  act(() => result.current.set('justification', 'Skrivet men inte sparat'));
  rerender({
    decision: saved(),
    editable: true,
    savedPremises: undefined,
    premisesToSend: undefined,
    applicationPremisesPhone: APPLICATION_PHONE,
    prefill: NO_DECISION_PREFILL,
    scopeAsSaved: NOTHING_DECIDED,
    defaultRole: ROLE,
    errandCaseRegistrationNumber: '',
  });
  expect(result.current.values.justification).toBe('Skrivet men inte sparat');

  rerender({
    decision: saved({ version: 2, justification: 'Som beslutet sparades' }),
    editable: true,
    savedPremises: undefined,
    premisesToSend: undefined,
    applicationPremisesPhone: APPLICATION_PHONE,
    prefill: NO_DECISION_PREFILL,
    scopeAsSaved: NOTHING_DECIDED,
    defaultRole: ROLE,
    errandCaseRegistrationNumber: '',
  });
  expect(result.current.values.justification).toBe('Som beslutet sparades');
  expect(result.current.unsaved).toBe(false);
});
