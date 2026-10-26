// @vitest-environment jsdom
import type { Decision } from '@common/data-contracts/supportmanagement/data-contracts';
import type { DecisionPremises } from '@supportmanagement/services/support-decision-premises-service';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';

import { useDecisionForm } from './use-decision-form';

const ROLE = 'Handläggare';
const APPLICATION_PHONE = '060-191000';
const PREMISES: DecisionPremises = {
  street: 'Storgatan 3',
  postalCode: '852 30',
  city: 'Sundsvall',
  choice: { kind: 'EXISTING', restaurantNumber: '22814540' },
};

const saved = (overrides: Partial<Decision> = {}): Decision =>
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
    parameters: [
      { key: 'executionDate', values: ['2026-10-20'] },
      { key: 'servingAreaDescription', values: ['Matsalen'] },
      { key: 'premisesPhone', values: ['060-200200'] },
    ],
    ...overrides,
  } as Decision);

const form = (input: Partial<Parameters<typeof useDecisionForm>[0]> = {}) =>
  renderHook((props: Parameters<typeof useDecisionForm>[0]) => useDecisionForm(props), {
    initialProps: {
      decision: undefined,
      editable: true,
      savedPremises: undefined,
      premisesToSend: undefined,
      applicationPremisesPhone: APPLICATION_PHONE,
      defaultRole: ROLE,
      ...input,
    },
  });

afterEach(cleanup);

test('a decision that exists fills the fields, and its conditions come in their order', () => {
  const { result } = form({ decision: saved() });

  expect(result.current.values).toMatchObject({
    outcome: 'APPROVAL',
    decidedByRole: 'Utskottet',
    validFrom: '2026-11-01',
    issuedOn: '2026-10-20',
    servingArea: 'Matsalen',
    premisesPhone: '060-200200',
    terms: ['Villkor A', 'Villkor B'],
  });
  expect(result.current.edited).toBe(false);
});

test('without a decision the telephone starts as the one the application gave', () => {
  const { result } = form();

  expect(result.current.values.premisesPhone).toBe(APPLICATION_PHONE);
  expect(result.current.values.decidedByRole).toBe(ROLE);
  expect(result.current.edited).toBe(false);
});

test('a field that is written counts as edited, and counts again as saved when it is written back', () => {
  const { result } = form();

  act(() => result.current.set('justification', 'Motivering'));
  expect(result.current.edited).toBe(true);

  act(() => result.current.set('justification', ''));
  expect(result.current.edited).toBe(false);
});

test('choosing premises the errand does not carry is an unsaved change of its own', () => {
  const { result } = form({ premisesToSend: PREMISES });

  expect(result.current.edited).toBe(true);
});

test('a concluded decision is read, so nothing counts as edited', () => {
  const { result } = form({ decision: saved(), editable: false });

  act(() => result.current.set('justification', 'Motivering'));
  expect(result.current.edited).toBe(false);
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
    defaultRole: ROLE,
  });
  expect(result.current.values.justification).toBe('Skrivet men inte sparat');

  rerender({
    decision: saved({ version: 2, justification: 'Som beslutet sparades' }),
    editable: true,
    savedPremises: undefined,
    premisesToSend: undefined,
    applicationPremisesPhone: APPLICATION_PHONE,
    defaultRole: ROLE,
  });
  expect(result.current.values.justification).toBe('Som beslutet sparades');
  expect(result.current.edited).toBe(false);
});
