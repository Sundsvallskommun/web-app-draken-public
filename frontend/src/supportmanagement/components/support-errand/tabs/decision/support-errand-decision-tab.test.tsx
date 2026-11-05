// @vitest-environment jsdom
import { emptyUser } from '@common/services/user-service';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  createSupportDecision,
  getSupportDecisions,
  saveSupportDecisionJsonParameter,
  SUPPORT_DECISION_ROLE_KEYS,
  type SupportDecision,
  updateSupportDecision,
} from '@supportmanagement/services/support-decision-service';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../../tests/mock-env';
import { SupportErrandDecisionTab } from './support-errand-decision-tab';

// The form is under test; the basis above it and the premises lookup have tests of their own, but the
// basis renders the fields the tab hands it for its sections, so the mock hands those through.
vi.mock('./support-errand-decision-basis.component', () => ({
  SupportErrandDecisionBasis: ({
    servingPremisesHandling,
    servingHoursHandling,
    servingHandling,
  }: {
    servingPremisesHandling?: ReactNode;
    servingHoursHandling?: ReactNode;
    servingHandling?: ReactNode;
  }) => (
    <>
      {servingPremisesHandling}
      {servingHoursHandling}
      {servingHandling}
    </>
  ),
}));
vi.mock('@common/components/template-preview/template-pdf-preview.component', () => ({
  TemplatePdfPreview: () => null,
}));
vi.mock('@supportmanagement/components/premises/use-decision-premises', () => ({
  useDecisionPremises: () => ({ decided: undefined }),
}));
vi.mock('@supportmanagement/services/support-decision-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@supportmanagement/services/support-decision-service')>()),
  getSupportDecisions: vi.fn(),
  createSupportDecision: vi.fn(),
  updateSupportDecision: vi.fn(),
  saveSupportDecisionJsonParameter: vi.fn(),
}));

const toast = vi.hoisted(() => vi.fn());
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => toast,
}));

// Without an i18n instance `t` hands back the key, so the roles are their keys here.
const [HANDLAGGARE, UTSKOTTET] = SUPPORT_DECISION_ROLE_KEYS;
const APPROVAL = 'APPROVAL';

const errand = {
  id: 'errand-id',
  errandNumber: mockEnv.mockErrandNumber,
  process: { processKey: 'alcohol-serving', currentActivityId: 'decision_phase' },
} as unknown as SupportErrand;

const SCHEMA_NAME = 'aot_alcohol_serving_permit_application_permanent_serving';
const PERMANENT_LABELS = [
  { classification: 'CATEGORY', resourceName: 'ALCOHOL' },
  { classification: 'TYPE', resourceName: 'SERVING_PERMIT_APPLICATION', displayName: 'Serveringstillstånd' },
  { classification: 'SUBTYPE', resourceName: 'PERMANENT_SERVING' },
];

/** A permanent serving application for the public only, as the citizen filed it. */
const permanentErrand = (): SupportErrand =>
  ({
    ...errand,
    labels: PERMANENT_LABELS,
    jsonParameters: [
      {
        key: SCHEMA_NAME,
        schemaId: `${SCHEMA_NAME}-id`,
        value: {
          servingAudience: 'PUBLIC',
          publicServingHoursIndoor: { from: '11:00:00', to: '01:00:00' },
          beverages: ['STRONG_BEER', 'WINE'],
        },
      },
    ],
  } as unknown as SupportErrand);

const input = (name: string) => document.querySelector(`[data-cy="decision-${name}"]`) as HTMLInputElement;
const sentJson = () => vi.mocked(saveSupportDecisionJsonParameter).mock.calls[0][4];

const select = (name: string) => document.querySelector(`[data-cy="decision-${name}"]`) as HTMLSelectElement;
const unsavedHint = () => document.querySelector('[data-cy="decision-unsaved"]');
const awaitsOutcomeHint = () => document.querySelector('[data-cy="decision-awaits-outcome"]');
const saveTheTab = () => useSupportStore.getState().tabSavers['decision']();

/** What a printed permit is not saved without (see the test on it below). */
const fillWhatTheCertificatePrints = () => {
  fireEvent.change(select('outcome'), { target: { value: APPROVAL } });
  fireEvent.change(select('issued-on'), { target: { value: '2026-10-20' } });
  fireEvent.change(select('premises-phone'), { target: { value: mockEnv.mockPhoneNumber } });
  fireEvent.change(select('serving-area'), { target: { value: 'Matsalen' } });
  fireEvent.change(select('valid-from'), { target: { value: '2026-11-01' } });
};

