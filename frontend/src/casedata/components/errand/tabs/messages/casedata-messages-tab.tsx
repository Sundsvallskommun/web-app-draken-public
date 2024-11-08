import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { fetchMessagesTree, setMessageViewStatus } from '@casedata/services/casedata-message-service';
import { useAppContext } from '@common/contexts/app.context';
import { ErrandMessageResponse } from '@common/interfaces/message';
import sanitized from '@common/services/sanitizer-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Button, Divider, cx, useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { MessageComposer } from './message-composer.component';
import { MessageWrapper } from './message-wrapper.component';
import MessageTreeComponent from './tree.component';

export const CasedataMessagesTab: React.FC<{
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const { municipalityId, errand, messages, setMessages, user } = useAppContext();
  const [selectedMessage, setSelectedMessage] = useState<ErrandMessageResponse>();
  const [showSelectedMessage, setShowSelectedMessage] = useState(false);
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user) && !!errand.administrator;
    setAllowed(_a);
  }, [user, errand]);

  const setMessageViewed = (msg: ErrandMessageResponse) => {
    setMessageViewStatus(errand.id, municipalityId, msg.messageID, true)
      .then(() =>
        fetchMessagesTree(municipalityId, errand).catch((e) => {
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
    msg?.firstName && msg?.lastName ? `${msg.firstName?.[0]}${msg.lastName?.[0]}` : '?';

  const getMessageType = (msg: ErrandMessageResponse) =>
    msg?.messageType === 'EMAIL' ? 'E-post' : msg?.messageType === 'SMS' ? 'Sms' : '';

  const messageAvatar = (message: ErrandMessageResponse) => (
    <div className="w-[4rem]" data-cy="message-avatar">
      <Avatar rounded color="juniskar" size="md" initials={getSenderInitials(message)} />
    </div>
  );

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
        {messages?.length ? (
          <MessageTreeComponent
            nodes={messages}
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
            <Divider className="pt-16" />
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
                  <div className={cx(`relative flex gap-md items-center justify-start pr-lg text-md`)}>
                    {messageAvatar(selectedMessage)}
                    <div>
                      <p className="my-0">
                        <strong
                          className="mr-md"
                          dangerouslySetInnerHTML={{
                            __html: sanitized(getSender(selectedMessage)),
                          }}
                          data-cy="sender"
                        ></strong>
                      </p>
                      <p className="my-0">
                        {dayjs(selectedMessage?.sent).format('YYYY-MM-DD HH:mm')} {getMessageType(selectedMessage)}
                      </p>
                    </div>
                  </div>
                  {selectedMessage?.direction === 'INBOUND' &&
                  (selectedMessage.messageType === 'EMAIL' || selectedMessage.messageType === 'WEBMESSAGE') ? (
                    <Button
                      type="button"
                      color="vattjom"
                      disabled={isErrandLocked(errand) || !allowed}
                      size="sm"
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
