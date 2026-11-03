import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { TenantKey } from '@common/interfaces/tenant';
import { isKA } from '@common/services/application-service';
import { buildEscalationEmailContent } from '@supportmanagement/components/templates/escalation-template';

import type { SupportErrand } from './support-errand-service';
import { resolveLabelPath } from './support-label-service';
import { SupportMetadata } from './support-metadata-service';

const ESCALATION_EMAIL_ATTRIBUTE_KEY = 'escalationEmail';

const getEscalationEmailAttribute = (label: Label): string | undefined =>
  label.attributes?.find((attribute) => attribute.key === ESCALATION_EMAIL_ATTRIBUTE_KEY)?.value;

/**
 * Resolves the escalation email carried by the errand's labels from the lowest level up, so a type's email
 * wins over its category's and a category's over its department's. The errand's stored labels do not carry
 * attributes, so their path is resolved in the metadata label structure, whatever levels it has.
 * Returns the first non-empty match, or undefined if none is found.
 */
const getLabelEscalationEmail = (
  e: SupportErrand,
  metadata: SupportMetadata
): { label: string; value: string } | undefined => {
  const labelPathBottomUp = resolveLabelPath(metadata?.labels?.labelStructure, e.labels).reverse();

  for (const label of labelPathBottomUp) {
    const escalationEmail = getEscalationEmailAttribute(label);
    if (escalationEmail) {
      return { label: label.displayName ?? '', value: escalationEmail };
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
