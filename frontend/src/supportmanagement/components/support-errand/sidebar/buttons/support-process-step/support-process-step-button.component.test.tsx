// @vitest-environment jsdom
import { getLatestRjsfSchema } from '@common/components/json/utils/schema-utils';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { completeSupportDecision, getSupportDecisions } from '@supportmanagement/services/support-decision-service';
import {
  getSupportErrandById,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import {
  completeSupportInvestigation,
  getSupportInvestigation,
} from '@supportmanagement/services/support-investigation-service';
import {
  getSupportErrandProcessState,
  sendSupportProcessSignal,
  startSupportProcess,
} from '@supportmanagement/services/support-process-service';
import { cleanup, render, waitFor } from '@testing-library/react';
import { FC, PropsWithChildren } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../../../tests/mock-env';
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
  supportDecisionPermitType: () => 'SERVERINGSTILLSTAND',
}));
vi.mock('@supportmanagement/services/support-errand-service', () => ({
  getSupportErrandById: vi.fn(),
  closeSupportErrand: vi.fn(),
  setSupportErrandAdmin: vi.fn(),
  setSupportErrandStatus: vi.fn(),
  getMostSpecificLabelType: () => undefined,
  supportErrandHasAnIdentifiedApplicant: (errand: { customer?: { externalId?: string }[] } | undefined) =>
    (errand?.customer ?? []).some((stakeholder) => !!stakeholder.externalId),
  Status: { ONGOING: 'ONGOING', SUSPENDED: 'SUSPENDED', SOLVED: 'SOLVED', REOPENED: 'REOPENED' },
  Resolution: { CLOSED: 'CLOSED' },
}));
vi.mock('@common/components/json/utils/schema-utils', () => ({ getLatestRjsfSchema: vi.fn() }));
vi.mock('@supportmanagement/services/support-statement-service', () => ({
  getSupportStatements: vi.fn().mockResolvedValue([]),
  isSupportStatementAwaitingAnswer: (statement: { status?: string }) => statement.status === 'ACTIVE',
  isSupportStatementUnsent: (statement: { status?: string }) => !statement.status || statement.status === 'DRAFT',
}));
vi.mock('@supportmanagement/services/support-investigation-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportInvestigation: vi.fn(),
  completeSupportInvestigation: vi.fn(),
}));
vi.mock('@supportmanagement/services/support-process-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportErrandProcessState: vi.fn(),
  sendSupportProcessSignal: vi.fn(),
  startSupportProcess: vi.fn(),
}));

const ERRAND_ID = 'errand-1';

// What the certificate needs of the decision, as its JSON carries it.
const CERTIFICATE_JSON = {
  externalCaseRegistrationNumber: 'ifyllt',
  premises: { address: { street: 'ifyllt', postalCode: '000 01', city: 'ifyllt' }, phoneNumber: 'ifyllt' },
  servingArea: { description: 'ifyllt' },
  decision: {
    decisionText: 'ifyllt',
    clauses: 'ifyllt',
    decisionMaker: 'ifyllt',
    validFrom: '2026-11-01',
    executionDate: '2026-11-01',
  },
};

const aDecision = (value: object = CERTIFICATE_JSON) => [
  {
    id: 'decision-1',
    decisionType: 'PROPOSED',
    outcome: 'APPROVAL',
    jsonParameters: [{ key: 'aot_alcohol_decision', schemaId: '2281_aot_alcohol_decision_1.0', value }],
  },
];

const errandAt = (currentActivityId: string, awaitingSignals: string[], processKey?: string): SupportErrand =>
  ({
    id: ERRAND_ID,
    status: 'ONGOING',
    modified: '2026-10-02T10:00:00Z',
    process: {
      processInstanceId: 'process-1',
      processStatus: 'WAITING',
      currentActivityId,
      awaitingSignals: awaitingSignals.map((name) => ({ name })),
      ...(processKey ? { processKey } : {}),
    },
  } as unknown as SupportErrand);

const errandWithoutAProcess = (status = 'NEW'): SupportErrand =>
  ({ id: ERRAND_ID, status, modified: '2026-10-02T10:00:00Z', process: undefined } as unknown as SupportErrand);

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
    .mockResolvedValue(aDecision() as never);
  vi.mocked(completeSupportDecision)
    .mockReset()
    .mockResolvedValue(true as never);
  vi.mocked(getSupportInvestigation)
    .mockReset()
    .mockResolvedValue({ id: 'investigation-1', status: 'ACTIVE', version: 3 } as never);
  vi.mocked(completeSupportInvestigation)
    .mockReset()
    .mockResolvedValue({ id: 'investigation-1', status: 'COMPLETED' } as never);
  vi.mocked(sendSupportProcessSignal).mockReset().mockResolvedValue(undefined);
  vi.mocked(startSupportProcess).mockReset().mockResolvedValue(undefined);
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

