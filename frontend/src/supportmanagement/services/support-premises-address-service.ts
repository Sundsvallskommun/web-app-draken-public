import { jsonParameterForSchema, schemaNameForErrand } from './support-errand-schema-service';
import type { SupportErrand } from './support-errand-service';

/** Where the premises address was read from: the errand form, or the owner (PRIMARY) stakeholder. */
type PremisesAddressSource = 'FORM' | 'OWNER';

export interface PremisesAddress {
  street: string;
  /** Whitespace removed — Katla accepts both `85230` and `852 30`. */
  postalCode?: string;
  city?: string;
  source: PremisesAddressSource;
}

type PremisesAddressErrand = Pick<SupportErrand, 'labels' | 'classification' | 'jsonParameters' | 'stakeholders'>;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** A street is what identifies the premises; without one there is no address to look up. */
const toPremisesAddress = (
  street: unknown,
  postalCode: unknown,
  city: unknown,
  source: PremisesAddressSource
): PremisesAddress | undefined => {
  const normalizedStreet = text(street);
  if (!normalizedStreet) return undefined;

  return {
    street: normalizedStreet,
    postalCode: text(postalCode)?.replace(/\s+/g, ''),
    city: text(city),
    source,
  };
};

const fromForm = (formData: Record<string, unknown> | undefined): PremisesAddress | undefined => {
  const besoksadress = formData?.besoksadress;
  if (!besoksadress || typeof besoksadress !== 'object') return undefined;

  const { gatuadress, postnummer, postort } = besoksadress as Record<string, unknown>;
  return toPremisesAddress(gatuadress, postnummer, postort, 'FORM');
};

const fromOwner = (errand: PremisesAddressErrand): PremisesAddress | undefined => {
  const owner = errand.stakeholders?.find((stakeholder) => stakeholder.role === 'PRIMARY');
  return owner ? toPremisesAddress(owner.address, owner.zipCode, owner.city, 'OWNER') : undefined;
};

/**
 * The address of the serving/sales premises (besöksadress) of an AoT errand.
 *
 * `besoksadressSammaSomForetaget: "JA"` means the premises are at the owner's address; anything else,
 * including the question being absent, means the form's own `besoksadress`. The chosen source is
 * final: when it holds no usable address the result is undefined, never the other source — a stale
 * `besoksadress` left behind after answering JA is not the premises.
 */
export const getPremisesAddress = (
  errand: PremisesAddressErrand | undefined,
  namespace: string | undefined
): PremisesAddress | undefined => {
  if (!errand) return undefined;

  const value = jsonParameterForSchema(errand, schemaNameForErrand(errand, namespace))?.value;
  const formData = value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

  return formData?.besoksadressSammaSomForetaget === 'JA' ? fromOwner(errand) : fromForm(formData);
};