const renderTab = async () => {
  const setUnsaved = vi.fn();
  render(<SupportErrandDecisionTab setUnsaved={setUnsaved} setHasContent={vi.fn()} writable />);
  await waitFor(() => expect(select('role')).toBeTruthy());
  return setUnsaved;
};

beforeEach(() => {
  toast.mockReset();
  vi.mocked(getSupportDecisions).mockReset().mockResolvedValue([]);
  vi.mocked(createSupportDecision)
    .mockReset()
    .mockResolvedValue({ id: 'decision-1', status: 'DRAFT' } as never);
  vi.mocked(saveSupportDecisionJsonParameter)
    .mockReset()
    .mockResolvedValue({ id: 'decision-1', status: 'DRAFT' } as never);
  useConfigStore.setState({ municipalityId: '2281' });
  useMetadataStore.setState({
    supportMetadata: {
      namespace: 'AOT',
      decisionOutcomes: [{ name: APPROVAL, displayName: 'Bifall' }],
    } as SupportMetadata,
  });
  useSupportStore.setState({ supportErrand: errand, activeTabKey: 'decision', tabSavers: {} });
  useUserStore.setState({
    user: { ...emptyUser, permissions: { ...emptyUser.permissions, canEditSupportManagement: true } },
  });
});

afterEach(cleanup);

test('the decision maker starts as handläggare, and the tab is saved from the sidebar', async () => {
  const setUnsaved = await renderTab();

  expect(select('role').value).toBe(HANDLAGGARE);
  expect(unsavedHint()).toBeNull();
  expect(setUnsaved).toHaveBeenLastCalledWith(false);

  // Nothing is edited, so saving the errand has nothing to do here.
  await expect(saveTheTab()).resolves.toBe(true);
  expect(createSupportDecision).not.toHaveBeenCalled();
});

test('a draft without an outcome is kept in the form, since the service cannot create one', async () => {
  await renderTab();

  fireEvent.change(select('role'), { target: { value: UTSKOTTET } });
  expect(unsavedHint()).toBeTruthy();
  expect(awaitsOutcomeHint()).toBeTruthy();

  await expect(saveTheTab()).resolves.toBe(true);
  expect(createSupportDecision).not.toHaveBeenCalled();
});

test('a draft is saved as soon as an outcome is chosen, however incomplete it is otherwise', async () => {
  await renderTab();

  fireEvent.change(select('role'), { target: { value: UTSKOTTET } });
  fireEvent.change(select('outcome'), { target: { value: APPROVAL } });
  expect(awaitsOutcomeHint()).toBeNull();

  await expect(saveTheTab()).resolves.toBe(true);
  const sent = vi.mocked(createSupportDecision).mock.calls[0][2];
  expect(sent).toMatchObject({ decidedByRole: UTSKOTTET, outcome: APPROVAL });
});

test('another decision maker is an unsaved change', async () => {
  const setUnsaved = await renderTab();

  fireEvent.change(select('role'), { target: { value: UTSKOTTET } });

  expect(select('role').value).toBe(UTSKOTTET);
  expect(unsavedHint()).toBeTruthy();
  expect(setUnsaved).toHaveBeenLastCalledWith(true);
});

test('the decided beverages and hours start from the application, and an edit is an unsaved change', async () => {
  useSupportStore.setState({ supportErrand: permanentErrand(), activeTabKey: 'decision' });
  const setUnsaved = await renderTab();

  expect(input('beverages-STRONG_BEER').checked).toBe(true);
  expect(input('beverages-SPIRITS').checked).toBe(false);
  expect(input('serving-hours-indoorPublic-from').value).toBe('11:00');
  expect(input('serving-hours-indoorPublic-to').value).toBe('01:00');
  expect(input('serving-hours-outdoorPublic-from').value).toBe('');
  // The public only was applied for.
  expect(input('serving-hours-indoorPrivate-from')).toBeNull();
  expect(setUnsaved).toHaveBeenLastCalledWith(false);

  fireEvent.click(input('beverages-STRONG_BEER'));

  expect(input('beverages-STRONG_BEER').checked).toBe(false);
  expect(unsavedHint()).toBeTruthy();
  expect(setUnsaved).toHaveBeenLastCalledWith(true);
});

