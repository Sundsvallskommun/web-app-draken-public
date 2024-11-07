import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { fetchMessages, fetchMessagesTree, setMessageViewStatus } from '@casedata/services/casedata-message-service';
import { useAppContext } from '@common/contexts/app.context';
import { ErrandMessageResponse } from '@common/interfaces/message';
import sanitized from '@common/services/sanitizer-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Button, Divider, Icon, RadioButton, cx, useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { MessageComposer } from './message-composer.component';
import { MessageWrapper } from './message-wrapper.component';
import MessageTreeComponent from './tree.component';

export const CasedataMessagesTab: React.FC<{
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const { municipalityId, errand, messages, messageTree, setMessages, setMessageTree, user } = useAppContext();
  const [selectedMessage, setSelectedMessage] = useState<ErrandMessageResponse>();
  const [showSelectedMessage, setShowSelectedMessage] = useState(false);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [sortMessages, setSortMessages] = useState<number>(0);
  const [sortedMessages, setSortedMessages] = useState(messages);
  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user) && !!errand.administrator;
    setAllowed(_a);
  }, [user, errand]);

  const setMessageViewed = (msg: ErrandMessageResponse) => {
    setMessageViewStatus(municipalityId, msg.messageID, true)
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
  };

  const getSender = (msg: ErrandMessageResponse) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName} ${msg.lastName}` : msg?.email ? msg.email : '(okänd avsändare)';

  const getSenderInitials = (msg: ErrandMessageResponse) =>
    msg?.firstName && msg?.lastName ? `${msg.firstName?.[0]}${msg.lastName?.[0]}` : '@';

  /* const getMessageType = (msg: ErrandMessageResponse) =>
    msg?.messageType === 'EMAIL' ? 'E-post' : msg?.messageType === 'SMS' ? 'Sms' : '';
*/
  const getMessageType = (msg: ErrandMessageResponse) => {
    if (msg?.messageType === 'WEBMESSAGE' || msg?.externalCaseID) {
      return (
        <>
          <Icon icon={<LucideIcon name="monitor" />} size="1.5rem" className="my-1" /> Via e-tjänst
        </>
      );
    } else if (msg?.messageType === 'SMS') {
      return (
        <>
          <Icon icon={<LucideIcon name="smartphone" />} size="1.5rem" className="my-1" /> Via SMS
        </>
      );
    } else {
      return (
        <>
          <Icon icon={<LucideIcon name="mail" />} size="1.5rem" className="my-1" /> Via e-post
        </>
      );
    }
  };

  const messageAvatar = (message: ErrandMessageResponse) => (
    <div className="w-[4rem]" data-cy="message-avatar">
      <Avatar rounded color="juniskar" size="md" initials={getSenderInitials(message)} />
    </div>
  );

  useEffect(() => {
    if (messages && messageTree) {
      if (sortMessages === 1) {
        let filteredMessages = messages.filter((message: ErrandMessageResponse) => message.direction === 'INBOUND');
        setSortedMessages(filteredMessages);
      } else if (sortMessages === 2) {
        let filteredMessages = messages.filter((message: ErrandMessageResponse) => message.direction === 'OUTBOUND');
        setSortedMessages(filteredMessages);
      } else {
        setSortedMessages(messageTree);
      }
    }
  }, [messages, messageTree, sortMessages]);

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

        <RadioButton.Group inline className="mt-16">
          <RadioButton value={0} defaultChecked={true} onChange={() => setSortMessages(0)}>
            Alla
          </RadioButton>
          <RadioButton value={1} onChange={() => setSortMessages(1)}>
            Mottagna
          </RadioButton>
          <RadioButton value={2} onChange={() => setSortMessages(2)}>
            Skickade
          </RadioButton>
        </RadioButton.Group>

        {sortedMessages?.length ? (
          <MessageTreeComponent
            nodes={sortedMessages}
            selected={selectedMessage?.messageID}
            onSelect={(msg: ErrandMessageResponse) => {
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
                        <strong>Till: </strong>
                      </p>
                      <div className="flex text-small gap-16">
                        {dayjs(selectedMessage?.sent).format('YYYY-MM-DD HH:mm')}
                        <Divider className="m-2" orientation="vertical" />
                        {getMessageType(selectedMessage)}
                      </div>
                    </div>
                  </div>
                  {selectedMessage?.direction === 'INBOUND' &&
                  (selectedMessage.messageType === 'EMAIL' || selectedMessage.messageType === 'WEBMESSAGE') ? (
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
                        onClick={() => {}}
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
