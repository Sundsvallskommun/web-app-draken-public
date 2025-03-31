import { MessageWrapper } from '@casedata/components/errand/tabs/messages/message-wrapper.component';
import { isIK, isKC, isLOP } from '@common/services/application-service';
import { useAppContext } from '@contexts/app.context';
import { Mail } from 'lucide-react';
import { Button, Divider, FormControl, FormLabel, Icon, Select } from '@sk-web-gui/react';
import { isSupportErrandLocked, validateAction, Status } from '@supportmanagement/services/support-errand-service';
import { Message, setMessageViewStatus } from '@supportmanagement/services/support-message-service';
import React, { useEffect, useState } from 'react';
import { SupportMessageForm } from '../../../support-message-form/support-message-form.component';
import MessageTreeComponent from './support-messages-tree.component';
import { CommunicationCommunicationTypeEnum } from '@common/data-contracts/supportmanagement/data-contracts';

export const SupportMessagesTab: React.FC<{
  messages: Message[];
  messageTree: Message[];
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  municipalityId: string;
}> = (props) => {
  const { supportErrand, municipalityId, user } = useAppContext();
  const [showMessageForm, setShowMessageForm] = useState<boolean>(false);
  const [selected, setSelected] = useState<string>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message>();
  const [showSelectedMessage, setShowSelectedMessage] = useState<boolean>();
  const [allowed, setAllowed] = useState(false);
  const [richText, setRichText] = useState<string>('');
  const [sortSendingTypeMessages, setSortSendingTypeMessages] = useState<string>('ALL_SEND_TYPES');
  const [sortChannelMessages, setSortChannelMessages] = useState<string>('all channels');
  const [sortedMessages, setSortedMessages] = useState(props.messages);

  const emailBody = `${
    isLOP()
      ? `Hej,<br><br>Tack för att du kontaktar oss.<br><br><br><br><br>Du är välkommen att höra av dig om du har några frågor.<br>Vänligen ändra inte ämnesraden om du besvarar mejlet.<br><br>Med vänliga hälsningar<br><strong>${user.firstName} ${user.lastName}</strong><br><strong>Servicecenter Lön och pension</strong><br><a href="mailto:lonochpension@sundsvall.se">lonochpension@sundsvall.se</a><br>060-19 26 00, telefontid 9.00-12.00<br><a href="www.sundsvall.se">www.sundsvall.se</a><br><br>Sundsvalls kommun behandlar dina personuppgifter enligt dataskyddsförordningen (GDPR). Läs mer på <a href="www.sundsvall.se/personuppgifter">www.sundsvall.se/personuppgifter</a>`
      : isKC()
      ? 'Hej,<br><br>Tack för att du kontaktar oss.<br><br><br><br><br>Vi önskar dig en fin dag!<br><br>Med vänlig hälsning<br><br><strong>Sundsvalls kommun</strong><br>Kommunstyrelsekontoret<br>851 85 Sundsvall<br>E-post <a href="mailto:kontakt@sundsvall.se">kontakt@sundsvall.se</a><br>Telefon +46 60 19 10 00<br><a href="www.sundsvall.se">www.sundsvall.se</a><br><br>Vänligen ändra inte ämnesraden om du svarar på detta meddelande<br><br>Sundsvalls kommun behandlar dina personuppgifter enligt dataskyddsförordningen (GDPR). Läs mer på <a href="www.sundsvall.se/personuppgifter">www.sundsvall.se/personuppgifter</a>'
      : isIK()
      ? 'Hej,<br><br>Tack för att du kontaktar Intern Kundtjänst!<br><br><br>Ha en fortsatt bra dag!<br><br>Med vänlig hälsning<br><strong>Intern Kundtjänst</strong>'
      : ''
  }.`;
  const smsBody = isIK()
    ? `Hej,<br><br>Här kommer informationen vi pratade om:<br><br><br>Med vänliga hälsningar ${user.firstName}<br><strong>Intern Kundtjänst</strong>`
    : isKC()
    ? `Hej,<br><br>Tack för att du kontaktar oss.<br><br><br><br><br><br>Vi önskar dig en fortsatt fin dag!<br><br>Med vänlig hälsning<br><strong>Kontakt Sundsvall</strong>`
    : isLOP()
    ? `Hej,<br><br>Tack för att du kontaktar oss.<br><br><br><br><br><br>Vi önskar dig en fortsatt fin dag!<br><br>Med vänlig hälsning<br><strong>Lön och pension</strong>`
    : '';

  useEffect(() => {
    setRichText(smsBody);
  }, []);
  useEffect(() => {
    const _a = validateAction(supportErrand, user);
    setAllowed(_a);
  }, [user, supportErrand]);

  const onSelect = (message: Message) => {
    if (!message.viewed && supportErrand.assignedUserId === user.username) {
      setMessageViewStatus(supportErrand.id, municipalityId, message.communicationID, true).then(() => {
        props.update();
      });
    }

    setSelected(message.communicationID);
    setSelectedMessage(message);
    setShowSelectedMessage(true);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 0);
    });
  };

  useEffect(() => {
    if (props.messages && props.messageTree) {
      if (sortSendingTypeMessages === 'INBOUND') {
        let filteredMessages = props.messages.filter(
          (message: Message) =>
            message.direction === 'INBOUND' &&
            (sortChannelMessages !== 'allchannels'
              ? message.communicationType === sortChannelMessages
              : message.communicationType)
        );
        setSortedMessages(filteredMessages);
      } else if (sortSendingTypeMessages === 'OUTBOUND') {
        let filteredMessages = props.messages.filter(
          (message: Message) =>
            message.direction === 'OUTBOUND' &&
            (sortChannelMessages !== 'allchannels'
              ? message.communicationType === sortChannelMessages
              : message.communicationType)
        );
        setSortedMessages(filteredMessages);
      } else {
        setSortedMessages(
          sortChannelMessages !== 'allchannels'
            ? props.messageTree.filter((x) => x.communicationType === sortChannelMessages)
            : props.messageTree
        );
      }
    }
  }, [props.messages, props.messageTree, sortSendingTypeMessages, sortChannelMessages]);

  useEffect(() => {
    if (props.messages && props.messageTree) {
      if (sortChannelMessages === CommunicationCommunicationTypeEnum.WEB_MESSAGE) {
        let filteredMessages = props.messages.filter(
          (message: Message) => message.communicationType === CommunicationCommunicationTypeEnum.WEB_MESSAGE
        );
        let filteredMessageTree = props.messageTree.filter((m) => {
          return filteredMessages.find(
            (x) =>
              x.communicationType === m.communicationType &&
              (sortSendingTypeMessages !== 'ALL_SEND_TYPES' ? x.direction === sortSendingTypeMessages : x.direction)
          );
        });
        setSortedMessages(filteredMessageTree);
      } else if (sortChannelMessages === CommunicationCommunicationTypeEnum.EMAIL) {
        let filteredMessages = props.messages.filter(
          (message: Message) =>
            message.communicationType === CommunicationCommunicationTypeEnum.EMAIL &&
            (sortSendingTypeMessages !== 'ALL_SEND_TYPES'
              ? message.direction === sortSendingTypeMessages
              : message.direction)
        );
        let filteredMessageTree = props.messageTree.filter((m) => {
          return filteredMessages.find(
            (x) =>
              x.communicationType === m.communicationType &&
              (sortSendingTypeMessages !== 'ALL_SEND_TYPES' ? x.direction === sortSendingTypeMessages : x.direction)
          );
        });
        setSortedMessages(
          sortSendingTypeMessages === 'INBOUND' || sortSendingTypeMessages === 'OUTBOUND'
            ? filteredMessages
            : filteredMessageTree
        );
      } else if (sortChannelMessages === CommunicationCommunicationTypeEnum.SMS) {
        let filteredMessages = props.messages.filter(
          (message: Message) => message.communicationType === CommunicationCommunicationTypeEnum.SMS
        );
        let filteredMessageTree = props.messageTree.filter((m) => {
          return filteredMessages.find(
            (x) =>
              x.communicationType === m.communicationType &&
              (sortSendingTypeMessages !== 'ALL_SEND_TYPES' ? x.direction === sortSendingTypeMessages : x.direction)
          );
        });
        setSortedMessages(filteredMessageTree);
      } else {
        setSortedMessages(
          sortSendingTypeMessages !== 'ALL_SEND_TYPES'
            ? props.messages.filter((x) => x.direction === sortSendingTypeMessages)
            : props.messageTree
        );
      }
    }
  }, [props.messages, props.messageTree, sortChannelMessages, sortSendingTypeMessages]);

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
            disabled={isSupportErrandLocked(supportErrand) || !allowed || supportErrand.status === Status.NEW}
            size="sm"
            variant="primary"
            color="vattjom"
            inverted={!(isSupportErrandLocked(supportErrand) || !allowed)}
            rightIcon={<Icon icon={<Mail />} size={18} />}
            onClick={() => {
              setSelectedMessage(undefined);
              setShowSelectedMessage(false);
              setShowMessageForm(true);
              setRichText(emailBody);
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
              <Select.Option value={CommunicationCommunicationTypeEnum.WEB_MESSAGE}>E-tjänst</Select.Option>
              <Select.Option value={CommunicationCommunicationTypeEnum.EMAIL}>E-post</Select.Option>
              <Select.Option value={CommunicationCommunicationTypeEnum.SMS}>SMS</Select.Option>
            </Select>
          </FormControl>
        </div>

        {sortedMessages?.length ? (
          <div data-cy="message-container">
            <MessageTreeComponent
              update={props.update}
              setRichText={setRichText}
              setShowMessageForm={setShowMessageForm}
              richText={richText}
              emailBody={emailBody}
              nodes={sortedMessages}
              selected={selectedMessage?.communicationID}
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
            locked={isSupportErrandLocked(supportErrand)}
            showMessageForm={showMessageForm}
            showSelectedMessage={showSelectedMessage}
            setShowMessageForm={setShowMessageForm}
            prefillEmail={supportErrand.customer?.[0]?.emails?.[0]?.value}
            prefillPhone={supportErrand.customer?.[0]?.phoneNumbers?.[0]?.value}
            supportErrandId={supportErrand.id}
            setUnsaved={(val) => {
              props.setUnsaved(val);
            }}
            emailBody={emailBody}
            smsBody={smsBody}
            richText={richText}
            setRichText={setRichText}
            message={selectedMessage}
            update={props.update}
          />
        </MessageWrapper>
      </div>
    </>
  );
};
