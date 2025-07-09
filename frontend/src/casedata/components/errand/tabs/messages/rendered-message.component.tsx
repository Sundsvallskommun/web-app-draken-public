import { IErrand } from '@casedata/interfaces/errand';
import { Role } from '@casedata/interfaces/role';
import { MessageResponseDirectionEnum } from '@common/data-contracts/case-data/data-contracts';
import sanitized from '@common/services/sanitizer-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, cx } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import React from 'react';
import { MessageResponse } from 'src/data-contracts/backend/data-contracts';

export const RenderedMessage: React.FC<{
  message: MessageResponse;
  selected: string;
  onSelect: (msg: MessageResponse) => void;
  root?: boolean;
  children: any;
}> = ({ message, selected, onSelect, root = false, children }) => {
  const messageAvatar = (message: MessageResponse) => (
    <Avatar
      rounded
      color={message.direction === 'OUTBOUND' ? 'juniskar' : 'bjornstigen'}
      size={'md'}
      initials={getSenderInitials(message)}
    />
  );

  const {
    errand,
  }: {
    errand: IErrand;
  } = useAppContext();

  const getSender = (msg: MessageResponse) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName} ${msg.lastName}` : msg?.email ? msg.email : '(okänd avsändare)';

  const getSenderInitials = (msg: MessageResponse) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName?.[0]}${msg.lastName?.[0]}` : '@';

  const getMessageOwner = (msg: MessageResponse) => {
    if (msg.direction === MessageResponseDirectionEnum.INBOUND) {
      const ownerInfomration = errand.stakeholders.filter((stakeholder) => stakeholder.roles.includes(Role.APPLICANT));
      const isWebMessageOpenE = msg.messageType === 'WEBMESSAGE' && msg.externalCaseId !== null;
      const isOwnerStakeholderEmail = ownerInfomration.some((stakeholder) =>
        stakeholder.emails.some((email) => email.value === msg.email)
      );

      if (isWebMessageOpenE || isOwnerStakeholderEmail) {
        return <span className="text-xs whitespace-nowrap">Ärendeägare</span>;
      }
    }
  };

  return (
    <>
      <div
        key={`message-${message.messageId}`}
        onClick={() => {
          onSelect(message);
        }}
        className={cx(
          ` relative flex gap-md items-start justify-between rounded-4 m-0 py-sm px-sm text-md hover:bg-background-color-mixin-1 hover:cursor-pointer ${
            selected === message.messageId ? 'bg-background-color-mixin-1 rounded-xl' : null
          }`
        )}
        data-cy={`node-${message?.emailHeaders?.[0]?.values || message?.messageId}`}
      >
        <div className="flex w-full">
          {messageAvatar(message)}
          <div className="w-5/6 ml-sm">
            <div className="my-0 flex justify-between">
              <div>
                {!root ? <LucideIcon size={16} className="mr-sm" name="corner-down-right" /> : null}
                <span
                  className={cx(`mr-md break-all font-bold`)}
                  dangerouslySetInnerHTML={{
                    __html: `Från: ${sanitized(getSender(message))}`,
                  }}
                ></span>
              </div>
            </div>
            <p
              className={cx(`my-0 text-primary`, message.viewed ? 'font-normal' : 'font-bold')}
              dangerouslySetInnerHTML={{
                __html: sanitized(message.subject || ''),
              }}
            ></p>
          </div>
        </div>
        <div className="flex flex-col align-end items-end justify-between">
          <div className="inline-flex items-start flex-nowrap">
            <span className="text-xs whitespace-nowrap">{dayjs(message.sent).format('YYYY-MM-DD HH:mm')}</span>
            <span className="text-xs mx-sm">|</span>
            {message.attachments?.length > 0 ? (
              <>
                <div className="mx-sm inline-flex items-center gap-xs">
                  <LucideIcon name="paperclip" size="1.5rem" />
                  <span className="text-xs">{message.attachments?.length}</span>
                </div>
                <span className="text-xs mx-sm">|</span>
              </>
            ) : null}
            <span className="text-xs whitespace-nowrap">
              {message.messageType === 'SMS' ? (
                <>
                  <LucideIcon name="smartphone" size="1.5rem" className="align-sub mx-sm" /> Via SMS
                </>
              ) : message.messageType === 'EMAIL' ? (
                <>
                  <LucideIcon name="mail" size="1.5rem" className="align-sub mx-sm" /> Via e-post
                </>
              ) : message.messageType === 'DIGITAL_MAIL' ? (
                <>
                  <LucideIcon name="mail" size="1.5rem" className="align-sub mx-sm" /> Via digital brevlåda
                </>
              ) : message.messageType === 'WEBMESSAGE' || message.externalCaseId ? (
                <>
                  <LucideIcon name="monitor" size="1.5rem" className="align-sub mx-sm" /> Via e-tjänst
                </>
              ) : message.messageType === 'DRAKEN' ? (
                <>
                  <LucideIcon name="monitor" size="1.5rem" className="align-sub mx-sm" /> Via Draken
                </>
              ) : message.messageType === 'MINASIDOR' ? (
                <>
                  <LucideIcon name="monitor" size="1.5rem" className="align-sub mx-sm" /> Via Mina sidor
                </>
              ) : (
                ''
              )}
            </span>
          </div>
          {getMessageOwner(message)}
        </div>
        <div>
          <span
            className={cx(
              message.viewed ? 'bg-gray-200' : `bg-vattjom-surface-primary`,
              `self-start w-12 h-12 my-xs rounded-full flex items-center justify-center text-lg`
            )}
          ></span>
        </div>
      </div>
      <div className="ml-lg">{children}</div>
    </>
  );
};
