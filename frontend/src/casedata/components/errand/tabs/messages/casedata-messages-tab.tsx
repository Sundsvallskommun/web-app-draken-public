import { messageAttachment } from '@casedata/services/casedata-attachment-service';
import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import {
  fetchMessages,
  fetchMessagesTree,
  setMessageViewStatus,
  MessageNode,
} from '@casedata/services/casedata-message-service';
import { useAppContext } from '@common/contexts/app.context';
import sanitized from '@common/services/sanitizer-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Button, Divider, FormLabel, Label, RadioButton, Select, cx, useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { MessageComposer } from './message-composer.component';
import { MessageWrapper } from './message-wrapper.component';
import MessageTreeComponent from './tree.component';
import { MessageResponse } from 'src/data-contracts/backend/data-contracts';
import { getConversationAttachment } from '@casedata/services/casedata-conversation-service';

export const CasedataMessagesTab: React.FC<{
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const {
    municipalityId,
    errand,
    messages,
    messageTree,
    setMessages,
    setMessageTree,
    conversation,
    conversationTree,
    user,
  } = useAppContext();
  const [selectedMessage, setSelectedMessage] = useState<MessageNode>();
  const [showSelectedMessage, setShowSelectedMessage] = useState(false);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [sortMessages, setSortMessages] = useState<number>(0);
  const [filterSource, setFilterSource] = useState<number>(0);
  const [sortedMessages, setSortedMessages] = useState(messages);
  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);

  const combinedMessages = React.useMemo(
    () => [...(messages || []), ...(conversation || [])],
    [messages, conversation]
  );

  const combinedMessageTree = React.useMemo(
    () => [...(messageTree || []), ...(conversationTree || [])],
    [messageTree, conversationTree]
  );

  useEffect(() => {
    const _a = validateAction(errand, user) && !!errand.administrator;
    setAllowed(_a);
  }, [user, errand]);

  const setMessageViewed = (msg: MessageNode) => {
    if (msg.conversationId) {
      console.warn('Not implemented');
    } else {
      setMessageViewStatus(errand.id.toString(), municipalityId, msg.messageId, true)
        .then(() =>
          fetchMessagesTree(municipalityId, errand).catch(() => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Något gick fel när meddelanden hämtades',
              status: 'error',
            });
          })
        )
        .then(setMessageTree)
        .then(() =>
          fetchMessages(municipalityId, errand).catch(() => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Något gick fel när meddelanden hämtades',
              status: 'error',
            });
          })
        )
        .then(setMessages)
        .catch(() => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Något gick fel när meddelandets status uppdaterades',
            status: 'error',
          });
        });
    }
  };

  const getSender = (msg: MessageResponse) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName} ${msg.lastName}` : msg?.email ? msg.email : '(okänd avsändare)';

  const getSenderInitials = (msg: MessageResponse) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName?.[0]}${msg.lastName?.[0]}` : '@';

  const getMessageType = (msg: MessageResponse) => {
    if (msg?.messageType === 'WEBMESSAGE' || msg?.externalCaseId) {
      return (
        <>
          <LucideIcon name="monitor" size="1.5rem" className="my-1" /> Via e-tjänst
        </>
      );
    } else if (msg?.messageType === 'SMS') {
      return (
        <>
          <LucideIcon name="smartphone" size="1.5rem" className="my-1" /> Via SMS
        </>
      );
    } else if (msg?.messageType === 'DIGITAL_MAIL') {
      return (
        <>
          <LucideIcon name="mail" size="1.5rem" className="my-1" /> Via digital brevlåda
        </>
      );
    } else if (msg?.messageType === 'EMAIL') {
      return (
        <>
          <LucideIcon name="mail" size="1.5rem" className="my-1" /> Via e-post
        </>
      );
    } else if (msg?.messageType === 'DRAKEN') {
      return (
        <>
          <LucideIcon name="mail" size="1.5rem" className="my-1" /> Via Draken
        </>
      );
    } else {
      return <></>;
    }
  };

  const messageAvatar = (message: MessageResponse) => (
    <div className="w-[4rem]" data-cy="message-avatar">
      <Avatar rounded color="juniskar" size="md" initials={getSenderInitials(message)} />
    </div>
  );

  useEffect(() => {
    if (combinedMessages && combinedMessageTree) {
      if (sortMessages === 1) {
        let filteredMessages = combinedMessages.filter((message: MessageResponse) => message.direction === 'INBOUND');
        setSortedMessages(filteredMessages);
      } else if (sortMessages === 2) {
        let filteredMessages = combinedMessages.filter((message: MessageResponse) => message.direction === 'OUTBOUND');
        setSortedMessages(filteredMessages);
      } else {
        setSortedMessages(combinedMessageTree);
      }
    }
  }, [combinedMessages, combinedMessageTree, sortMessages]);

  useEffect(() => {
    if (combinedMessages && combinedMessageTree) {
      let filtered = combinedMessages;

      if (filterSource !== 0) {
        filtered = filtered.filter((message: MessageResponse) => {
          switch (filterSource) {
            case 1:
              return message.messageType === 'DRAKEN';
            case 2:
              return message.messageType === 'DIGITAL_MAIL';
            case 3:
              return message.messageType === 'EMAIL';
            case 4:
              return message.messageType === 'SMS';
            case 5:
              return message.messageType === 'WEBMESSAGE' || !!message.externalCaseId;
            default:
              return true;
          }
        });
      }

      if (sortMessages === 1) {
        filtered = filtered.filter((message: MessageResponse) => message.direction === 'INBOUND');
        setSortedMessages(filtered);
      } else if (sortMessages === 2) {
        filtered = filtered.filter((message: MessageResponse) => message.direction === 'OUTBOUND');
        setSortedMessages(filtered);
      } else {
        if (filterSource !== 0) {
          const filteredTree = combinedMessageTree.filter((node: MessageNode) => {
            switch (filterSource) {
              case 1:
                return node.messageType === 'DRAKEN';
              case 2:
                return node.messageType === 'DIGITAL_MAIL';
              case 3:
                return node.messageType === 'EMAIL';
              case 4:
                return node.messageType === 'SMS';
              case 5:
                return node.messageType === 'WEBMESSAGE' || !!node.externalCaseId;
              default:
                return true;
            }
          });
          setSortedMessages(filteredTree);
        } else {
          setSortedMessages(combinedMessageTree);
        }
      }
    }
  }, [combinedMessages, combinedMessageTree, sortMessages, filterSource]);

  return (
    <>
      <div className="w-full py-24 px-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <div className="inline-flex mt-ms gap-lg justify-start items-center flex-wrap">
            <h2 className="text-h4-sm md:text-h4-md">Meddelanden</h2>
          </div>
          <Button
            type="button"
            disabled={isErrandLocked(errand) || !allowed}
            size="sm"
            variant="primary"
            color="vattjom"
            inverted={!(isErrandLocked(errand) || !allowed)}
            rightIcon={<LucideIcon name="mail" size={18} />}
            onClick={() => {
              setSelectedMessage(undefined);
              setShowMessageComposer(true);
            }}
            data-cy="new-message-button"
          >
            Nytt meddelande
          </Button>
        </div>
        <div className="py-8 w-full gap-24">
          <p className="w-4/5 pr-16">
            På denna sida har du möjlighet att föra dialoger och säkerställa en smidig informationsutväxling med
            ärendets olika intressenter.
          </p>
        </div>

        <div className="flex flex-row gap-30">
          <div className="flex flex-col">
            <FormLabel>Visa</FormLabel>
            <Select
              className="w-[16rem]"
              size="sm"
              aria-label="Välj ett sorteringsalternativ"
              value={sortMessages.toString()}
              onChange={(e) => setSortMessages(Number(e.target.value))}
            >
              <Select.Option value={0}>Alla</Select.Option>
              <Select.Option value={1}>Mottagna</Select.Option>
              <Select.Option value={2}>Skickade</Select.Option>
            </Select>
          </div>
          <div className="flex flex-col">
            <FormLabel>Inkom via</FormLabel>
            <Select
              className="w-[16rem]"
              size="sm"
              aria-label="Välj källa"
              value={filterSource.toString()}
              onChange={(e) => setFilterSource(Number(e.target.value))}
            >
              <Select.Option value={0}>Alla</Select.Option>
              <Select.Option value={1}>Draken</Select.Option>
              <Select.Option value={2}>Digital brevlåda</Select.Option>
              <Select.Option value={3}>E-post</Select.Option>
              <Select.Option value={4}>SMS</Select.Option>
              <Select.Option value={5}>E-tjänst</Select.Option>
            </Select>
          </div>
        </div>
        {combinedMessages?.length ? (
          <MessageTreeComponent
            nodes={sortedMessages}
            selected={selectedMessage?.messageId}
            onSelect={(msg: MessageResponse) => {
              setMessageViewed(msg);
              setSelectedMessage(msg);
              setShowMessageComposer(false);
              setShowSelectedMessage(true);
            }}
          />
        ) : (
          <>
            <Divider className="pt-24" />
            <p className="pt-24 text-dark-disabled">Inga meddelanden</p>
          </>
        )}

        <MessageWrapper
          label="Meddelande"
          closeHandler={() => {
            setSelectedMessage(undefined);
            setShowSelectedMessage(false);
          }}
          show={showSelectedMessage}
        >
          <div className="my-md py-8 px-40">
            <div>
              <div className="relative">
                <div className="flex justify-between items-center my-12">
                  <div className={cx(`relative flex gap-md justify-start pr-lg text-md`)}>
                    {messageAvatar(selectedMessage)}
                    <div>
                      <p className="text-small my-0">
                        <strong>Från: </strong>
                        <strong
                          className="mr-md"
                          dangerouslySetInnerHTML={{
                            __html: sanitized(getSender(selectedMessage)),
                          }}
                          data-cy="sender"
                        ></strong>
                      </p>
                      <p>
                        <strong>Till: </strong>{' '}
                        {selectedMessage?.messageType === 'EMAIL'
                          ? selectedMessage?.recipients.join(', ')
                          : selectedMessage?.messageType === 'SMS'
                          ? selectedMessage?.mobileNumber
                          : selectedMessage?.messageType === 'WEBMESSAGE' || selectedMessage?.externalCaseId
                          ? 'E-tjänst'
                          : ''}
                      </p>
                      <div className="flex text-small gap-16">
                        {dayjs(selectedMessage?.sent).format('YYYY-MM-DD HH:mm')}
                        <Divider className="m-2" orientation="vertical" />
                        {getMessageType(selectedMessage)}
                      </div>
                    </div>
                  </div>
                  {(selectedMessage?.direction === 'INBOUND' &&
                    (selectedMessage.messageType === 'EMAIL' || selectedMessage.messageType === 'WEBMESSAGE')) ||
                  selectedMessage?.conversationId ? (
                    <Button
                      type="button"
                      disabled={isErrandLocked(errand) || !allowed}
                      size="md"
                      variant="primary"
                      onClick={() => {
                        setSelectedMessage(selectedMessage);
                        setShowMessageComposer(true);
                        setShowSelectedMessage(false);
                      }}
                      data-cy="respond-button"
                    >
                      Svara
                    </Button>
                  ) : null}
                </div>
                {selectedMessage?.attachments.length > 0 ? (
                  <ul className="flex flex-row gap-sm items-center my-12">
                    <LucideIcon name="paperclip" size="1.6rem" />
                    {selectedMessage?.attachments?.map((a, idx) => (
                      <Button
                        key={`${a.name}-${idx}`}
                        onClick={() => {
                          if (selectedMessage.conversationId) {
                            getConversationAttachment(
                              municipalityId,
                              errand.id,
                              selectedMessage.conversationId,
                              selectedMessage.messageId,
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
                            messageAttachment(municipalityId, errand.id, selectedMessage.messageId, a.attachmentId)
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
                        leftIcon={
                          a.name.endsWith('pdf') ? <LucideIcon name="paperclip" /> : <LucideIcon name="image" />
                        }
                        variant="tertiary"
                        data-cy={`message-attachment-${idx}`}
                      >
                        {a.name}
                      </Button>
                    ))}
                  </ul>
                ) : null}
                <div className="my-18">
                  <strong
                    className="text-primary"
                    dangerouslySetInnerHTML={{
                      __html: sanitized(selectedMessage?.subject || ''),
                    }}
                    data-cy="message-subject"
                  ></strong>
                  <p
                    className="my-0 [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:ml-lg [&>ol]:ml-lg"
                    dangerouslySetInnerHTML={{
                      __html: sanitized(selectedMessage?.message || ''),
                    }}
                    data-cy="message-body"
                  ></p>
                </div>
              </div>
            </div>
          </div>
        </MessageWrapper>
      </div>
      <div className="h-xl"></div>
      <MessageComposer
        message={selectedMessage}
        show={showMessageComposer}
        closeHandler={() => {
          setTimeout(() => {
            setShowMessageComposer(false);
            setShowSelectedMessage(false);
            setSelectedMessage(undefined);
          }, 0);
        }}
        setUnsaved={props.setUnsaved}
        update={props.update}
      />
    </>
  );
};
