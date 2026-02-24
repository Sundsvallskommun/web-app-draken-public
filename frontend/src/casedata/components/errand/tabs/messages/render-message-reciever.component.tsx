import { Channels } from '@casedata/interfaces/channels';
import { IErrand } from '@casedata/interfaces/errand';
import { MessageNode } from '@casedata/services/casedata-message-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import sanitized from '@common/services/sanitizer-service';
import { Button } from '@sk-web-gui/button';
import { useState } from 'react';

const MAX_VISIBLE_RECIPIENTS = 2;

const getMessageSourceLabel = (message: MessageNode, errand: IErrand | undefined): string | string[] => {
  if (!message) return '';

  if (message.messageType === 'EMAIL') {
    return message.recipients ?? [];
  }

  if (message.messageType === 'SMS') {
    return message.mobileNumber ?? '';
  }

  if (message.messageType === 'WEBMESSAGE' || message.externalCaseId) {
    return 'E-tjänst';
  }

  if (message.messageType === 'MINASIDOR' && message.direction === 'OUTBOUND' && errand) {
    const owner = getOwnerStakeholder(errand);
    return (owner?.firstName ?? '') + ' ' + (owner?.lastName ?? '');
  }

  if (message.messageType === 'MINASIDOR' && message.direction === 'INBOUND') {
    return errand?.channel === Channels.ESERVICE_KATLA ? 'Färdtjänst' : 'Draken';
  }

  if (message.messageType === 'DRAKEN') {
    return errand?.channel === Channels.ESERVICE_KATLA ? 'Färdtjänst' : 'Draken';
  }

  return '(okänd mottagare)';
};

interface EmailRecipientsProps {
  recipients: string[];
}

const EmailRecipients: React.FC<EmailRecipientsProps> = ({ recipients }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const totalCount = recipients.length;
  const hasMore = totalCount > MAX_VISIBLE_RECIPIENTS;
  const visibleRecipients = isExpanded ? recipients : recipients.slice(0, MAX_VISIBLE_RECIPIENTS);
  const hiddenCount = totalCount - MAX_VISIBLE_RECIPIENTS;

  return (
    <span>
      {sanitized(visibleRecipients.join(', '))}
      {hasMore && !isExpanded && (
        <Button variant="link" className="ml-4" onClick={() => setIsExpanded(true)}>
          + {hiddenCount} {hiddenCount === 1 ? 'annan' : 'andra'}
        </Button>
      )}
      {isExpanded && (
        <Button variant="link" className="ml-4" onClick={() => setIsExpanded(false)}>
          Visa färre
        </Button>
      )}
    </span>
  );
};

export const RenderMessageReciever: React.FC<{ selectedMessage: MessageNode; errand: IErrand | undefined }> = ({
  selectedMessage,
  errand,
}) => {
  const reciever = getMessageSourceLabel(selectedMessage, errand);

  if (Array.isArray(reciever)) {
    return <EmailRecipients recipients={reciever} />;
  }

  return <>{sanitized(reciever)}</>;
};
