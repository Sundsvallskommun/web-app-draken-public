import { appConfig } from '@config/appconfig';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';

import { getOrCreateSupportConversationId, sendSupportConversationMessage } from './support-conversation-service';
import { isOrganizationExternalIdType, type SupportErrand } from './support-errand-service';
import { sendMessage } from './support-message-service';
import { applicantContactChannel } from './support-stakeholder-service';

/** Where the communication leaves the unit: Mina sidor where the permit holder can be reached there, else e-mail. */
export const SupportCommunicationChannel = {
  MY_PAGES: 'minasidor',
  EMAIL: 'email',
} as const;

export type SupportCommunicationChannelName =
  (typeof SupportCommunicationChannel)[keyof typeof SupportCommunicationChannel];

/** Whether the permit holder is identified well enough for Mina sidor to find them, which is what the form asks too. */
const isReachableInMyPages = (errand: SupportErrand): boolean => {
  const owner = getSupportOwnerStakeholder(errand);
  return !!owner?.personNumber || (isOrganizationExternalIdType(owner?.externalIdType) && !!owner?.externalId);
};

export const supportCommunicationChannel = (errand: SupportErrand): SupportCommunicationChannelName =>
  appConfig.features.useMyPages && isReachableInMyPages(errand)
    ? SupportCommunicationChannel.MY_PAGES
    : SupportCommunicationChannel.EMAIL;

const emailsOfThePermitHolder = (errand: SupportErrand): { value: string }[] => {
  const channel = applicantContactChannel(errand);
  const isEmail = channel.contactMeans === 'EMAIL' || channel.contactMeans === 'Email';
  if (!isEmail) return [];
  return channel.values
    .map((value) => value.value)
    .filter((value): value is string => !!value)
    .map((value) => ({ value }));
};

const asHtml = (text: string): string =>
  text
    .split('\n')
    .map((line) => `<p>${line}</p>`)
    .join('');

/**
 * Sends the communication the way every other message to the permit holder goes: as a message on the errand, so
 * it stands in the thread. Mina sidor takes it as a conversation message, e-mail as an ordinary message.
 */
export const sendSupportCommunication = async (
  municipalityId: string,
  errand: SupportErrand,
  text: string,
  senderName: string
): Promise<void> => {
  if (!errand.id) throw new Error('The errand has no id to send the communication on');

  if (supportCommunicationChannel(errand) === SupportCommunicationChannel.MY_PAGES) {
    const conversationId = await getOrCreateSupportConversationId(
      municipalityId,
      errand,
      SupportCommunicationChannel.MY_PAGES,
      '',
      [],
      ''
    );
    await sendSupportConversationMessage(municipalityId, errand.id, conversationId, text);
    return;
  }

  const emails = emailsOfThePermitHolder(errand);
  if (emails.length === 0) throw new Error('The permit holder has no address to send the communication to');

  await sendMessage({
    municipalityId,
    errandId: errand.id,
    contactMeans: SupportCommunicationChannel.EMAIL,
    emails,
    recipientEmail: '',
    phoneNumbers: [],
    plaintextMessage: text,
    htmlMessage: asHtml(text),
    senderName,
    subject: `Ärende #${errand.errandNumber ?? ''}`,
    headerReplyTo: '',
    headerReferences: '',
  });
};
