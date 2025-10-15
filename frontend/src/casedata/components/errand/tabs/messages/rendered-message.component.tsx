import { Role } from '@casedata/interfaces/role';
import { messageAttachment } from '@casedata/services/casedata-attachment-service';
import { getConversationAttachment } from '@casedata/services/casedata-conversation-service';
import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { MessageNode } from '@casedata/services/casedata-message-service';
import { MessageAvatar } from '@common/components/message/message-avatar.component';
import { MessageResponseDirectionEnum } from '@common/data-contracts/case-data/data-contracts';
import sanitized, { formatMessage } from '@common/services/sanitizer-service';
import { useAppContext } from '@contexts/app.context';
import { Button, cx, Icon, useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { CornerDownRight, Image, Mail, Monitor, Paperclip, Smartphone, SquareMinus, SquarePlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { RenderMessageReciever } from './render-message-reciever.component';

export const RenderedMessage: React.FC<{
  message: MessageNode;
  onSelect: (msg: MessageNode) => void;
  setShowMessageComposer: React.Dispatch<React.SetStateAction<boolean>>;
  root?: boolean;
  children: any;
}> = ({ message, onSelect, setShowMessageComposer, root = false, children }) => {
  const { user, errand, municipalityId } = useAppContext();
  const [allowed, setAllowed] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(!message?.children?.length ? true : false);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const toastMessage = useSnackbar();

  // We truncate reply messages at the first occurence of "Från: " and
  // the first "-----Ursprungligt meddelande-----" line, so that only the
  // last message body is shown.
  let answerMessage = message.message;
  const hasInReplyToWithValue = message.emailHeaders?.some((headerObj) => headerObj.header === 'IN_REPLY_TO');
  if (hasInReplyToWithValue) {
    const marker = '<p>-----Ursprungligt meddelande-----</p>';
    const firstIndex = message.message.indexOf(marker);
    const secondIndex = message.message.indexOf(marker, firstIndex + marker.length);

    if (secondIndex !== -1) {
      answerMessage = message.message.slice(0, secondIndex);
    }
  }
  const getSender = (msg: MessageNode) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName} ${msg.lastName}` : msg?.email ? msg.email : '(okänd avsändare)';

  const getMessageOwner = (msg: MessageNode) => {
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
        className={cx('rounded-4 m-0 py-sm px-sm text-md hover:bg-background-color-mixin-1')}
        data-cy={`node-${message?.emailHeaders?.[0]?.values || message?.messageId}`}
      >
        <div className="relative flex gap-md items-start justify-between">
          <div className="flex w-full">
            <MessageAvatar message={message} />
            <div className="w-5/6 ml-sm">
              <div className="my-0 flex justify-between">
                <div>
                  {!root ? <CornerDownRight size={16} className="mr-sm" /> : null}
                  <p
                    className={cx(`mr-md break-all text-small font-bold`)}
                    dangerouslySetInnerHTML={{
                      __html: `Från: ${sanitized(getSender(message))}`,
                    }}
                  ></p>
                  <p className="mr-md break-all font-bold">
                    Till: <RenderMessageReciever selectedMessage={message} errand={errand} />
                  </p>
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
              {message.attachments?.length > 0 ? (
                <>
                  <div className="mx-sm inline-flex items-center gap-xs">
                    <Paperclip size="1.5rem" />
                    <span className="text-xs">{message.attachments?.length}</span>
                  </div>
                  <span className="text-xs mx-sm">|</span>
                </>
              ) : null}
              <span className="flex text-xs whitespace-nowrap items-center">
                {(() => {
                  switch (message.messageType) {
                    case 'SMS':
                      return (
                        <>
                          <Smartphone size="1.5rem" className="align-sub mx-sm" /> Via SMS
                        </>
                      );
                    case 'EMAIL':
                      return (
                        <>
                          <Mail size="1.5rem" className="align-sub mx-sm" /> Via e-post
                        </>
                      );
                    case 'DIGITAL_MAIL':
                      return (
                        <>
                          <Mail size="1.5rem" className="align-sub mx-sm" /> Via digital brevlåda
                        </>
                      );
                    case 'WEB_MESSAGE':
                      return (
                        <>
                          <Monitor size="1.5rem" className="align-sub mx-sm" /> via e-tjänst
                        </>
                      );
                    case 'DRAKEN':
                      return (
                        <>
                          <Monitor size="1.5rem" className="align-sub mx-sm" /> Via Draken
                        </>
                      );
                    case 'MINASIDOR':
                      return (
                        <>
                          <Monitor size="1.5rem" className="align-sub mx-sm" /> Via Mina sidor
                        </>
                      );
                    default:
                      return '';
                  }
                })()}
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
                setExpanded(!expanded);
                !expanded && onSelect(message);
              }}
            >
              <Icon icon={expanded ? <SquareMinus /> : <SquarePlus />} />
            </Button>
          </div>
        </div>

        <div className="pl-xl flex justify-between items-start">
          <p
            className={cx(`my-0 text-primary`, message.viewed ? 'font-normal' : 'font-bold')}
            dangerouslySetInnerHTML={{
              __html: sanitized(message.subject || ''),
            }}
          ></p>
          {expanded &&
          (message.messageType === 'EMAIL' ||
            message.messageType === 'WEB_MESSAGE' ||
            message.messageType === 'DRAKEN' ||
            message.messageType === 'MINASIDOR') ? (
            <Button
              type="button"
              className="self-start"
              color="vattjom"
              disabled={isErrandLocked(errand) || !allowed}
              size="sm"
              variant="primary"
              onClick={() => {
                onSelect(message);
                setShowMessageComposer(true);
              }}
            >
              {message?.direction === 'INBOUND' ? 'Svara' : 'Följ upp'}
            </Button>
          ) : null}
        </div>
        <div
          className={`message-${message.messageId} px-xl ${
            expanded ? '' : 'max-h-0 overflow-hidden'
          } transition-[max-height] ease-in-out`}
        >
          {message?.attachments?.length > 0 ? (
            <ul className="flex flex-wrap gap-sm items-center my-12">
              <Icon icon={<Paperclip />} size="1.6rem" />
              {message?.attachments?.map((a, idx) => (
                <Button
                  key={`${a.fileName}-${idx}`}
                  onClick={() => {
                    if (message.conversationId) {
                      getConversationAttachment(
                        municipalityId,
                        errand.id,
                        message.conversationId,
                        message.messageId,
                        a.attachmentId
                      )
                        .then((res) => {
                          if (res.data.length !== 0) {
                            const uri = `data:${a.contentType};base64,${res.data}`;
                            const link = document.createElement('a');
                            const filename = a.name;
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
                    } else {
                      messageAttachment(municipalityId, errand.id, message.messageId, a.attachmentId)
                        .then((res) => {
                          if (res.data.length !== 0) {
                            const uri = `data:${a.contentType};base64,${res.data}`;
                            const link = document.createElement('a');
                            const filename = a.name;
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
                    }
                  }}
                  role="listitem"
                  // eslint-disable-next-line jsx-a11y/alt-text
                  leftIcon={a?.name?.endsWith('pdf') ? <Icon icon={<Paperclip />} /> : <Icon icon={<Image />} />}
                  variant="tertiary"
                >
                  {a.name}
                </Button>
              ))}
            </ul>
          ) : null}
          <div className="my-18">
            <span
              className="text"
              dangerouslySetInnerHTML={{
                __html: message.htmlMessage ? message.htmlMessage : formatMessage(sanitized(message.message)),
              }}
            />
          </div>
        </div>
      </div>
      <div className="ml-lg">{children}</div>
    </>
  );
};
