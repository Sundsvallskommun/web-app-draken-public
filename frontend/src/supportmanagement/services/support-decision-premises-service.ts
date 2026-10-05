import type { Address } from '@common/data-contracts/licensed-business/data-contracts';
import type { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';

import type { PremisesAddressMatch, RestaurantNumberWithAssignment } from './licensed-business-service';
import type { PremisesAddress } from './support-premises-address-service';

/** An existing restaurant number, or a new one. */
export type PremisesChoice = { kind: 'NEW' } | { kind: 'EXISTING'; restaurantNumber: string };

/** The process needs every part of the address. */
export interface DecisionPremisesAddress {
  street: string;
  postalCode: string;
  city: string;
}

export interface DecisionPremises extends DecisionPremisesAddress {
  /** Absent: the process creates a new number. */
  restaurantNumber?: string;
}

/** Parameter keys the process reads; a contract with it. */
const KEYS = { restaurantNumber: 'restaurantNumber', street: 'street', postalCode: 'postalCode', city: 'city' };

const complete = (
  street: string | undefined,
  postalCode: string | undefined,
  city: string | undefined
): DecisionPremisesAddress | undefined => (street && postalCode && city ? { street, postalCode, city } : undefined);

/**
 * The registered address once settled; the errand's own only when the register has no match (then
 * only a new number is possible). Undefined while unpicked or incomplete.
 */
export const decisionPremisesAddress = (
  lookup: { match?: PremisesAddressMatch; address?: Address },
  premises: PremisesAddress | undefined
): DecisionPremisesAddress | undefined => {
  if (lookup.address) {
    return complete(lookup.address.streetAddress, lookup.address.postalCode, lookup.address.postalArea);
  }

  const registerHasNoMatch = lookup.match?.match === 'SEARCH' && lookup.match.addresses.length === 0;
  return registerHasNoMatch ? complete(premises?.street, premises?.postalCode, premises?.city) : undefined;
};

export const toDecisionPremisesParameters = (address: DecisionPremisesAddress, choice: PremisesChoice): Parameter[] => [
  ...(choice.kind === 'EXISTING' ? [{ key: KEYS.restaurantNumber, values: [choice.restaurantNumber] }] : []),
  { key: KEYS.street, values: [address.street] },
  { key: KEYS.postalCode, values: [address.postalCode] },
  { key: KEYS.city, values: [address.city] },
];

/** Undefined when the decision carries no premises. */
export const fromDecisionParameters = (parameters: Parameter[] | undefined): DecisionPremises | undefined => {
  const value = (key: string) => parameters?.find((parameter) => parameter.key === key)?.values?.[0];
  const address = complete(value(KEYS.street), value(KEYS.postalCode), value(KEYS.city));

  return address ? { ...address, restaurantNumber: value(KEYS.restaurantNumber) } : undefined;
};

/** What the process does with the choice. */
export type PremisesChoiceEffect = 'NEW_NUMBER' | 'REPLACE_ASSIGNMENT' | 'NEW_ASSIGNMENT';

/** A running assignment is replaced; otherwise a new one is created. */
export const premisesChoiceEffect = (
  choice: PremisesChoice,
  restaurantNumbers: RestaurantNumberWithAssignment[]
): PremisesChoiceEffect => {
  if (choice.kind === 'NEW') return 'NEW_NUMBER';

  const chosen = restaurantNumbers.find((restaurantNumber) => restaurantNumber.number === choice.restaurantNumber);
  return chosen?.assignment?.status === 'ACTIVE' ? 'REPLACE_ASSIGNMENT' : 'NEW_ASSIGNMENT';
};
