import { Channels, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { maybe, extractContactInfo } from './default-escalation-template';

export const buildKAEscalationEmailContent = (e: SupportErrand, user: string): string => {
  const department = 'Kontaktcenter';
  const channel = maybe(e?.channel && Channels[e?.channel]);
  const description = maybe(e?.description).replace(/\n/g, '<br>');
  const customer = e?.customer?.[0];
  const contacts = e?.contacts || [];
  const subject = (e as any)?.emailHeaders?.subject || '';
  const customerInfo = customer
    ? `<p><b>Namn:</b> ${extractContactInfo(customer).name}
<br><b>Adress:</b> ${extractContactInfo(customer).adress}
<br><b>Telefonnummer:</b> ${extractContactInfo(customer).phone}
<br><b>E-postadress:</b> ${extractContactInfo(customer).email}</p>`
    : '';

  const otherContacts = contacts
    .map((c) => {
      const info = extractContactInfo(c);
      return `<p><b>Namn:</b> ${info.name}
<br><b>Adress:</b> ${info.adress}
<br><b>Telefonnummer:</b> ${info.phone}
<br><b>E-postadress:</b> ${info.email}</p>`;
    })
    .join('<br>');

  return `
<p>Hej,</p>
<br>
<p>Vi på ${department} har tagit emot ett ärende som vi behöver förmedla till er.</p>
<br>
<p><b>Inkom via:</b> ${channel}</p>
<p><b>Ärendebeskrivning</b><br>${description}</p>
<br>
<p><b>Kontaktuppgifter</b></p>
<br>${customerInfo}

${contacts.length > 0 ? `<br><p><b>Övriga kontaktuppgifter</b></p><br>${otherContacts}` : ''}
<br>
<p>Har detta meddelande inte hamnat rätt?</p>
<br>
<p>Hjälp oss gärna att så snabbt som möjligt guida meddelandet till rätt verksamhet eller person. Om du inte vet vem som äger frågan så svarar du på detta mail.</p>
<br>
<p>Vi önskar en fin dag.</p>
<br>
<p>Med vänliga hälsningar,</p>
<p><b>${department}</b></p>
<p>Handläggare ${user}</p>
<p>Telefon: 0690-25 01 00 (växel)</p>`;
};
