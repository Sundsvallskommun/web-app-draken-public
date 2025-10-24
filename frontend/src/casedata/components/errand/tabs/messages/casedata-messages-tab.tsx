import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import {
  MessageNode,
  fetchMessages,
  fetchMessagesTree,
  setMessageViewStatus,
} from '@casedata/services/casedata-message-service';
import { useAppContext } from '@common/contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Divider, FormLabel, Select, useSnackbar } from '@sk-web-gui/react';
import React, { useEffect, useState } from 'react';
import { MessageResponse } from 'src/data-contracts/backend/data-contracts';
import { MessageComposer } from './message-composer.component';
import MessageTreeComponent from './tree.component';

export const CasedataMessagesTab: React.FC<{
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const { errand, messages, messageTree, setMessages, setMessageTree, conversation, conversationTree, user } =
    useAppContext();
  const [selectedMessage, setSelectedMessage] = useState<MessageNode>();
  const [showMessageComposer, setShowMessageComposer] = useState<boolean>(false);
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
      setMessageViewStatus(errand.id.toString(), msg.messageId, true)
        .then(() =>
          fetchMessagesTree(errand).catch(() => {
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
          fetchMessages(errand).catch(() => {
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
              return message.messageType === 'MINASIDOR';
            case 5:
              return message.messageType === 'SMS';
            case 6:
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
                return node.messageType === 'MINASIDOR';
              case 5:
                return node.messageType === 'SMS';
              case 6:
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
              <Select.Option value={4}>Mina sidor</Select.Option>
              <Select.Option value={5}>SMS</Select.Option>
              <Select.Option value={6}>E-tjänst</Select.Option>
            </Select>
          </div>
        </div>
        {combinedMessages?.length ? (
          <MessageTreeComponent
            nodes={sortedMessages}
            onSelect={(msg: MessageResponse) => {
              setMessageViewed(msg);
              setSelectedMessage(msg);
            }}
            setShowMessageComposer={setShowMessageComposer}
          />
        ) : (
          <>
            <Divider className="pt-24" />
            <p className="pt-24 text-dark-disabled">Inga meddelanden</p>
          </>
        )}
      </div>
      <div className="h-xl"></div>
      <MessageComposer
        message={selectedMessage}
        show={showMessageComposer}
        closeHandler={() => {
          setTimeout(() => {
            setShowMessageComposer(false);
            setSelectedMessage(undefined);
          }, 0);
        }}
        setUnsaved={props.setUnsaved}
        update={props.update}
      />
    </>
  );
};
