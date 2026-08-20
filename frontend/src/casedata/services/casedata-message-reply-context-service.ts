import { MessageReplyContext } from '@common/interfaces/message-reply-context';
import { MessageContactMeans } from '@common/services/message-template-body-service';
import sanitized, { formatMessage, sanitizeHtmlMessageBody } from '@common/services/sanitizer-service';

import { MessageNode } from './casedata-message-service';
import { CasedataMessageType, isCasedataWebMessageType } from './casedata-message-types';

const messageTypeToContactMeans: Partial<Record<CasedataMessageType, MessageContactMeans>> = {
  [CasedataMessageType.Draken]: 'draken',
  [CasedataMessageType.MinaSidor]: 'minasidor',
};

const getReplyContactMeans = (message: MessageNode): MessageContactMeans => {
  if (isCasedataWebMessageType(message.messageType)) return 'webmessage';

  return messageTypeToContactMeans[message.messageType as CasedataMessageType] ?? 'email';
};

export const buildCasedataReplyContext = (message: MessageNode, errandId?: string | number): MessageReplyContext => {
  const contactMeans = getReplyContactMeans(message);
  const replyTo = message.emailHeaders?.find((header) => header.header === 'MESSAGE_ID')?.values[0] ?? '';
  const references = message.emailHeaders?.find((header) => header.header === 'REFERENCES')?.values ?? [];
  const sender = message.conversationId ? `${message.firstName} ${message.lastName}` : message.email;
  const historyHeader = `<br><br>-----Ursprungligt meddelande-----<br>Från: ${sender}<br>Skickat: ${message.sent}<br>Till: Sundsvalls kommun<br>Ämne: ${message.subject}<br><br>`;
  const messageBody = message.htmlMessage
    ? sanitizeHtmlMessageBody(message.htmlMessage)
    : formatMessage(sanitized(message.message ?? ''));

  return {
    contactMeans,
    headerReplyTo: replyTo,
    headerReferences: [...references, replyTo].filter(Boolean).join(','),
    recipients:
      message.direction === 'OUTBOUND'
        ? message.recipients?.map((email) => ({ value: email })) ?? []
        : [{ value: message.email ?? '' }],
    historyHtml: historyHeader + messageBody,
    setupKey: `reply:${message.messageId || ''}:${contactMeans}:${errandId || ''}`,
  };
};
