import sanitized from '@common/services/sanitizer-service';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { Message } from '@supportmanagement/services/support-message-service';
import { getApplicantName } from '@supportmanagement/services/support-stakeholder-service';

const getReciever = (msg: Message, supportErrand: SupportErrand) => {
  if (!msg) {
    return '';
  }
  if (msg.communicationType === 'WEB_MESSAGE') {
    return msg.direction === 'INBOUND' ? 'Draken' : 'E-tjänst';
  }
  if (msg.communicationType === 'MINASIDOR' && msg.direction === 'OUTBOUND') {
    return getApplicantName(supportErrand);
  }

  if (msg.communicationType === 'MINASIDOR' && msg.direction === 'INBOUND') {
    return 'Draken';
  }

  if (msg.communicationType === 'DRAKEN') {
    return 'Draken';
  }
  return msg?.target || '(okänd mottagare)';
};

export const RenderSupportMessageReciever: React.FC<{ selectedMessage: Message; errand: SupportErrand }> = ({
  selectedMessage,
  errand,
}) => {
  const nameOfReciever = getReciever(selectedMessage, errand);

  return <>{sanitized(nameOfReciever)}</>;
};
