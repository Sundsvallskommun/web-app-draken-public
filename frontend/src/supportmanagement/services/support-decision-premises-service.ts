import type { Address } from '@common/data-contracts/licensed-business/data-contracts';

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
  choice: PremisesChoice;
}

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

/** The settled address with the choice; sent with the decision (see support-decision-parameters-service). */
export const toDecisionPremises = (address: DecisionPremisesAddress, choice: PremisesChoice): DecisionPremises => ({
  ...address,
  choice,
});

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
