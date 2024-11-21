import { MessageWrapper } from '@casedata/components/errand/tabs/messages/message-wrapper.component';
import { isIK, isKC, isLOP } from '@common/services/application-service';
import sanitized from '@common/services/sanitizer-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Button, cx, Divider, RadioButton } from '@sk-web-gui/react';
import { isSupportErrandLocked, validateAction } from '@supportmanagement/services/support-errand-service';
import { Message, setMessageViewStatus } from '@supportmanagement/services/support-message-service';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import { SupportMessageForm } from '../../../support-message-form/support-message-form.component';
import MessageTreeComponent from './support-messages-tree.component';

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
  const [sortMessages, setSortMessages] = useState<number>(0);
  const [sortedMessages, setSortedMessages] = useState(props.messages);

  const emailBody = `Hej,<br><br>Tack för att du kontaktar oss.<br><br><br><br><br><br>${
    isLOP()
      ? `Du är välkommen att höra av dig om du har några frågor.<br>Vänligen ändra inte ämnesraden om du besvarar mejlet.<br><br>Med vänliga hälsningar<br><strong>${user.firstName} ${user.lastName}</strong><br><strong>Servicecenter Lön och pension</strong><br><a href="mailto:lonochpension@sundsvall.se">lonochpension@sundsvall.se</a><br>060-19 26 00, telefontid 9.00-12.00<br><a href="www.sundsvall.se">www.sundsvall.se</a><br><br>Sundsvalls kommun behandlar dina personuppgifter enligt dataskyddsförordningen (GDPR). Läs mer på <a href="www.sundsvall.se/personuppgifter">www.sundsvall.se/personuppgifter</a>`
      : isKC()
      ? 'Vi önskar dig en fortsatt fin dag!<br><br>Med vänlig hälsning<br><strong>Kontakt Sundsvall</strong><br><br><strong>Sundsvalls kommun</strong><br>Kommunstyrelsekontoret<br>851 85 Sundsvall<br>E-post <a href="mailto:kontakt@sundsvall.se">kontakt@sundsvall.se</a><br>Telefon +46 60 19 10 00<br><a href="www.sundsvall.se">www.sundsvall.se</a><br><br>Vänligen ändra inte ämnesraden om du svarar på detta meddelande<br><br>Sundsvalls kommun behandlar dina personuppgifter enligt dataskyddsförordningen (GDPR). Läs mer på <a href="www.sundsvall.se/personuppgifter">www.sundsvall.se/personuppgifter</a>'
      : isIK()
      ? 'Vi önskar dig en fortsatt fin dag!<br><br>Med vänlig hälsning<br><strong>Intern kundtjänst</strong>'
      : ''
  }.`;
  const smsBody = `Hej,<br><br>Tack för att du kontaktar oss.<br><br><br><br><br><br>Vi önskar dig en fortsatt fin dag!<br><br>Med vänlig hälsning<br><strong>${
    isLOP() ? 'Lön och pension' : isKC() ? 'Kontakt Sundsvall' : isIK() ? 'Intern kundtjänst' : ''
  }</strong>`;

  useEffect(() => {
    setRichText(emailBody);
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
  };

  useEffect(() => {
    if (props.messages && props.messageTree) {
      if (sortMessages === 1) {
        let filteredMessages = props.messages.filter((message: Message) => message.direction === 'INBOUND');
        setSortedMessages(filteredMessages);
      } else if (sortMessages === 2) {
        let filteredMessages = props.messages.filter((message: Message) => message.direction === 'OUTBOUND');
        setSortedMessages(filteredMessages);
      } else {
        setSortedMessages(props.messageTree);
      }
    }
  }, [props.messages, props.messageTree, sortMessages]);

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
            disabled={isSupportErrandLocked(supportErrand) || !allowed}
            size="sm"
            variant="primary"
            color="vattjom"
            inverted={!(isSupportErrandLocked(supportErrand) || !allowed)}
            rightIcon={<LucideIcon name="mail" size={18} />}
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
          <div data-cy="message-container">
            <MessageTreeComponent
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
          show={showSelectedMessage}
          label={'Meddelande'}
          closeHandler={() => {
            setShowSelectedMessage(false);
            setSelected(null);
            setSelectedMessage(null);
          }}
        >
          <div className="my-md py-8 px-40">
            <div>
              <div className="relative">
                <div className="flex justify-between items-center my-12">
                  <div className={cx(`relative flex gap-md items-center justify-start pr-lg text-md`)}>
                    <Avatar rounded />
                    <div>
                      Från:
                      <p className="my-0">
                        <strong
                          className="mr-md"
                          dangerouslySetInnerHTML={{
                            __html: sanitized(selectedMessage?.sender || '(okänd avsändare)'),
                          }}
                        ></strong>
                      </p>
                      <p className="my-0">
                        {selectedMessage?.sent
                          ? dayjs(selectedMessage?.sent).format('YYYY-MM-DD HH:mm')
                          : 'Datum saknas'}
                      </p>
                    </div>
                  </div>
                  {selectedMessage?.direction === 'INBOUND' && selectedMessage.communicationType === 'EMAIL' ? (
                    <Button
                      type="button"
                      color="vattjom"
                      disabled={isSupportErrandLocked(supportErrand) || !allowed}
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedMessage(selectedMessage);
                        setShowSelectedMessage(false);
                        setTimeout(() => {
                          setRichText(emailBody + richText);
                          setShowMessageForm(true);
                        }, 100);
                      }}
                    >
                      Svara
                    </Button>
                  ) : null}
                </div>
                {selectedMessage?.communicationAttachments.length > 0 ? (
                  <ul className="flex flex-row gap-sm items-center my-12">
                    <LucideIcon name="paperclip" size="1.6rem" />
                    {selectedMessage?.communicationAttachments?.map((a, idx) => (
                      <Button
                        key={`${a.name}-${idx}`}
                        onClick={() => {}}
                        role="listitem"
                        leftIcon={
                          a.name.endsWith('pdf') ? <LucideIcon name="paperclip" /> : <LucideIcon name="image" />
                        }
                        variant="tertiary"
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
                  ></strong>
                  <p
                    className="my-0 [&>ul]:list-disc [&>ol]:list-decimal [&>ul]:ml-lg [&>ol]:ml-lg"
                    dangerouslySetInnerHTML={{
                      __html: sanitized(selectedMessage?.messageBody || ''),
                    }}
                  ></p>
                </div>
              </div>
            </div>
          </div>
        </MessageWrapper>

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
