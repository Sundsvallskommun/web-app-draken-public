import { getErrandPropertyDesignations } from '@casedata/services/casedata-facilities-service';
import { Channels, ContactChannelType, SupportErrand, SupportStakeholderFormModel } from './support-errand-service';
import { SupportMetadata } from './support-metadata-service';
import { isIK, isKC, isLOP } from '@common/services/application-service';

const maybe: (s: any) => string = (s) => (s ? s : '(saknas)');
const maybeList: (s: any) => string[] = (s) => (s?.length > 0 ? s : []);

const extractContactInfo = (c: SupportStakeholderFormModel) => {
  const name = maybe(c && `${c?.firstName || ''} ${c?.lastName || ''}`);
  const adress = maybe((c && `${c?.address || ''} ${c?.zipCode || ''}`)?.replace('w', '').trim());
  const phone = maybe(
    c &&
      (c?.contactChannels
        ?.filter((c) => c.type === ContactChannelType.PHONE)
        .map((c) => c.value)
        .join(', ') ||
        c?.phoneNumbers?.map((c) => c.value).join(', '))
  );
  const email = maybe(
    c &&
      (c?.contactChannels
        ?.filter((c) => c.type === ContactChannelType.EMAIL)
        .map((c) => c.value)
        .join(', ') ||
        c?.emails?.map((c) => c.value).join(', '))
  );
  return {
    name,
    adress,
    phone,
    email,
  };
};

export const getEscalationMessage: (
  e: Partial<SupportErrand> & { attachments?: { file: FileList | undefined }[] },
  existingAttachments: { fileName: string }[],
  metadata: SupportMetadata,
  user: string
) => Promise<string> = async (e, existingAttachments, metadata, user) => {
  const department = isLOP() ? 'Lön och pension' : isKC() ? 'Kontakt Sundsvall' : isIK() ? 'Intern kundtjänst' : '';
  const description = maybe(e?.description);
  const files = maybeList(existingAttachments?.map((a) => a.fileName));
  const attachments = maybeList(e?.attachments?.map((a) => a.file?.[0].name));
  const allFiles = [...files, ...attachments].join(', ');
  const caseId = maybe(e?.externalTags?.find((t) => t.key === 'caseId')?.value || e?.caseId);
  const channel = maybe(e?.channel && Channels[e?.channel]);
  const categories = metadata.categories;
  const categoryObject = categories.find((t) => t.name === e?.category);
  const categoryDisplayName = maybe(categoryObject?.displayName);
  const type = maybe(categoryObject?.types.find((t) => t.name === e?.type)?.displayName);
  const cus = e?.customer?.[0];
  const contacts = e?.contacts.slice(0) || [];
  const propertyDesignations = e?.parameters?.['propertyDesignation'];
  const contactsHeader = () => {
    return contacts.length > 0
      ? `
      <p>
    <b>Övriga kontaktuppgifter</b>
  </p>`
      : '<p></p>';
  };

  return `
  <p>
Hej!
</p>
<p>
Vi på ${department} har tagit emot en fråga som vi behöver förmedla till er.
</p>
<p>
Inkom via: ${channel}
</p>
${
  description && description.length > 0
    ? `<b>Ärendebeskrivning</b><p>${description}
</p>`
    : ''
}
  ${
    propertyDesignations?.length > 0
      ? `<p>
Fastighetsbeteckningar: ${propertyDesignations.join(', ')}
</p>
`
      : ''
  }
  ${
    cus
      ? `<p><b>Kontaktuppgifter</b></p><p>
<b>Namn:</b> ${extractContactInfo(cus).name}<br><b>Adress:</b> ${
          extractContactInfo(cus).adress
        }<br><b>Telefonnummer:</b> ${extractContactInfo(cus).phone}
<b>E-postadress:</b> ${extractContactInfo(cus).email}
</p>`
      : ''
  }
${contactsHeader()}
${contacts
  .map(
    (contact) => `<p><b>Namn:</b> ${extractContactInfo(contact).name}<br><b>Adress:</b> ${
      extractContactInfo(contact).adress
    }<br><b>Telefonnummer:</b> ${extractContactInfo(contact).phone}
<b>E-postadress:</b> ${extractContactInfo(contact).email}</p>`
  )
  .join('<br>')}
</p>
<p>
Har detta meddelande inte hamnat rätt?
</p>
<p>
Hjälp gärna till att så snabbt som möjligt skicka till rätt verksamhet eller person. Om du inte vet vem som äger frågan så svarar du på detta mail.
</p>
<p>
Vi önskar en fortsatt fin dag.
</p>

Med vänliga hälsningar
<br>
<b>${department}</b>
${isLOP() ? 'Handläggare' : isKC() ? 'Kommunvägledare' : isIK() ? 'Kundtjänstmedarbetare' : ''} ${user}
Telefon: +46 60 19 10 00
`;
};

export const getEscalationEmails: (
  e: SupportErrand,
  metadata: SupportMetadata
) => Promise<{ label: string; value: string }[]> = (e, metadata) => {
  const types = metadata?.categories?.find((c) => c.name === e.category)?.types;
  const type = types?.find((t) => t.name === e.type);
  const escalationEmail = type?.escalationEmail;
  return Promise.resolve([
    ...(type && escalationEmail ? [{ label: type.displayName, value: type.escalationEmail }] : []),
  ]);
};
