// @vitest-environment jsdom
import { emptyUser } from '@common/services/user-service';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { getSupportDecisions, SUPPORT_DECISION_ROLE_KEYS } from '@supportmanagement/services/support-decision-service';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { SupportErrandDecisionTab } from './support-errand-decision-tab';

// The form is under test; the basis above it and the premises lookup have tests of their own.
vi.mock('./support-errand-decision-basis.component', () => ({ SupportErrandDecisionBasis: () => null }));
vi.mock('@supportmanagement/components/premises/use-decision-premises', () => ({
  useDecisionPremises: () => ({ parameters: undefined }),
}));
vi.mock('@supportmanagement/services/support-decision-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@supportmanagement/services/support-decision-service')>()),
  getSupportDecisions: vi.fn(),
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
const saveButton = () => document.querySelector('[data-cy="decision-save"]') as HTMLButtonElement;
const unsavedAlert = () => document.querySelector('[data-cy="decision-save-unsaved"]');

const renderTab = async () => {
  const setUnsaved = vi.fn();
  render(<SupportErrandDecisionTab setUnsaved={setUnsaved} setHasContent={vi.fn()} writable />);
  await waitFor(() => expect(select('role')).toBeTruthy());
  return setUnsaved;
};

beforeEach(() => {
  vi.mocked(getSupportDecisions).mockReset().mockResolvedValue([]);
  useConfigStore.setState({ municipalityId: '2281' });
  useMetadataStore.setState({
    supportMetadata: {
      namespace: 'AOT',
      decisionOutcomes: [{ name: APPROVAL, displayName: 'Bifall' }],
    } as SupportMetadata,
  });
  useSupportStore.setState({ supportErrand: errand, activeTabKey: 'decision' });
  useUserStore.setState({
    user: { ...emptyUser, permissions: { ...emptyUser.permissions, canEditSupportManagement: true } },
  });
});

afterEach(cleanup);

test('the decision maker starts as handläggare, so an outcome is all a decision needs to be saved', async () => {
  const setUnsaved = await renderTab();

  expect(select('role').value).toBe(HANDLAGGARE);
  expect(unsavedAlert()).toBeNull();
  expect(setUnsaved).toHaveBeenLastCalledWith(false);
  expect(saveButton().disabled).toBe(true);

  fireEvent.change(select('outcome'), { target: { value: APPROVAL } });

  expect(saveButton().disabled).toBe(false);
});

test('another decision maker is an unsaved change', async () => {
  const setUnsaved = await renderTab();

  fireEvent.change(select('role'), { target: { value: UTSKOTTET } });

  expect(select('role').value).toBe(UTSKOTTET);
  expect(unsavedAlert()).toBeTruthy();
  expect(setUnsaved).toHaveBeenLastCalledWith(true);
});
