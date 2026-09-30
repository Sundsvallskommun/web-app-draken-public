import { TenantKey } from '@common/interfaces/tenant';
import { isKA } from '@common/services/application-service';
import { buildEscalationEmailContent } from '@supportmanagement/components/templates/escalation-template';

import { SupportErrand } from './support-errand-service';
import { resolveErrandLabelPath } from './support-label-service';
import { SupportMetadata } from './support-metadata-service';

const ESCALATION_EMAIL_ATTRIBUTE_KEY = 'escalationEmail';

/**
 * Resolves the escalation email carried by the errand's labels, checking the most specific label
 * level first. The errand's stored labels do not carry attributes, so they are resolved back to the
 * metadata label structure to read the escalationEmail attribute. Returns the first non-empty match,
 * or undefined if none is found.
 */
const getLabelEscalationEmail = (
  e: SupportErrand,
  metadata: SupportMetadata
): { label: string; value: string } | undefined => {
  const mostSpecificLabelFirst = [...resolveErrandLabelPath(e.labels, metadata)].reverse();

  for (const label of mostSpecificLabelFirst) {
    const escalationEmail = label?.attributes?.find(
      (attribute) => attribute.key === ESCALATION_EMAIL_ATTRIBUTE_KEY
    )?.value;
    if (escalationEmail) {
      return { label: label?.displayName ?? '', value: escalationEmail };
    }
  }

  return undefined;
};

export const getEscalationMessage: (
  e: Partial<SupportErrand>,
  version: string,
  user?: string
) => Promise<string> = async (e, version, user) => {
  const tenant: TenantKey = isKA() ? TenantKey.Ange : TenantKey.Sundsvall;
  return version === 'EMAIL' ? buildEscalationEmailContent(e as SupportErrand, user ?? '', tenant) : ' ';
};

export const getEscalationEmails: (
  e: SupportErrand,
  metadata: SupportMetadata
) => Promise<{ label: string; value: string }[]> = (e, metadata) => {
  // Prefer the escalation email carried by the errand's labels; fall back to the category/type model.
  const labelEscalationEmail = getLabelEscalationEmail(e, metadata);
  if (labelEscalationEmail) {
    return Promise.resolve([labelEscalationEmail]);
  }

  const types = metadata?.categories?.find((c) => c.name === e.category)?.types;
  const type = types?.find((t) => t.name === e.type);
  const escalationEmail = type?.escalationEmail;
  return Promise.resolve([
    ...(type && escalationEmail ? [{ label: type.displayName ?? '', value: type.escalationEmail ?? '' }] : []),
  ]);
};
