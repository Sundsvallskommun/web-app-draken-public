import { TenantKey } from '@common/interfaces/tenant';
import { isKA } from '@common/services/application-service';
import { buildEscalationEmailContent } from '@supportmanagement/components/templates/escalation-template';
import { ContactChannelType, SupportErrand, SupportStakeholderFormModel } from './support-errand-service';
import { SupportMetadata } from './support-metadata-service';
export const maybe: (s: any) => string = (s) => (s ? s : '(saknas)');

export const extractContactInfo = (c: SupportStakeholderFormModel) => {
  const name = maybe(c && `${c?.firstName || ''} ${c?.lastName || ''}`);
  const adress = maybe((c && `${c?.address || ''} ${c?.zipCode || ''}`)?.replace('w', '').trim());
  const phone = maybe(
    c &&
      (c?.contactChannels
        ?.filter((c) => c.type === ContactChannelType.PHONE || c.type === ContactChannelType.Phone)
        .map((c) => c.value)
        .join(', ') ||
        c?.phoneNumbers?.map((c) => c.value).join(', '))
  );
  const email = maybe(
    c &&
      (c?.contactChannels
        ?.filter((c) => c.type === ContactChannelType.EMAIL || c.type === ContactChannelType.Email)
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

export const getEscalationMessage: (e: Partial<SupportErrand>, user: string) => Promise<string> = async (e, user) => {
  const tenant: TenantKey = isKA() ? TenantKey.Ange : TenantKey.Sundsvall;
  return buildEscalationEmailContent(e as SupportErrand, user, tenant);
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
