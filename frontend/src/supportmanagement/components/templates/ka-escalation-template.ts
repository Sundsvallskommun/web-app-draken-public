import { Channels, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { maybe, extractContactInfo } from './default-escalation-template';

export const buildKAEscalationEmailContent = (e: SupportErrand, user: string): string => {
  const department = 'Kontaktcenter';
  const channel = maybe(e?.channel && Channels[e?.channel]);
  const description = maybe(e?.description);
  const customer = e?.customer?.[0];
  const contacts = e?.contacts || [];
  const subject = (e as any)?.emailHeaders?.subject || '';
  const customerInfo = customer
    ? `<p><strong>Namn:</strong> ${extractContactInfo(customer).name}<br>
<strong>Adress:</strong> ${extractContactInfo(customer).adress}<br>
<strong>Telefonnummer:</strong> ${extractContactInfo(customer).phone}<br>
<strong>E-postadress:</strong> ${extractContactInfo(customer).email}</p>`
    : '';

  const otherContacts = contacts
    .map((c) => {
      const info = extractContactInfo(c);
      return `<p><strong>Namn:</strong> ${info.name}<br>
<strong>Adress:</strong> ${info.adress}<br>
<strong>Telefonnummer:</strong> ${info.phone}<br>
<strong>E-postadress:</strong> ${info.email}</p>`;
    })
    .join('<br>');

  return `
<p>Hej,</p>

<p>Vi på ${department} har tagit emot ett ärende som vi behöver förmedla till er.</p>
<p><strong>Inkom via:</strong> ${channel}</p>

<p><strong>Ärendebeskrivning</strong><br>${description}</p>

<p><strong>Kontaktuppgifter</strong></p>
${customerInfo}

${contacts.length > 0 ? `<p><strong>Övriga kontaktuppgifter</strong></p>${otherContacts}` : ''}

<p>Har detta meddelande inte hamnat rätt?</p>
<p>Hjälp oss gärna att så snabbt som möjligt guida meddelandet till rätt verksamhet eller person. Om du inte vet vem som äger frågan så svarar du på detta mail.</p>

<p>Vi önskar en fin dag.</p>

<p>Med vänliga hälsningar,</p>
<p><strong>${department}</strong>
Handläggare ${user}
Telefon: 0690-25 01 00 (växel)</p>`;
};
