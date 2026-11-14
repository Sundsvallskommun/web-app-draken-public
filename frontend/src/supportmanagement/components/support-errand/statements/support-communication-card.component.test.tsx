// @vitest-environment jsdom
import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import { useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { sendSupportCommunication } from '@supportmanagement/services/support-communication-service';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import {
  SUPPORT_COMMUNICATION_TYPE,
  type SupportStatementForm,
  SupportStatementStatus,
  updateSupportStatement,
} from '@supportmanagement/services/support-statement-service';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../../tests/mock-env';
import { SupportCommunicationCard } from './support-communication-card.component';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));
vi.mock('@supportmanagement/services/support-communication-service', () => ({
  SupportCommunicationChannel: { MY_PAGES: 'MY_PAGES', EMAIL: 'EMAIL' },
  supportCommunicationChannel: () => 'EMAIL',
  sendSupportCommunication: vi.fn(),
}));
vi.mock('@supportmanagement/services/support-statement-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateSupportStatement: vi.fn(),
  deleteSupportStatement: vi.fn(),
}));

const outcome = () => document.querySelector('[data-cy="communication-outcome"]') as HTMLSelectElement;
const respondedAt = () => document.querySelector('[data-cy="communication-responded-at"]') as HTMLInputElement;
const sendButton = () => document.querySelector('[data-cy="communication-send"]') as HTMLButtonElement;
const text = () => document.querySelector('[data-cy="communication-text"]') as HTMLTextAreaElement;
const notRecorded = () => document.querySelector('[data-cy="communication-not-recorded"]');

const communication = (status: string): Statement =>
  ({ id: 'statement-1', type: SUPPORT_COMMUNICATION_TYPE, status, counterpartyName: 'Drivna Krogen AB' } as Statement);

const formWith = (status: string, outcomeName: string): SupportStatementForm =>
  ({
    freeText: 'Bristerna kvarstår.',
    outcome: outcomeName,
    respondedAt: '',
    status,
  } as unknown as SupportStatementForm);

const onChanged = vi.fn();

const renderCard = (statement: Statement, form: SupportStatementForm) =>
  render(
    <SupportCommunicationCard
      statement={statement}
      form={form}
      problem={undefined}
      errandId="errand-1"
      errandNumber={mockEnv.mockErrandNumber}
      municipalityId="2281"
      writable
      onFormChange={vi.fn()}
      onChanged={onChanged}
      onRemoved={vi.fn()}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateSupportStatement).mockResolvedValue({} as Statement);
  useSupportStore.setState({ supportErrand: { id: 'errand-1' } as unknown as SupportErrand });
  useUserStore.setState({ user: { name: 'Tobias' } } as never);
  useMetadataStore.setState({
    supportMetadata: {
      namespace: 'AOT',
      statementOutcomes: [{ name: 'STATEMENT_RECEIVED', displayName: 'Yttrande inkommet', responded: true }],
    } as unknown as SupportMetadata,
  });
});

afterEach(cleanup);

// Picking an outcome turns the form's own status COMPLETED before anything is saved; the fields have to stay
// open so the handler can fill in the date the outcome asks for.
test('the outcome and the response date stay open while the handler is filling them in', () => {
  renderCard(
    communication(SupportStatementStatus.ACTIVE),
    formWith(SupportStatementStatus.COMPLETED, 'STATEMENT_RECEIVED')
  );

  expect(outcome().disabled).toBe(false);
  expect(respondedAt().disabled).toBe(false);
});

test('a communication saved as settled is locked', () => {
  renderCard(
    communication(SupportStatementStatus.COMPLETED),
    formWith(SupportStatementStatus.COMPLETED, 'STATEMENT_RECEIVED')
  );

  expect(outcome().disabled).toBe(true);
  expect(respondedAt().disabled).toBe(true);
});

const aDraft = () =>
  renderCard(communication(SupportStatementStatus.DRAFT), formWith(SupportStatementStatus.DRAFT, ''));

const press = async (button: HTMLButtonElement) => {
  await act(async () => {
    fireEvent.click(button);
  });
};

test('a communication that goes out is written as the one awaiting an answer', async () => {
  aDraft();

  await press(sendButton());

  expect(sendSupportCommunication).toHaveBeenCalledTimes(1);
  expect(vi.mocked(updateSupportStatement).mock.calls[0][3]).toMatchObject({ status: SupportStatementStatus.ACTIVE });
  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(notRecorded()).toBeNull();
});

// The message is out of the house; a second attempt has to take the step that failed and nothing else.
test('a message that went out but could not be written on the errand is not sent again', async () => {
  vi.mocked(updateSupportStatement).mockRejectedValueOnce(new Error('the statement could not be updated'));
  aDraft();

  await press(sendButton());

  expect(sendSupportCommunication).toHaveBeenCalledTimes(1);
  expect(onChanged).not.toHaveBeenCalled();
  expect(notRecorded()).toBeTruthy();
  expect(text().disabled).toBe(true);

  await press(sendButton());

  expect(sendSupportCommunication).toHaveBeenCalledTimes(1);
  expect(updateSupportStatement).toHaveBeenCalledTimes(2);
  expect(onChanged).toHaveBeenCalledTimes(1);
});

test('a message that never went out leaves the card as it was, with sending still the step to take', async () => {
  vi.mocked(sendSupportCommunication).mockRejectedValueOnce(new Error('the message was not sent'));
  aDraft();

  await press(sendButton());

  expect(updateSupportStatement).not.toHaveBeenCalled();
  expect(notRecorded()).toBeNull();
  expect(text().disabled).toBe(false);
});
