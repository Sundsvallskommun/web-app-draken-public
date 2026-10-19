// @vitest-environment jsdom
import { emptyUser } from '@common/services/user-service';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  createSupportDecision,
  getSupportDecisions,
  SUPPORT_DECISION_ROLE_KEYS,
} from '@supportmanagement/services/support-decision-service';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { SupportErrandDecisionTab } from './support-errand-decision-tab';

// The form is under test; the basis above it and the premises lookup have tests of their own, but the
// basis renders the fields about the serving premises, so the mock hands those through.
vi.mock('./support-errand-decision-basis.component', () => ({
  SupportErrandDecisionBasis: ({ servingPremisesHandling }: { servingPremisesHandling?: ReactNode }) =>
    servingPremisesHandling ?? null,
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

const select = (name: string) => document.querySelector(`[data-cy="decision-${name}"]`) as HTMLSelectElement;
const unsavedHint = () => document.querySelector('[data-cy="decision-unsaved"]');
const saveTheTab = () => useSupportStore.getState().tabSavers['decision']();

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

test('a permit is not saved until it carries what the certificate prints', async () => {
  await renderTab();

  fireEvent.change(select('outcome'), { target: { value: APPROVAL } });
  expect(unsavedHint()).toBeTruthy();

  await expect(saveTheTab()).resolves.toBe(false);
  expect(createSupportDecision).not.toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));

  fireEvent.change(select('issued-on'), { target: { value: '2026-10-20' } });
  fireEvent.change(select('premises-phone'), { target: { value: '060-191000' } });
  fireEvent.change(select('serving-area'), { target: { value: 'Matsalen' } });

  // The day the permit starts is as strict on the certificate as the day it was issued.
  await expect(saveTheTab()).resolves.toBe(false);
  expect(createSupportDecision).not.toHaveBeenCalled();

  fireEvent.change(select('valid-from'), { target: { value: '2026-11-01' } });

  await expect(saveTheTab()).resolves.toBe(true);
  expect(createSupportDecision).toHaveBeenCalledWith(
    'errand-id',
    '2281',
    expect.objectContaining({ outcome: APPROVAL })
  );
});

test('another decision maker is an unsaved change', async () => {
  const setUnsaved = await renderTab();

  fireEvent.change(select('role'), { target: { value: UTSKOTTET } });

  expect(select('role').value).toBe(UTSKOTTET);
  expect(unsavedHint()).toBeTruthy();
  expect(setUnsaved).toHaveBeenLastCalledWith(true);
});
