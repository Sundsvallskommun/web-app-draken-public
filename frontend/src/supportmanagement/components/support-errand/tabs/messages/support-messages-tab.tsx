import { MessageWrapper } from '@common/components/message/message-wrapper.component';
import { CommunicationCommunicationTypeEnum } from '@common/data-contracts/supportmanagement/data-contracts';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { Button, Divider, FormControl, FormLabel, Icon, Select } from '@sk-web-gui/react';
import { isSupportErrandLocked, Status, validateAction } from '@supportmanagement/services/support-errand-service';
import { Message, setMessageViewStatus } from '@supportmanagement/services/support-message-service';
import { Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import React, { useMemo, useState } from 'react';
import { SupportMessageForm } from '../../../support-message-form/support-message-form.component';
import MessageTreeComponent from './support-messages-tree.component';

export const SupportMessagesTab: React.FC<{
  messages: Message[];
  messageTree: Message[];
  supportConversations: Message[];
  conversationMessageTree: Message[];
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  municipalityId: string;
}> = (props) => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const user = useUserStore((s) => s.user);
  const [showMessageForm, setShowMessageForm] = useState<boolean>(false);
  const [selectedMessage, setSelectedMessage] = useState<Message>();
  const [sortSendingTypeMessages, setSortSendingTypeMessages] = useState<string>('ALL_SEND_TYPES');
  const [sortChannelMessages, setSortChannelMessages] = useState<string>('all channels');
  const { t } = useTranslation();

  const allMessages = useMemo(
    () => [...(props.messages || []), ...(props.supportConversations || [])],
    [props.messages, props.supportConversations]
  );

  const allMessagesTree = useMemo(
    () => [...(props.messageTree || []), ...(props.conversationMessageTree || [])],
    [props.messageTree, props.conversationMessageTree]
  );

  const allowed = useMemo(() => supportErrand ? validateAction(supportErrand, user) : false, [user, supportErrand]);

  const onSelect = (message: Message) => {
    if (message.conversationId && message.conversationId !== '') {
      console.warn('Not implemented');
      props.update();
    } else if (!message.viewed && supportErrand?.assignedUserId === user.username) {
      setMessageViewStatus(supportErrand!.id!, municipalityId, message.communicationID, true).then(() => {
        props.update();
      });
    }

    setSelectedMessage(message);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 0);
    });
  };

  const sortedMessages = useMemo(() => {
    if (!allMessages || !allMessagesTree) return [];

    // Apply channel filter
    if (sortChannelMessages !== 'allchannels' && sortChannelMessages !== 'all channels') {
      const filteredMessages = allMessages.filter(
        (message: Message) =>
          message.communicationType === sortChannelMessages &&
          (sortSendingTypeMessages === 'ALL_SEND_TYPES' ? true : message.direction === sortSendingTypeMessages)
      );

      if (sortSendingTypeMessages !== 'INBOUND' && sortSendingTypeMessages !== 'OUTBOUND') {
        const filteredMessageTree = allMessagesTree.filter((m) =>
          filteredMessages.find((x) => x.communicationType === m.communicationType)
        );
        return filteredMessageTree;
      }

      return filteredMessages;
    }

    // No channel filter, apply direction filter
    if (sortSendingTypeMessages === 'INBOUND' || sortSendingTypeMessages === 'OUTBOUND') {
      return allMessages.filter((message: Message) => message.direction === sortSendingTypeMessages);
    }

    return allMessagesTree;
  }, [allMessages, allMessagesTree, sortSendingTypeMessages, sortChannelMessages]);

  return (
    <>
      <div className="w-full py-40 px-48 gap-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <div className="inline-flex mt-ms gap-lg justify-start items-center flex-wrap">
            <h2 className="text-h2-md">Meddelanden</h2>
          </div>
          <Button
            data-cy="new-message-button"
            type="button"
            disabled={isSupportErrandLocked(supportErrand!) || !allowed || supportErrand?.status === Status.NEW}
            size="sm"
            variant="primary"
            color="vattjom"
            inverted={!(isSupportErrandLocked(supportErrand!) || !allowed)}
            rightIcon={<Icon icon={<Mail />} size={18} />}
            onClick={() => {
              setSelectedMessage(undefined);
              setShowMessageForm(true);
            }}
          >
            Nytt meddelande
          </Button>
        </div>

        <div className="py-8 w-full gap-24">
          <p className="w-4/5 pr-16 pb-16">
            På denna sida har du möjlighet att föra dialoger och säkerställa en smidig informationsutväxling med
            ärendets olika intressenter.
          </p>
        </div>
        <div className="flex gap-24">
          <FormControl id={`show-sending-type-messages`} size="sm">
            <FormLabel>Visa</FormLabel>
            <Select onChange={(e) => setSortSendingTypeMessages(e.currentTarget.value)}>
              <Select.Option defaultChecked={true} value={'ALL_SEND_TYPES'}>
                Alla
              </Select.Option>
              <Select.Option value={'INBOUND'}>Mottagna</Select.Option>
              <Select.Option value={'OUTBOUND'}>Skickade</Select.Option>
            </Select>
          </FormControl>
          <FormControl id={`show-channel-messages`} size="sm">
            <FormLabel>Inkom via</FormLabel>
            <Select onChange={(e) => setSortChannelMessages(e.currentTarget.value)}>
              <Select.Option defaultChecked={true} value={'allchannels'}>
                Alla kanaler
              </Select.Option>
              <Select.Option value={'DRAKEN'}>Draken</Select.Option>
              <Select.Option value={CommunicationCommunicationTypeEnum.WEB_MESSAGE}>E-tjänst</Select.Option>
              <Select.Option value={CommunicationCommunicationTypeEnum.EMAIL}>E-post</Select.Option>
              <Select.Option value={'MINASIDOR'}>Mina sidor</Select.Option>
              <Select.Option value={CommunicationCommunicationTypeEnum.SMS}>SMS</Select.Option>
            </Select>
          </FormControl>
        </div>

        {sortedMessages?.length ? (
          <div data-cy="message-container">
            <MessageTreeComponent
              update={props.update}
              setShowMessageForm={setShowMessageForm}
              nodes={sortedMessages}
              selected={selectedMessage?.communicationID ?? ''}
              onSelect={(msg: Message) => {
                onSelect(msg);
              }}
            />
          </div>
        ) : (
          <>
            <Divider className="pt-16" />
            <p className="py-24 text-dark-disabled">Inga meddelanden</p>
          </>
        )}

        <MessageWrapper
          show={showMessageForm}
          label="Nytt meddelande"
          closeHandler={() => {
            setSelectedMessage(undefined);
            setShowMessageForm(false);
          }}
        >
          <SupportMessageForm
            locked={isSupportErrandLocked(supportErrand!)}
            showMessageForm={showMessageForm}
            setShowMessageForm={setShowMessageForm}
            prefillEmail={supportErrand?.customer?.[0]?.emails?.[0]?.value}
            prefillPhone={supportErrand?.customer?.[0]?.phoneNumbers?.[0]?.value}
            setUnsaved={(val) => {
              props.setUnsaved(val);
            }}
            message={selectedMessage!}
            update={props.update}
          />
        </MessageWrapper>
      </div>
    </>
  );
};
