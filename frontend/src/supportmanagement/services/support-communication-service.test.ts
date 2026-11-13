import { expect, test, vi } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import { sendSupportCommunication, supportCommunicationChannel } from './support-communication-service';
import { getOrCreateSupportConversationId, sendSupportConversationMessage } from './support-conversation-service';
import type { SupportErrand } from './support-errand-service';
import { sendMessage } from './support-message-service';

vi.mock('./support-conversation-service', () => ({
  getOrCreateSupportConversationId: vi.fn(async () => 'conversation-1'),
  sendSupportConversationMessage: vi.fn(async () => undefined),
}));
vi.mock('./support-message-service', () => ({ sendMessage: vi.fn(async () => true) }));

const myPages = vi.hoisted(() => ({ on: true }));
vi.mock('@config/appconfig', () => ({
  appConfig: {
    features: {
      get useMyPages() {
        return myPages.on;
      },
    },
  },
}));

const MUNICIPALITY_ID = '2281';
const TEXT = 'Bristerna kvarstår och kommunen överväger en varning.';

// The owner is read off the form model (customer), the contact channels off the stakeholders, as elsewhere.
const errandWith = (stakeholder: Record<string, unknown>): SupportErrand =>
  ({
    id: 'errand-1',
    errandNumber: mockEnv.mockErrandNumber,
    customer: [{ role: 'PRIMARY', ...stakeholder }],
    stakeholders: [{ role: 'PRIMARY', ...stakeholder }],
  } as unknown as SupportErrand);

const company = errandWith({
  externalIdType: 'ENTERPRISE',
  externalId: 'd5727c45-8c19-42a0-a04a-5ef11d108618',
  contactChannels: [{ type: 'EMAIL', value: mockEnv.mockEmail }],
});

const withEmailOnly = errandWith({
  externalIdType: 'PRIVATE',
  contactChannels: [{ type: 'EMAIL', value: mockEnv.mockEmail }],
});

test('a permit holder Mina sidor can find is reached there, and anyone else by e-mail', () => {
  myPages.on = true;
  expect(supportCommunicationChannel(company)).toBe('minasidor');
  expect(supportCommunicationChannel(withEmailOnly)).toBe('email');
});

test('without Mina sidor the communication goes by e-mail, whoever the permit holder is', () => {
  myPages.on = false;
  expect(supportCommunicationChannel(company)).toBe('email');
  myPages.on = true;
});

test('Mina sidor takes the communication as a message in the errand conversation', async () => {
  myPages.on = true;
  await sendSupportCommunication(MUNICIPALITY_ID, company, TEXT, 'Anna Handläggare');

  expect(getOrCreateSupportConversationId).toHaveBeenCalledWith(MUNICIPALITY_ID, company, 'minasidor', '', [], '');
  expect(sendSupportConversationMessage).toHaveBeenCalledWith(MUNICIPALITY_ID, 'errand-1', 'conversation-1', TEXT);
  expect(sendMessage).not.toHaveBeenCalled();
});

test('e-mail takes it as an ordinary message on the errand, addressed to the permit holder', async () => {
  myPages.on = false;
  await sendSupportCommunication(MUNICIPALITY_ID, withEmailOnly, TEXT, 'Anna Handläggare');

  expect(vi.mocked(sendMessage).mock.calls[0][0]).toMatchObject({
    errandId: 'errand-1',
    contactMeans: 'email',
    emails: [{ value: mockEnv.mockEmail }],
    plaintextMessage: TEXT,
    senderName: 'Anna Handläggare',
  });
  myPages.on = true;
});

test('a permit holder with no address at all stops the communication rather than sending it nowhere', async () => {
  myPages.on = false;
  await expect(
    sendSupportCommunication(MUNICIPALITY_ID, errandWith({ externalIdType: 'PRIVATE' }), TEXT, 'Anna')
  ).rejects.toThrow();
  myPages.on = true;
});
