import { MessageResponseDirectionEnum } from '@common/data-contracts/case-data/data-contracts';
import sanitized from '@common/services/sanitizer-service';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { CornerDownRight, Mail, Monitor, Paperclip, Smartphone, SquareMinus, SquarePlus, Image } from 'lucide-react';
import { Avatar, Button, cx, Icon, useSnackbar } from '@sk-web-gui/react';
import { isSupportErrandLocked, validateAction } from '@supportmanagement/services/support-errand-service';
import {
  getMessageAttachment,
  Message,
  setMessageViewStatus,
} from '@supportmanagement/services/support-message-service';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';

export const getSender = (msg: Message) => {
  if (!msg) {
    return '';
  }
  if (msg.communicationType === 'WEB_MESSAGE') {
    return msg.direction === 'OUTBOUND' ? 'Draken' : msg.sender || 'OpenE';
  }
  return msg?.sender || '(okänd avsändare)';
};

export const getReciever = (msg: Message) => {
  if (!msg) {
    return '';
  }
  if (msg.communicationType === 'WEB_MESSAGE') {
    return msg.direction === 'INBOUND' ? 'Draken' : 'OpenE';
  }
  return msg?.target || '(okänd mottagare)';
};

export const RenderedSupportMessage: React.FC<{
  update: () => void;
  setRichText: React.Dispatch<React.SetStateAction<string>>;
  setShowMessageForm: React.Dispatch<React.SetStateAction<boolean>>;
  richText: string;
  emailBody: string;
  message: Message;
  selected: string;
  onSelect: (msg: Message) => void;
  root?: boolean;
  children: any;
}> = ({ update, setShowMessageForm, message, onSelect, root = false, children }) => {
  const { supportErrand, municipalityId, user }: AppContextInterface = useAppContext();
  const [allowed, setAllowed] = useState(false);
  const [expanded, setExpanded] = useState(message.communicationType === 'WEB_MESSAGE' ? true : false);

  useEffect(() => {
    const _a = validateAction(supportErrand, user);
    setAllowed(_a);
  }, [user, supportErrand]);

  const toastMessage = useSnackbar();

  // We truncate reply messages at the first occurence of "Från: " and
  // the first "-----Ursprungligt meddelande-----" line, so that only the
  // last message body is shown.
  const answerMessage =
    Array.isArray(message.emailHeaders.IN_REPLY_TO) &&
    // message.messageBody.split('Från: ')[0].split('-----Ursprungligt')[0];
    message.messageBody.replace(/\<br\>\<br\>\<br\>\<br\>/g, '<p><br></p>');

  const messageAvatar = (message: Message) => (
    <Avatar rounded color={message.direction === 'OUTBOUND' ? 'juniskar' : 'bjornstigen'} size={'md'} initials={'NN'} />
  );

  const getMessageOwner = (msg: Message) => {
    if (msg.direction === MessageResponseDirectionEnum.INBOUND) {
      const ownerInfomration = supportErrand.stakeholders.filter((stakeholder) => stakeholder.role.includes('PRIMARY'));
      const isWebMessageOpenE = msg.communicationType === 'WEB_MESSAGE';
      const isOwnerStakeholderEmail = ownerInfomration.some((stakeholder) =>
        stakeholder.contactChannels.some((value) => value.value === msg.sender)
      );

      if (isWebMessageOpenE || isOwnerStakeholderEmail) {
        return <span className="text-xs whitespace-nowrap">Ärendeägare</span>;
      }
    }
  };

  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  useEffect(() => {
    if (!message.viewed && supportErrand.assignedUserId === user.username) {
      expanded &&
        isInViewport(document.querySelector(`.message-${message.communicationID}`)) &&
        setMessageViewStatus(supportErrand.id, municipalityId, message.communicationID, true).then(() => {
          update();
        });
    }
  }, [message, supportErrand]);

  return (
    <>
      <div
        data-cy={`message-${message.communicationID}`}
        key={`message-${message.communicationID}`}
        className={cx(
          `rounded-4 m-0 py-sm px-sm text-md hover:bg-background-color-mixin-1
          }`
        )}
      >
        <div className="relative flex gap-md items-start justify-between">
          <div className="flex w-full">
            {messageAvatar(message)}
            <div className="w-5/6 ml-sm">
              <div className="my-0 flex justify-between">
                <div>
                  {!root ? <Icon size={16} className="mr-sm" icon={<CornerDownRight />} /> : null}
                  <p
                    className={cx(`mr-md break-all text-small font-bold`)}
                    dangerouslySetInnerHTML={{
                      __html: `Från: ${sanitized(getSender(message))}`,
                    }}
                  ></p>
                  <p
                    className={cx(`mr-md break-all font-bold`)}
                    dangerouslySetInnerHTML={{
                      __html: `Till: ${sanitized(getReciever(message))}`,
                    }}
                  ></p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col align-end items-end justify-between mt-4">
            <div className="inline-flex items-start flex-nowrap">
              <span className="text-xs whitespace-nowrap">
                {message.sent ? dayjs(message.sent).format('YYYY-MM-DD HH:mm') : 'Datum saknas'}
              </span>
              <span className="text-xs mx-sm">|</span>
              {message.communicationAttachments?.length > 0 ? (
                <>
                  <div className="mx-sm inline-flex items-center gap-xs">
                    <Icon icon={<Paperclip />} size="1.5rem" />
                    <span className="text-xs">{message.communicationAttachments?.length}</span>
                  </div>
                  <span className="text-xs mx-sm">|</span>
                </>
              ) : null}
              <span className="flex text-xs whitespace-nowrap items-center">
                {message.communicationType === 'SMS' ? (
                  <>
                    <Icon icon={<Smartphone />} size="1.5rem" className="align-sub mx-sm" /> Via SMS
                  </>
                ) : message.communicationType === 'EMAIL' ? (
                  <>
                    <Icon icon={<Mail />} size="1.5rem" className="align-sub mx-sm" /> Via e-post
                  </>
                ) : message.communicationType === 'WEB_MESSAGE' ? (
                  <>
                    <Icon icon={<Monitor />} size="1.5rem" className="align-sub mx-sm" /> Via e-tjänst
                  </>
                ) : (
                  ''
                )}
              </span>
            </div>
            {getMessageOwner(message)}
          </div>
          <div className="flex gap-8">
            <span
              className={cx(
                message.viewed ? 'bg-gray-200' : `bg-vattjom-surface-primary`,
                `self-center w-12 h-12 my-xs rounded-full flex items-center justify-center text-lg`
              )}
            ></span>
            <Button
              variant="ghost"
              iconButton
              size="sm"
              onClick={() => {
                setExpanded(expanded ? false : true);
                !expanded && onSelect(message);
              }}
            >
              <Icon icon={expanded ? <SquareMinus /> : <SquarePlus />} />
            </Button>
          </div>
        </div>
        <div className="pl-xl flex justify-between items-end">
          <p
            className={cx(`my-0 text-primary`, message.viewed ? 'font-normal' : 'font-bold')}
            dangerouslySetInnerHTML={{
              __html: sanitized(message.subject || ''),
            }}
          ></p>
          {message?.direction === 'INBOUND' &&
          (message.communicationType === 'EMAIL' || message.communicationType === 'WEB_MESSAGE') ? (
            <Button
              type="button"
              className="self-start"
              color="vattjom"
              disabled={isSupportErrandLocked(supportErrand) || !allowed}
              size="sm"
              variant="primary"
              onClick={async () => {
                await onSelect(message);
                setTimeout(() => {
                  setShowMessageForm(true);
                }, 0);
              }}
            >
              Svara
            </Button>
          ) : null}
        </div>

        <div
          className={`message-${message.communicationID} px-xl ${
            expanded ? 'max-h-[400vh]' : 'max-h-0 overflow-hidden'
          } transition-[max-height] ease-in-out`}
        >
          {message?.communicationAttachments.length > 0 ? (
            <ul className="flex flex-wrap gap-sm items-center my-12">
              <Icon icon={<Paperclip />} size="1.6rem" />
              {message?.communicationAttachments?.map((a, idx) => (
                <Button
                  key={`${a.fileName}-${idx}`}
                  onClick={() => {
                    getMessageAttachment(municipalityId, supportErrand.id, message.communicationID, a.id)
                      .then((res) => {
                        if (res.data) {
                          const uri = `data:${a.mimeType};base64,${res.data}`;
                          const link = document.createElement('a');
                          const filename = a.fileName;
                          link.href = uri;
                          link.setAttribute('download', filename);
                          document.body.appendChild(link);
                          link.click();
                        } else {
                          toastMessage({
                            position: 'bottom',
                            closeable: false,
                            message: 'Filen kan inte hittas eller är skadad.',
                            status: 'error',
                          });
                        }
                      })
                      .catch((error) => {
                        toastMessage({
                          position: 'bottom',
                          closeable: false,
                          message: 'Något gick fel när bilagan skulle hämtas',
                          status: 'error',
                        });
                      });
                  }}
                  role="listitem"
                  // eslint-disable-next-line jsx-a11y/alt-text
                  leftIcon={a.fileName.endsWith('pdf') ? <Icon icon={<Paperclip />} /> : <Icon icon={<Image />} />}
                  variant="tertiary"
                >
                  {a.fileName}
                </Button>
              ))}
            </ul>
          ) : null}
          <div className="my-18">
            {Array.isArray(message.emailHeaders.IN_REPLY_TO) ? (
              <p
                className="my-0 [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:ml-lg [&>ol]:ml-lg"
                dangerouslySetInnerHTML={{
                  __html: sanitized(answerMessage.toString() || ''),
                }}
              ></p>
            ) : (
              <p
                className="my-0 [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:ml-lg [&>ol]:ml-lg"
                dangerouslySetInnerHTML={{
                  __html: sanitized(message?.messageBody || ''),
                }}
              ></p>
            )}
          </div>
        </div>
      </div>
      <div className="ml-lg">{children}</div>
    </>
  );
};
