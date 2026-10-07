// @vitest-environment jsdom
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { completeSupportDecision, getSupportDecisions } from '@supportmanagement/services/support-decision-service';
import { getSupportErrandById, SupportErrand } from '@supportmanagement/services/support-errand-service';
import {
  getSupportErrandProcessState,
  sendSupportProcessSignal,
} from '@supportmanagement/services/support-process-service';
import { cleanup, render, waitFor } from '@testing-library/react';
import { FC, PropsWithChildren } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportProcessStepButton } from './support-process-step-button.component';

vi.mock('@config/appconfig', () => ({ appConfig: { features: { useProcess: true } } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const toast = vi.hoisted(() => vi.fn());

vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => toast,
  useConfirm: () => ({ showConfirmation: vi.fn().mockResolvedValue(true) }),
}));
vi.mock('@supportmanagement/services/support-decision-service', () => ({
  getSupportDecisions: vi.fn(),
  completeSupportDecision: vi.fn(),
  isSupportDecisionDraft: (decision: { decisionType?: string }) => decision.decisionType === 'PROPOSED',
}));
vi.mock('@supportmanagement/services/support-errand-service', () => ({
  getSupportErrandById: vi.fn(),
  closeSupportErrand: vi.fn(),
  setSupportErrandAdmin: vi.fn(),
  setSupportErrandStatus: vi.fn(),
  Status: { ONGOING: 'ONGOING', SUSPENDED: 'SUSPENDED', SOLVED: 'SOLVED', REOPENED: 'REOPENED' },
  Resolution: { CLOSED: 'CLOSED' },
}));
vi.mock('@supportmanagement/services/support-process-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportErrandProcessState: vi.fn(),
  sendSupportProcessSignal: vi.fn(),
}));

const ERRAND_ID = 'errand-1';

const errandAt = (currentActivityId: string, awaitingSignals: string[]): SupportErrand =>
  ({
    id: ERRAND_ID,
    status: 'ONGOING',
    modified: '2026-10-02T10:00:00Z',
    process: {
      processInstanceId: 'process-1',
      processStatus: 'WAITING',
      currentActivityId,
      awaitingSignals: awaitingSignals.map((name) => ({ name })),
    },
  } as unknown as SupportErrand);

const Wrapper: FC<PropsWithChildren> = ({ children }) => {
  const methods = useForm({ defaultValues: {} });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

const renderButton = () =>
  render(
    <Wrapper>
      <SupportProcessStepButton />
    </Wrapper>
  );

const theButton = (key = 'start_follow_up') =>
  waitFor(() => {
    const found = document.querySelector(`[data-cy="process-action-${key}"]`);
    if (!found) throw new Error('the button is not there');
    return found as HTMLButtonElement;
  });

beforeEach(() => {
  useConfigStore.setState({ municipalityId: '2281' });
  useUserStore.setState({
    user: { username: 'handlaggaren', permissions: { canEditSupportManagement: true } },
    administrators: [{ adAccount: 'handlaggaren' }],
  } as never);
  useSupportStore.setState({
    supportErrand: errandAt('decision_phase', ['process_cancelled']),
    processSignal: undefined,
  });

  toast.mockReset();
  vi.mocked(getSupportDecisions)
    .mockReset()
    .mockResolvedValue([{ id: 'decision-1', decisionType: 'PROPOSED', outcome: 'APPROVAL' }] as never);
  vi.mocked(completeSupportDecision)
    .mockReset()
    .mockResolvedValue(true as never);
  vi.mocked(sendSupportProcessSignal).mockReset().mockResolvedValue(undefined);
  vi.mocked(getSupportErrandProcessState).mockReset();
  vi.mocked(getSupportErrandById)
    .mockReset()
    .mockResolvedValue({ errand: errandAt('decision_phase', ['process_cancelled']) } as never);
});

afterEach(() => {
  cleanup();
  useSupportStore.setState({ processSignal: undefined });
});

test('the gate is taken from the process as it stands, not from the errand the decision tab left behind', async () => {
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'decision_phase',
      awaitingSignals: [{ name: 'decision_completed' }, { name: 'process_cancelled' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();

  const button = await theButton();
  button.click();

  await waitFor(() => expect(completeSupportDecision).toHaveBeenCalled());
  await waitFor(() => expect(sendSupportProcessSignal).toHaveBeenCalledWith(ERRAND_ID, '2281', 'decision_completed'));
});

test('a phase whose gate the process no longer offers says so instead of saying it is done', async () => {
  useSupportStore.setState({
    supportErrand: errandAt('investigation_phase', ['investigation_completed', 'process_cancelled']),
  });
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'investigation_phase',
      awaitingSignals: [{ name: 'process_cancelled' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();

  const button = await theButton('ready_for_decision');
  button.click();

  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'common:process.actions.not_ready', status: 'error' })
    )
  );
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalledWith(
    expect.objectContaining({ message: 'common:process.actions.ready_for_decision.done' })
  );
});

test('concluding the decision is the step, so the decision phase offering no gate is not a failure', async () => {
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'decision_phase',
      awaitingSignals: [{ name: 'process_cancelled' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();

  const button = await theButton();
  button.click();

  await waitFor(() => expect(completeSupportDecision).toHaveBeenCalled());
  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'common:process.actions.start_follow_up.done', status: 'success' })
    )
  );
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ message: 'common:process.actions.not_ready' }));
});

test('no button is offered while the process is working on the decision itself', async () => {
  useSupportStore.setState({ supportErrand: errandAt('external_task_create_decision', ['process_cancelled']) });

  renderButton();

  await waitFor(() => expect(document.querySelector('[data-cy^="process-action-"]')).toBeNull());
});

test('the button is locked while a signal it sent is waiting to be answered', async () => {
  useSupportStore.setState({ processSignal: { errandId: ERRAND_ID, at: Date.now() } });

  renderButton();

  const button = await theButton();
  expect(button.disabled).toBe(true);
});

test('a signal sent for another errand leaves this button alone', async () => {
  useSupportStore.setState({ processSignal: { errandId: 'another-errand', at: Date.now() } });

  renderButton();

  const button = await theButton();
  expect(button.disabled).toBe(false);
});

test('concluding the decision starts the watching, since the model has no signal to send', async () => {
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'decision_phase',
      awaitingSignals: [{ name: 'process_cancelled' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();

  const button = await theButton();
  button.click();

  await waitFor(() => expect(completeSupportDecision).toHaveBeenCalled());
  await waitFor(() => expect(useSupportStore.getState().processSignal?.errandId).toBe(ERRAND_ID));
});