test('the JSON of the draft decision is rewritten from the errand as it stands before it is concluded', async () => {
  const order: string[] = [];
  const writer = vi.fn(async () => order.push('json'));
  vi.mocked(completeSupportDecision).mockImplementation(async () => order.push('complete') as never);
  useSupportStore.setState({ decisionJsonWriter: writer });
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
  expect(writer).toHaveBeenCalledWith('decision-1');
  expect(order).toEqual(['json', 'complete']);
  useSupportStore.setState({ decisionJsonWriter: undefined });
});

test('the decision is read again for the gate, so one saved after the list was read is judged as it stands', async () => {
  const withoutValidFrom = { ...CERTIFICATE_JSON, decision: { ...CERTIFICATE_JSON.decision, validFrom: undefined } };
  vi.mocked(getSupportDecisions)
    .mockResolvedValueOnce(aDecision(withoutValidFrom) as never)
    .mockResolvedValue(aDecision() as never);
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

test('ready for decision completes the investigation before the signal, since the protocol is built from it', async () => {
  useSupportStore.setState({
    supportErrand: errandAt('investigation_phase', ['investigation_completed', 'process_cancelled']),
  });
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'investigation_phase',
      awaitingSignals: [{ name: 'investigation_completed' }, { name: 'process_cancelled' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();

  const button = await theButton('ready_for_decision');
  button.click();

  await waitFor(() =>
    expect(sendSupportProcessSignal).toHaveBeenCalledWith(ERRAND_ID, '2281', 'investigation_completed')
  );
  expect(completeSupportInvestigation).toHaveBeenCalledWith(
    ERRAND_ID,
    '2281',
    expect.objectContaining({ id: 'investigation-1', version: 3 })
  );
  expect(vi.mocked(completeSupportInvestigation).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(sendSupportProcessSignal).mock.invocationCallOrder[0]
  );
});

test('an investigation already completed is not completed again', async () => {
  useSupportStore.setState({
    supportErrand: errandAt('investigation_phase', ['investigation_completed', 'process_cancelled']),
  });
  vi.mocked(getSupportInvestigation).mockResolvedValue({ id: 'investigation-1', status: 'COMPLETED' } as never);
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'investigation_phase',
      awaitingSignals: [{ name: 'investigation_completed' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();

  const button = await theButton('ready_for_decision');
  button.click();

  await waitFor(() =>
    expect(sendSupportProcessSignal).toHaveBeenCalledWith(ERRAND_ID, '2281', 'investigation_completed')
  );
  expect(completeSupportInvestigation).not.toHaveBeenCalled();
});

const takeTheErrandToDecision = async (processKey: string) => {
  const underInvestigation = errandAt('investigation_phase', ['investigation_completed'], processKey);
  useSupportStore.setState({ supportErrand: underInvestigation });
  vi.mocked(getSupportErrandById).mockResolvedValue({ errand: underInvestigation } as never);
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'investigation_phase',
      awaitingSignals: [{ name: 'investigation_completed' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();

  (await theButton('ready_for_decision')).click();
};

test('a process that files the decision basis says where the handler finds it', async () => {
  await takeTheErrandToDecision('alcohol-serving');

  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'common:process.actions.ready_for_decision.done_with_decision_basis',
        status: 'success',
      })
    )
  );
});

test('a process that files no decision basis promises none', async () => {
  await takeTheErrandToDecision('internal-inspection');

  await waitFor(() =>
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'common:process.actions.ready_for_decision.done', status: 'success' })
    )
  );
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

test('an errand without a process is offered a start when Support Management says it may be started', async () => {
  useSupportStore.setState({ supportErrand: errandWithoutAProcess() });
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: undefined,
    startability: 'AVAILABLE',
    processKeys: ['internal-inspection'],
  });

  renderButton();

  const button = await theButton('start_process');
  button.click();

  await waitFor(() => expect(startSupportProcess).toHaveBeenCalledWith(ERRAND_ID, '2281', 'internal-inspection'));
  await waitFor(() => expect(useSupportStore.getState().processSignal?.errandId).toBe(ERRAND_ID));
  expect(setSupportErrandStatus).not.toHaveBeenCalled();
  expect(setSupportErrandAdmin).not.toHaveBeenCalled();
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
});

test('no start is offered when the labels of the errand point at no process', async () => {
  useSupportStore.setState({ supportErrand: errandWithoutAProcess() });
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: undefined,
    startability: 'NO_PROCESS_KEY',
    processKeys: [],
  });

  renderButton();

  await waitFor(() => expect(getSupportErrandProcessState).toHaveBeenCalled());
  expect(document.querySelector('[data-cy="process-action-start_process"]')).toBeNull();
});

