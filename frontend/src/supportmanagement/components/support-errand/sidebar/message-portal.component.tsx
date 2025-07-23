import { useAppContext } from '@contexts/app.context';
import { MessageWrapper } from '@common/components/message/message-wrapper.component';
import { SupportMessageForm } from '@supportmanagement/components/support-message-form/support-message-form.component';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import {
  getDefaultEmailBody,
  getDefaultSmsBody,
} from '@supportmanagement/components/templates/default-message-template';

export const MessagePortal: React.FC = () => {
  const { supportErrand, user, setSupportErrand } = useAppContext();
  const [show, setShow] = useState(false);
  const [richText, setRichText] = useState('');
  const { t } = useTranslation();

  const emailBody = getDefaultEmailBody(user, t);
  const smsBody = getDefaultSmsBody(user, t);

  const close = () => setShow(false);

  useEffect(() => {
    const handler = () => {
      setRichText(emailBody);
      setShow(true);
    };
    window.addEventListener('openMessage', handler);
    return () => window.removeEventListener('openMessage', handler);
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
