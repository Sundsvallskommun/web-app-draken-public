// @vitest-environment jsdom
import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import { useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import {
  SUPPORT_COMMUNICATION_TYPE,
  type SupportStatementForm,
  SupportStatementStatus,
} from '@supportmanagement/services/support-statement-service';
import { cleanup, render } from '@testing-library/react';
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

const outcome = () => document.querySelector('[data-cy="communication-outcome"]') as HTMLSelectElement;
const respondedAt = () => document.querySelector('[data-cy="communication-responded-at"]') as HTMLInputElement;

const communication = (status: string): Statement =>
  ({ id: 'statement-1', type: SUPPORT_COMMUNICATION_TYPE, status, counterpartyName: 'Drivna Krogen AB' } as Statement);

const formWith = (status: string, outcomeName: string): SupportStatementForm =>
  ({
    freeText: 'Bristerna kvarstår.',
    outcome: outcomeName,
    respondedAt: '',
    status,
  } as unknown as SupportStatementForm);

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
      onChanged={vi.fn()}
      onRemoved={vi.fn()}
    />
  );

beforeEach(() => {
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