test('a solved errand that never had a process is left alone', async () => {
  useSupportStore.setState({ supportErrand: errandWithoutAProcess('SOLVED') });
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: undefined,
    startability: 'AVAILABLE',
    processKeys: ['alcohol-serving'],
  });

  renderButton();

  await waitFor(() => expect(getSupportErrandProcessState).toHaveBeenCalled());
  expect(document.querySelector('[data-cy="process-action-start_process"]')).toBeNull();
});

const inReview = (customer: unknown[]): SupportErrand =>
  ({ ...errandAt('review_phase', ['review_completed', 'process_cancelled']), customer } as unknown as SupportErrand);

const reviewGateIsOffered = () =>
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'review_phase',
      awaitingSignals: [{ name: 'review_completed' }, { name: 'process_cancelled' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

const applicant = (overrides: object = {}) => ({
  organizationName: 'Testbolaget',
  address: 'Storgatan 3',
  zipCode: '852 31',
  city: 'Sundsvall',
  phoneNumbers: [{ value: mockEnv.mockPhoneNumber }],
  ...overrides,
});

test('the review waits for what the certificate prints about the applicant', async () => {
  useSupportStore.setState({ supportErrand: inReview([applicant({ zipCode: '' })]) });
  reviewGateIsOffered();

  renderButton();

  const button = await theButton('start_investigation');
  button.click();

  await waitFor(() => expect(useSupportStore.getState().activeTabKey).toBe('basics'));
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
});

test('what only the applicant can complete is said out loud and then left to the handler', async () => {
  useSupportStore.setState({ supportErrand: inReview([applicant()]) });
  reviewGateIsOffered();

  renderButton();

  const button = await theButton('start_investigation');
  button.click();

  // The application is not on the errand, so its inputs are missing; the dialog is answered yes here.
  await waitFor(() => expect(sendSupportProcessSignal).toHaveBeenCalledWith(ERRAND_ID, '2281', 'review_completed'));
  expect(useSupportStore.getState().activeTabKey).not.toBe('basics');
});

test('a decision is not concluded while the certificate lacks something, since its parameters then freeze', async () => {
  const withoutValidFrom = { ...CERTIFICATE_JSON, decision: { ...CERTIFICATE_JSON.decision, validFrom: undefined } };
  vi.mocked(getSupportDecisions).mockResolvedValue(aDecision(withoutValidFrom) as never);
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: {
      processStatus: 'WAITING',
      currentActivityId: 'decision_phase',
      awaitingSignals: [{ name: 'decision_completed' }],
    },
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();

  const button = await theButton();
  button.click();

  await waitFor(() => expect(useSupportStore.getState().activeTabKey).toBe('decision'));
  expect(completeSupportDecision).not.toHaveBeenCalled();
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
});

test('a process that failed is not offered a restart from the errand page', async () => {
  useSupportStore.setState({
    supportErrand: {
      ...errandWithoutAProcess(),
      process: { processStatus: 'FAILED', currentActivityId: 'external_task_create_protocol', awaitingSignals: [] },
    } as unknown as SupportErrand,
  });

  renderButton();

  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(getSupportErrandProcessState).not.toHaveBeenCalled();
  expect(document.querySelector('[data-cy="process-action-start_process"]')).toBeNull();
});

/** The folköl schema as the jsonschema service publishes it, cut to its attachment declaration. */
const FOLKOL_SCHEMA = {
  type: 'object',
  'x-attachments': [
    {
      key: 'POWER_OF_ATTORNEY',
      label: 'Fullmakt',
      requiredWhen: { properties: { arDuFirmatecknare: { const: 'NEJ' } }, required: ['arDuFirmatecknare'] },
    },
  ],
};

const SCHEMA_NAME = 'aot_alcohol_folkol_folkol_serving_notification';

const identifiedApplicant = { role: 'PRIMARY', externalId: 'a3f1c2e4-0000-4000-8000-000000000001' };

const errandInRegistration = (over: Partial<SupportErrand> = {}): SupportErrand =>
  ({
    id: ERRAND_ID,
    status: 'NEW',
    modified: '2026-11-05T10:00:00Z',
    labels: [
      { classification: 'CATEGORY', resourceName: 'ALCOHOL' },
      { classification: 'TYPE', resourceName: 'FOLKOL' },
      { classification: 'SUBTYPE', resourceName: 'FOLKOL_SERVING_NOTIFICATION' },
    ],
    customer: [identifiedApplicant],
    jsonParameters: [{ key: SCHEMA_NAME, value: { arDuFirmatecknare: 'JA' }, schemaId: `${SCHEMA_NAME}-id` }],
    process: {
      processInstanceId: 'process-1',
      processStatus: 'WAITING',
      currentActivityId: 'registration_phase',
      awaitingSignals: [{ name: 'registration_completed' }],
    },
    ...over,
  } as unknown as SupportErrand);

const startTheHandling = async (supportErrand: SupportErrand) => {
  useSupportStore.setState({ supportErrand, activeTabKey: 'messages' });
  vi.mocked(getSupportErrandProcessState).mockResolvedValue({
    process: supportErrand.process,
    startability: 'LIVE_INSTANCE',
  } as never);

  renderButton();
  const button = await theButton('start_handling');
  button.click();
};

beforeEach(() => {
  vi.mocked(getLatestRjsfSchema)
    .mockReset()
    .mockResolvedValue({ schema: FOLKOL_SCHEMA } as never);
  useMetadataStore.setState({ supportMetadata: { namespace: 'AOT' } as never });
});

test('the handling does not start on an errand without an identified applicant', async () => {
  await startTheHandling(errandInRegistration({ customer: [] } as never));

  await waitFor(() => expect(useSupportStore.getState().activeTabKey).toBe('basics'));
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
});

test('an applicant without a party id is not an applicant the process can use', async () => {
  await startTheHandling(errandInRegistration({ customer: [{ role: 'PRIMARY' }] } as never));

  await waitFor(() => expect(useSupportStore.getState().activeTabKey).toBe('basics'));
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
});

test('the handling does not start before the errand details have been filled in', async () => {
  await startTheHandling(errandInRegistration({ jsonParameters: [] } as never));

  await waitFor(() => expect(useSupportStore.getState().activeTabKey).toBe('details'));
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
});

test('the handling does not start while an attachment the errand type asks for is missing', async () => {
  const errand = errandInRegistration({
    jsonParameters: [{ key: SCHEMA_NAME, value: { arDuFirmatecknare: 'NEJ' }, schemaId: `${SCHEMA_NAME}-id` }],
  } as never);

  await startTheHandling(errand);

  await waitFor(() => expect(useSupportStore.getState().activeTabKey).toBe('attachments'));
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
});

test('an uploaded attachment with the right purpose lets the handling start', async () => {
  useSupportStore.setState({
    supportAttachments: [
      {
        id: 'attachment-1',
        fileName: 'fullmakt.pdf',
        mimeType: 'application/pdf',
        purpose: { name: 'POWER_OF_ATTORNEY' },
      },
    ] as never,
  });
  const errand = errandInRegistration({
    jsonParameters: [{ key: SCHEMA_NAME, value: { arDuFirmatecknare: 'NEJ' }, schemaId: `${SCHEMA_NAME}-id` }],
  } as never);

  await startTheHandling(errand);

  await waitFor(() =>
    expect(sendSupportProcessSignal).toHaveBeenCalledWith(ERRAND_ID, '2281', 'registration_completed')
  );
  useSupportStore.setState({ supportAttachments: undefined });
});

test('a complete errand starts its handling', async () => {
  await startTheHandling(errandInRegistration());

  await waitFor(() =>
    expect(sendSupportProcessSignal).toHaveBeenCalledWith(ERRAND_ID, '2281', 'registration_completed')
  );
});

test('an errand type that publishes no schema asks for no details and no attachments', async () => {
  vi.mocked(getLatestRjsfSchema).mockRejectedValue({ response: { status: 404 } });

  await startTheHandling(errandInRegistration({ jsonParameters: [] } as never));

  await waitFor(() =>
    expect(sendSupportProcessSignal).toHaveBeenCalledWith(ERRAND_ID, '2281', 'registration_completed')
  );
});

test('a schema that cannot be read holds the step rather than passing it on a guess', async () => {
  vi.mocked(getLatestRjsfSchema).mockRejectedValue({ response: { status: 503 } });

  await startTheHandling(errandInRegistration());

  await waitFor(() => expect(toast).toHaveBeenCalled());
  expect(sendSupportProcessSignal).not.toHaveBeenCalled();
});
