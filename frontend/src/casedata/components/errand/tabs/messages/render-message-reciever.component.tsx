import { Channels } from '@casedata/interfaces/channels';
import { IErrand } from '@casedata/interfaces/errand';
import { MessageNode } from '@casedata/services/casedata-message-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import sanitized from '@common/services/sanitizer-service';

const getMessageSourceLabel = (message: MessageNode, errand: IErrand) => {
  if (!message) return '';

  if (message.messageType === 'EMAIL') {
    return message.recipients.join(', ');
  }

  if (message.messageType === 'SMS') {
    return message.mobileNumber;
  }

  if (message.messageType === 'WEBMESSAGE' || message.externalCaseId) {
    return 'E-tjänst';
  }

  if (message.messageType === 'MINASIDOR' && message.direction === 'OUTBOUND') {
    const owner = getOwnerStakeholder(errand);
    return owner.firstName + ' ' + owner.lastName;
  }

  if (message.messageType === 'MINASIDOR' && message.direction === 'INBOUND') {
    return errand?.channel === Channels.ESERVICE_KATLA ? 'Färdtjänst' : 'Draken';
  }

  if (message.messageType === 'DRAKEN') {
    return errand?.channel === Channels.ESERVICE_KATLA ? 'Färdtjänst' : 'Draken';
  }

  return '(okänd mottagare)';
};

export const RenderMessageReciever: React.FC<{ selectedMessage: MessageNode; errand: IErrand }> = ({
  selectedMessage,
  errand,
}) => {
  const nameOfReciever = getMessageSourceLabel(selectedMessage, errand);

  return <>{sanitized(nameOfReciever)}</>;
};
