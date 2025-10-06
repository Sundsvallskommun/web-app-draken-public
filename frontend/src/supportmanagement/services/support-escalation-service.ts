import { TenantKey } from '@common/interfaces/tenant';
import { isKA } from '@common/services/application-service';
import {
  buildEscalationEmailContent,
  buildEscalationTextContent,
} from '@supportmanagement/components/templates/escalation-template';
import { SupportErrand } from './support-errand-service';
import { SupportMetadata } from './support-metadata-service';

export const getEscalationMessage: (
  e: Partial<SupportErrand>,
  version: string,
  user?: string
) => Promise<string> = async (e, version, user) => {
  const tenant: TenantKey = isKA() ? TenantKey.Ange : TenantKey.Sundsvall;
  return version === 'EMAIL'
    ? buildEscalationEmailContent(e as SupportErrand, user, tenant)
    : version === 'DEPARTMENT'
    ? buildEscalationTextContent(e as SupportErrand, user, tenant)
    : ' ';
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