test('a half-filled serving time is not saved', async () => {
  useSupportStore.setState({ supportErrand: permanentErrand(), activeTabKey: 'decision' });
  await renderTab();
  fillWhatTheCertificatePrints();

  fireEvent.change(input('serving-hours-outdoorPublic-from'), { target: { value: '12:00' } });

  expect(document.querySelector('[data-cy="decision-serving-hours"]')?.textContent).toContain(
    'common:decision.scope.serving_hours.half_filled'
  );
  await expect(saveTheTab()).resolves.toBe(false);
  expect(createSupportDecision).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(
    expect.objectContaining({ status: 'error', message: 'common:decision.scope.serving_hours.half_filled' })
  );

  fireEvent.change(input('serving-hours-outdoorPublic-to'), { target: { value: '22:00' } });

  await expect(saveTheTab()).resolves.toBe(true);
});

test('saving writes the decision, then what it says of the permit as its JSON', async () => {
  useSupportStore.setState({ supportErrand: permanentErrand(), activeTabKey: 'decision' });
  await renderTab();
  fillWhatTheCertificatePrints();
  fireEvent.click(input('beverages-WINE'));
  fireEvent.change(input('serving-hours-indoorPublic-to'), { target: { value: '00:00' } });

  await expect(saveTheTab()).resolves.toBe(true);

  expect(vi.mocked(createSupportDecision).mock.calls[0][2]).not.toHaveProperty('parameters');
  expect(saveSupportDecisionJsonParameter).toHaveBeenCalledWith('errand-id', '2281', 'decision-1', 'permit', {
    schemaId: '2281_aot_alcohol_decision_1.0',
    value: expect.objectContaining({
      servingPermitType: 'PERMANENT_SERVING',
      beverages: ['STRONG_BEER'],
      servingHours: [{ audience: 'PUBLIC', location: 'INDOOR', from: '11:00', to: '00:00' }],
      servingArea: { description: 'Matsalen' },
    }),
  });
  expect(sentJson().value).toMatchObject({ decision: { executionDate: '2026-10-20', validFrom: '2026-11-01' } });
});

test('saving again after a failed JSON write updates the new decision, and keeps what was written', async () => {
  vi.mocked(updateSupportDecision)
    .mockReset()
    .mockResolvedValue({ id: 'decision-1', status: 'DRAFT' } as never);
  vi.mocked(saveSupportDecisionJsonParameter).mockRejectedValueOnce(new Error('json write failed'));
  useSupportStore.setState({ supportErrand: permanentErrand(), activeTabKey: 'decision' });
  await renderTab();
  fillWhatTheCertificatePrints();

  await expect(saveTheTab()).resolves.toBe(false);
  expect(select('serving-area').value).toBe('Matsalen');

  await expect(saveTheTab()).resolves.toBe(true);
  expect(createSupportDecision).toHaveBeenCalledTimes(1);
  expect(updateSupportDecision).toHaveBeenCalledWith(
    'errand-id',
    '2281',
    'decision-1',
    expect.objectContaining({ outcome: APPROVAL })
  );
});

test('a saved decision fills the fields instead of the application, an empty value included', async () => {
  useSupportStore.setState({ supportErrand: permanentErrand(), activeTabKey: 'decision' });
  vi.mocked(getSupportDecisions).mockResolvedValue([
    {
      id: 'decision-id',
      status: 'DRAFT',
      outcome: APPROVAL,
      version: 1,
      jsonParameters: [
        {
          key: 'permit',
          schemaId: '2281_aot_alcohol_decision_1.0',
          value: {
            beverages: [],
            servingHours: [{ audience: 'PUBLIC', location: 'INDOOR', from: '10:00', to: '23:00' }],
          },
        },
      ],
    } as SupportDecision,
  ]);
  const setUnsaved = await renderTab();

  await waitFor(() => expect(input('serving-hours-indoorPublic-from').value).toBe('10:00'));
  expect(input('beverages-STRONG_BEER').checked).toBe(false);
  expect(input('beverages-WINE').checked).toBe(false);
  expect(input('serving-hours-indoorPublic-to').value).toBe('23:00');
  // The decision has hours, and none for this slot.
  expect(input('serving-hours-outdoorPublic-from').value).toBe('');
  expect(setUnsaved).toHaveBeenLastCalledWith(false);
});

test('a permit without beverages or hours to decide shows no such fields', async () => {
  useSupportStore.setState({
    supportErrand: { ...errand, process: { processKey: 'tobacco-sales' } } as unknown as SupportErrand,
    activeTabKey: 'decision',
  });
  await renderTab();

  expect(document.querySelector('[data-cy="decision-beverages"]')).toBeNull();
  expect(document.querySelector('[data-cy="decision-serving-hours"]')).toBeNull();
});
