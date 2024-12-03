import sanitized from '@common/services/sanitizer-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, cx, Icon } from '@sk-web-gui/react';
import { Message } from '@supportmanagement/services/support-message-service';
import dayjs from 'dayjs';
import React from 'react';

export const RenderedSupportMessage: React.FC<{
  message: Message;
  selected: string;
  onSelect: (msg: Message) => void;
  root?: boolean;
  children: any;
}> = ({ message, selected, onSelect, root = false, children }) => {
  const messageAvatar = (message: Message) => (
    <Avatar rounded color={message.direction === 'OUTBOUND' ? 'juniskar' : 'bjornstigen'} size={'md'} initials={'NN'} />
  );

  const getSender = (msg: Message) => msg?.sender || '(okänd avsändare)';
  const getReciever = (msg: Message) => msg?.target || '(okänd mottagare)';

  return (
    <>
      <div
        data-cy={`message-${message.communicationID}`}
        key={`message-${message.communicationID}`}
        onClick={() => {
          onSelect(message);
        }}
        className={cx(
          ` relative flex gap-md items-start justify-between rounded-4 m-0 py-sm px-sm text-md hover:bg-background-color-mixin-1 hover:cursor-pointer ${
            selected === message.communicationID ? 'bg-background-color-mixin-1 rounded-xl' : null
          }`
        )}
      >
        <div className="flex w-full">
          {messageAvatar(message)}
          <div className="w-5/6 ml-sm">
            <div className="my-0 flex justify-between">
              <div>
                {!root ? <LucideIcon size={16} className="mr-sm" name="corner-down-right" /> : null}
                <p
                  className={cx(`mr-md break-all text-small font-bold`)}
                  dangerouslySetInnerHTML={{
                    __html: `Från: ${sanitized(getSender(message))}`,
                  }}
                ></p>
                <p
                  className={cx(`mr-md break-all font-bold`)}
                  dangerouslySetInnerHTML={{
                    __html:
                      message.communicationType === 'WEB_MESSAGE' ? '' : `Till: ${sanitized(getReciever(message))}`,
                  }}
                ></p>
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
          <span className="text-xs whitespace-nowrap">
            {message.sent ? dayjs(message.sent).format('YYYY-MM-DD HH:mm') : 'Datum saknas'}
          </span>
          <span className="text-xs mx-sm">|</span>
          {message.communicationAttachments?.length > 0 ? (
            <>
              <div className="mx-sm inline-flex items-center gap-xs">
                <LucideIcon name="paperclip" size="1.5rem" />
                <span className="text-xs">{message.communicationAttachments?.length}</span>
              </div>
              <span className="text-xs mx-sm">|</span>
            </>
          ) : null}
          <span className="text-xs whitespace-nowrap">
            {message.communicationType === 'SMS' ? (
              <>
                <Icon icon={<LucideIcon name="smartphone" />} size="1.5rem" className="align-sub mx-sm" /> Via SMS
              </>
            ) : message.communicationType === 'EMAIL' ? (
              <>
                <Icon icon={<LucideIcon name="mail" />} size="1.5rem" className="align-sub mx-sm" /> Via e-post
              </>
            ) : message.communicationType === 'WEB_MESSAGE' ? (
              'Via e-tjänst'
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
