import { isIK, isKA, isKC, isLOP } from '@common/services/application-service';
import { appConfig } from '@config/appconfig';
import {
  Channels,
  SupportErrand,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';

export const maybe: (s: any) => string = (s) => (s ? s : '(saknas)');

export const extractContactInfo = (c: SupportStakeholderFormModel) => {
  const name = maybe(`${c?.firstName || ''} ${c?.lastName || ''}`);
  const adress = maybe(`${c?.address || ''} ${c?.zipCode || ''}`.replace('w', '').trim());
  const phone = maybe(c?.phoneNumbers?.map((c) => c.value).join(', '));
  const email = maybe(c?.emails?.map((c) => c.value).join(', '));

  return { name, adress, phone, email };
};

export const buildDefaultEscalationEmailContent = (e: SupportErrand, user: string): string => {
  const department = isKC() ? 'Sundsvalls kommun' : appConfig.applicationName;
  const description = maybe(e?.description);
  const channel = maybe(e?.channel && Channels[e?.channel]);
  const cus = e?.customer?.[0];
  const contacts = e?.contacts || [];
  const propertyDesignations = e?.parameters?.['propertyDesignation'];

  return `
  <p>Hej!</p>
  <p>Vi på ${department} har tagit emot en fråga som vi behöver förmedla till er.</p>
  <p><b>Inkom via:</b> ${channel}</p>
  ${description ? `<p><b>Ärendebeskrivning:</b><br>${description}</p>` : ''}
  ${propertyDesignations?.length ? `<p><b>Fastighetsbeteckningar:</b> ${propertyDesignations.join(', ')}</p>` : ''}
  ${
    cus
      ? `
    <p><b>Kontaktuppgifter</b></p>
    <p><b>Namn:</b> ${extractContactInfo(cus).name}<br>
    <b>Adress:</b> ${extractContactInfo(cus).adress}<br>
    <b>Telefonnummer:</b> ${extractContactInfo(cus).phone}<br>
    <b>E-postadress:</b> ${extractContactInfo(cus).email}</p>
  `
      : ''
  }
  ${
    contacts.length
      ? `
    <p><b>Övriga kontaktuppgifter</b></p>
    ${contacts
      .map((c) => {
        const info = extractContactInfo(c);
        return `<p><b>Namn:</b> ${info.name}<br><b>Adress:</b> ${info.adress}<br><b>Telefonnummer:</b> ${info.phone}<br><b>E-postadress:</b> ${info.email}</p>`;
      })
      .join('<br>')}
  `
      : ''
  }
  <p>Har detta meddelande inte hamnat rätt?</p>
  <p>Hjälp gärna till att så snabbt som möjligt guida meddelandet till rätt verksamhet eller person.</p>
  <p>Vi önskar en fortsatt fin dag.</p>
  <p><b>${department}</b><br>${
    isLOP() ? 'Handläggare' : isKC() ? 'Kommunvägledare' : isIK() ? 'Kundtjänstmedarbetare' : ''
  } ${user}<br>
  Telefon: ${isKA() ? '0690-25 01 00 (växel)' : '+46 60 19 10 00'}</p>
  `;
};
