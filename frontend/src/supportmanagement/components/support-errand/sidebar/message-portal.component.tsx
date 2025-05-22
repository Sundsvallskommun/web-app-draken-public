import { useAppContext } from '@contexts/app.context';
import { MessageWrapper } from '@casedata/components/errand/tabs/messages/message-wrapper.component';
import { SupportMessageForm } from '@supportmanagement/components/support-message-form/support-message-form.component';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';

export const MessagePortal: React.FC = () => {
  const { supportErrand, municipalityId, user, setSupportErrand } = useAppContext();
  const [show, setShow] = useState(false);
  const [richText, setRichText] = useState('');
  const { t } = useTranslation();

  const emailBody = t(
    `messages:templates.email.${process.env.NEXT_PUBLIC_APPLICATION}`,
    t(`messages:templates.email.default`),
    { user: `${user.firstName} ${user.lastName}` }
  );

  const smsBody = t(
    `messages:templates.sms.${process.env.NEXT_PUBLIC_APPLICATION}`,
    t(`messages:templates.sms.default`),
    { user: `${user.firstName}` }
  );

  const close = () => setShow(false);

  useEffect(() => {
    setRichText(emailBody);
  }, [emailBody]);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('openMessage', handler);
    return () => window.removeEventListener('openMessage', handler);
  }, []);

  if (!supportErrand) return null;

  return (
    <MessageWrapper show={show} label="Nytt meddelande" closeHandler={close}>
      <SupportMessageForm
        locked={isSupportErrandLocked(supportErrand)}
        showMessageForm={show}
        showSelectedMessage={false}
        setShowMessageForm={setShow}
        prefillEmail={supportErrand?.customer?.[0]?.emails?.[0]?.value}
        prefillPhone={supportErrand?.customer?.[0]?.phoneNumbers?.[0]?.value}
        supportErrandId={supportErrand.id}
        setUnsaved={() => {}}
        emailBody={emailBody}
        smsBody={smsBody}
        richText={richText}
        setRichText={setRichText}
        message={undefined}
        update={() => setSupportErrand({ ...supportErrand })}
      />
    </MessageWrapper>
  );
};
