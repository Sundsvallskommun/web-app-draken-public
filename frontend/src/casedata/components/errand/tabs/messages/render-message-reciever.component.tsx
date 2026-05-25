import { Channels } from '@casedata/interfaces/channels';
import { IErrand } from '@casedata/interfaces/errand';
import { MessageNode } from '@casedata/services/casedata-message-service';
import { CasedataMessageType, isCasedataWebMessageType } from '@casedata/services/casedata-message-types';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { MessageResponseDirectionEnum } from '@common/data-contracts/case-data/data-contracts';
import sanitized from '@common/services/sanitizer-service';
import { Button } from '@sk-web-gui/button';
import { FC, useState } from 'react';
const MAX_VISIBLE_RECIPIENTS = 2;

const getDrakenSourceLabel = (errand: IErrand | undefined): string =>
  errand?.channel === Channels.ESERVICE_KATLA ? 'Färdtjänst' : 'Draken';

const getOwnerSourceLabel = (errand: IErrand): string => {
  const owner = getOwnerStakeholder(errand);
  return (owner?.firstName ?? '') + ' ' + (owner?.lastName ?? '');
};

const getMessageSourceLabel = (message: MessageNode, errand: IErrand | undefined): string | string[] => {
  if (!message) return '';

  if (message.messageType === CasedataMessageType.Email) {
    return message.recipients ?? [];
  }

  if (message.messageType === CasedataMessageType.Sms) {
    return message.mobileNumber ?? '';
  }

  if (isCasedataWebMessageType(message.messageType) || message.externalCaseId) {
    return 'E-tjänst';
  }

  if (message.messageType === CasedataMessageType.MinaSidor) {
    return message.direction === MessageResponseDirectionEnum.OUTBOUND && errand
      ? getOwnerSourceLabel(errand)
      : getDrakenSourceLabel(errand);
  }

  if (message.messageType === CasedataMessageType.Draken) return getDrakenSourceLabel(errand);

  return '(okänd mottagare)';
};

interface EmailRecipientsProps {
  recipients: string[];
}

export const EmailRecipients: FC<EmailRecipientsProps> = ({ recipients }) => {
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

export const RenderMessageReciever: FC<{ selectedMessage: MessageNode; errand: IErrand | undefined }> = ({
  selectedMessage,
  errand,
}) => {
  const reciever = getMessageSourceLabel(selectedMessage, errand);

  if (Array.isArray(reciever)) {
    return <EmailRecipients recipients={reciever} />;
  }

  return <>{sanitized(reciever)}</>;
};
