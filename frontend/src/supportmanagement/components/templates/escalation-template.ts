import { TenantKey } from '@common/interfaces/tenant';
import { isIK, isKC, isLOP } from '@common/services/application-service';
import { maybe } from '@common/services/helper-service';
import { appConfig } from '@config/appconfig';
import {
  Channels,
  SupportErrand,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';
import dayjs from 'dayjs';

const normalizeAddress = (address?: string, zip?: string, city?: string) => {
  const s = `${address || ''}, ${zip || ''} ${city || ''}`.trim();
  return maybe(
    s
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/,\s*$/, '')
  );
};

export const extractContactInfo = (c: SupportStakeholderFormModel | undefined) => {
  if (!c) {
    return { name: '(saknas)', adress: '(saknas)', phone: '(saknas)', email: '(saknas)' };
  }
  const name = maybe(`${c?.firstName || ''} ${c?.lastName || ''}`.trim());
  const adress = normalizeAddress(c?.address, c?.zipCode, c?.city);
  const phone = maybe(
    c?.phoneNumbers
      ?.map((x) => x.value)
      .filter(Boolean)
      .join(', ')
  );
  const email = maybe(
    c?.emails
      ?.map((x) => x.value)
      .filter(Boolean)
      .join(', ')
  );
  return { name, adress, phone, email };
};

const renderContactBlock = (label: string, c?: SupportStakeholderFormModel) => {
  const info = extractContactInfo(c);
  return `<p><b>${label}</b></p><br><p><b>Namn:</b> ${info.name}<br><b>Adress:</b> ${info.adress}<br><b>Telefonnummer:</b> ${info.phone}<br><b>E-postadress:</b> ${info.email}</p>`;
};

const renderOtherContacts = (contacts: SupportStakeholderFormModel[] = []) => {
  if (!contacts.length) return '';
  const items = contacts
    .map((c) => {
      const info = extractContactInfo(c);
      return `<p><b>Namn:</b> ${info.name}<br>
<b>Adress:</b> ${info.adress}<br>
<b>Telefonnummer:</b> ${info.phone}<br>
<b>E-postadress:</b> ${info.email}</p>`;
    })
    .join('<br>');
  return `<br><p><b>Övriga kontaktuppgifter</b></p><br>${items}`;
};

type TenantConfig = {
  departmentName: (e: SupportErrand) => string;
  roleLabel: (user: string) => string;
  phoneNumber: string;
  showMetaRows: boolean;
  showPropertyDesignations: boolean;
  subjectResolver?: (e: SupportErrand) => string | undefined;
  introRecipientLine?: string;
  closingLine?: string;
};

const kcRole = () => (isLOP() ? 'Handläggare' : isKC() ? 'Kommunvägledare' : isIK() ? 'Kundtjänstmedarbetare' : '');

const TENANTS: Record<TenantKey, TenantConfig> = {
  sundsvall: {
    departmentName: (e) => (isKC() ? 'Sundsvalls kommun' : appConfig.applicationName),
    roleLabel: (user) => kcRole() + ` ${user}`,
    phoneNumber: '+46 60 19 10 00',
    showMetaRows: true,
    showPropertyDesignations: true,
    subjectResolver: (e) => (e.channel === 'EMAIL' ? (e as any)?.emailHeaders?.subject || e.title : undefined),
    introRecipientLine: 'Vi på ${department} har tagit emot en fråga som vi behöver förmedla till er.',
    closingLine: 'Vi önskar en fortsatt fin dag.',
  },
  ange: {
    departmentName: () => 'Kontaktcenter',
    roleLabel: (user) => `Handläggare ${user}`,
    phoneNumber: '0690-25 01 00 (växel)',
    showMetaRows: true,
    showPropertyDesignations: false,
    subjectResolver: (e) => (e.channel === 'EMAIL' ? (e as any)?.emailHeaders?.subject || e.title : undefined),
    introRecipientLine: 'Vi på ${department} har tagit emot ett ärende som vi behöver förmedla till er.',
    closingLine: 'Vi önskar en fin dag.',
  },
};

export const buildEscalationEmailContent = (e: SupportErrand, user: string, tenant: TenantKey): string => {
  const cfg = TENANTS[tenant];

  const department = cfg.departmentName(e);
  const channel = maybe(e?.channel && Channels[e?.channel]);
  const description = maybe(e?.description);
  const customer = e?.customer?.[0];
  const contacts = e?.contacts || [];
  const subject = cfg.subjectResolver?.(e);
  const propertyDesignations = Array.isArray(e?.parameters?.['propertyDesignation'])
    ? (e.parameters['propertyDesignation'] as string[])
    : [];

  const introLine = (
    cfg.introRecipientLine || 'Vi på ${department} har tagit emot ett ärende som vi behöver förmedla till er.'
  ).replace('${department}', department);

  const metaRows = cfg.showMetaRows
    ? `<p><b>Inkom via:</b> ${channel}</p>${
        subject ? `<p><b>Ämnesrad:</b> ${subject}</p>` : ''
      }<p><b>Ärendet registrerades:</b> ${dayjs(e.created).format(
        'YYYY-MM-DD HH:mm'
      )}</p><p><b>Ärendenummer i Draken:</b> ${e.errandNumber}</p>`
    : `<p><b>Inkom via:</b> ${channel}</p>`;

  const propertyBlock =
    cfg.showPropertyDesignations && propertyDesignations.length
      ? `<br><p><b>Fastighetsbeteckningar:</b> ${propertyDesignations.join(', ')}</p><br>`
      : '';

  return (
    '<p>Hej,</p><br><p>' +
    introLine +
    '</p><br>' +
    metaRows +
    '<br><p><b>Ärendebeskrivning</b></p>' +
    description +
    '<br>' +
    propertyBlock +
    (customer ? renderContactBlock('Kontaktuppgifter', customer) : '') +
    renderOtherContacts(contacts) +
    '<br><p>Har detta meddelande inte hamnat rätt?</p><br><p>Hjälp oss gärna att så snabbt som möjligt guida meddelandet till rätt verksamhet eller person. Om du inte vet vem som äger frågan så svarar du på detta mail.</p><br><p>' +
    cfg.closingLine +
    '</p><br><p>Med vänliga hälsningar,</p><p><b>' +
    department +
    '</b></p><p>' +
    cfg.roleLabel(user) +
    '</p><p>Telefon: ' +
    cfg.phoneNumber +
    '</p>'
  );
};

export const buildEscalationTextContent = (e: SupportErrand, user: string, tenant: TenantKey): string => {
  const cfg = TENANTS[tenant];

  const department = cfg.departmentName(e);
  const channel = maybe(e?.channel && Channels[e?.channel]);
  const description = maybe(e?.description);
  const subject = cfg.subjectResolver?.(e);
  const introLine = (
    cfg.introRecipientLine || 'Vi på ${department} har tagit emot ett ärende som vi behöver förmedla till er.'
  ).replace('${department}', department);

  const metaRows = cfg.showMetaRows
    ? `<p><b>Inkom via:</b> ${channel}</p>${
        subject ? `<p><b>Ämnesrad:</b> ${subject}</p>` : ''
      }<p><b>Ärendet registrerades:</b> ${dayjs(e.created).format(
        'YYYY-MM-DD HH:mm'
      )}</p><p><b>Ärendenummer i Draken:</b> ${e.errandNumber}</p>`
    : `<p><b>Inkom via:</b> ${channel}</p>`;

  return '<p>Hej,</p><br><p>' + introLine + '</p><br>' + metaRows + '<br><p><b>Ärendebeskrivning</b></p>' + description;
};
