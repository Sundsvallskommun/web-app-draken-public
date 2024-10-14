import { ErrandMessageResponse } from '@common/interfaces/message';
import sanitized from '@common/services/sanitizer-service';
import { Avatar, LucideIcon as Icon, cx } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import React from 'react';

export const RenderedMessage: React.FC<{
  message: ErrandMessageResponse;
  selected: string;
  onSelect: (msg: ErrandMessageResponse) => void;
  root?: boolean;
  children: any;
}> = ({ message, selected, onSelect, root = false, children }) => {
  const messageAvatar = (message: ErrandMessageResponse) => (
    <Avatar
      rounded
      color={message.direction === 'OUTBOUND' ? 'juniskar' : 'bjornstigen'}
      size={'md'}
      initials={getSenderInitials(message)}
    />
  );

  const getSender = (msg: ErrandMessageResponse) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName} ${msg.lastName}` : msg?.email ? msg.email : '(okänd avsändare)';

  const getSenderInitials = (msg: ErrandMessageResponse) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName?.[0]}${msg.lastName?.[0]}` : '?';

  return (
    <>
      <div
        key={`message-${message.messageID}`}
        onClick={() => {
          onSelect(message);
        }}
        className={cx(
          ` relative flex gap-md items-start justify-between rounded-4 m-0 py-sm px-sm text-md hover:bg-background-color-mixin-1 hover:cursor-pointer ${
            selected === message.messageID ? 'bg-background-color-mixin-1 rounded-xl' : null
          }`
        )}
        data-cy={`node-${message?.emailHeaders[0]?.values || message?.messageID}`}
      >
        <div className="flex w-full">
          {messageAvatar(message)}
          <div className="w-5/6 ml-sm">
            <div className="my-0 flex justify-between">
              <div>
                {!root ? <Icon size={16} className="mr-sm" name="corner-down-right" /> : null}
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
        <div className="inline-flex items-start flex-nowrap">
          <span className="text-xs whitespace-nowrap">{dayjs(message.sent).format('YYYY-MM-DD HH:mm')}</span>
          <span className="text-xs mx-sm">|</span>
          {message.attachments?.length > -1 ? (
            <>
              <div className="mx-sm inline-flex items-center gap-xs">
                <Icon name="paperclip" size="1.5rem" />
                <span className="text-xs">{message.attachments?.length}</span>
              </div>
              <span className="text-xs mx-sm">|</span>
            </>
          ) : null}
          <span className="text-xs whitespace-nowrap">
            {message.messageType === 'SMS' ? (
              <>
                <Icon name="smartphone" size="1.5rem" className="align-sub mx-sm" /> Via SMS
              </>
            ) : message.messageType === 'EMAIL' ? (
              <>
                <Icon name="mail" size="1.5rem" className="align-sub mx-sm" /> Via e-post
              </>
            ) : message.messageType === 'DIGITAL_MAIL' ? (
              <>
                <Icon name="mail" size="1.5rem" className="align-sub mx-sm" /> Via digital brevlåda
              </>
            ) : message.messageType === 'WEBMESSAGE' || message.externalCaseID ? (
              <>
                <Icon name="monitor" size="1.5rem" className="align-sub mx-sm" /> Via e-tjänst
              </>
            ) : (
              ''
            )}
          </span>
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
