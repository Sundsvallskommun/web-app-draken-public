import type { Address } from '@common/data-contracts/licensed-business/data-contracts';
import type { CParameter } from 'src/data-contracts/backend/data-contracts';

import type { PremisesAddressMatch, RestaurantNumberWithAssignment } from './licensed-business-service';
import { getErrandParameterValue, upsertErrandParameter } from './support-errand-service';
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

/** The settled address with the choice; written on the errand (see withPremisesProcessParameters). */
export const toDecisionPremises = (address: DecisionPremisesAddress, choice: PremisesChoice): DecisionPremises => ({
  ...address,
  choice,
});

/**
 * What the process reads to resolve the restaurant number. It reads the errand, not the decision, and
 * wants the address in parts, since LicensedBusiness looks an address up by street and postal code.
 */
const PREMISES_PROCESS_PARAMETERS: {
  key: string;
  displayName: string;
  valueOf: (premises: DecisionPremises, premisesName: string) => string;
}[] = [
  {
    key: 'premisesStreetAddress',
    displayName: 'Serveringsställets gatuadress',
    valueOf: (premises) => premises.street,
  },
  {
    key: 'premisesPostalCode',
    displayName: 'Serveringsställets postnummer',
    valueOf: (premises) => premises.postalCode,
  },
  { key: 'premisesPostalArea', displayName: 'Serveringsställets postort', valueOf: (premises) => premises.city },
  { key: 'premisesName', displayName: 'Serveringsställets namn', valueOf: (_premises, premisesName) => premisesName },
  {
    key: 'restaurantNumber',
    displayName: 'Valt restaurangnummer',
    valueOf: (premises) => (premises.choice.kind === 'EXISTING' ? premises.choice.restaurantNumber : ''),
  },
  {
    key: 'newRestaurantNumber',
    displayName: 'Nytt restaurangnummer begärt',
    valueOf: (premises) => (premises.choice.kind === 'NEW' ? 'true' : ''),
  },
];

/** The chosen premises on the errand. An empty value removes its key, so a changed choice leaves nothing behind. */
export const withPremisesProcessParameters = (
  parameters: CParameter[] | undefined,
  premises: DecisionPremises,
  premisesName: string
): CParameter[] =>
  PREMISES_PROCESS_PARAMETERS.reduce(
    (written, parameter) =>
      upsertErrandParameter(written, parameter.key, parameter.valueOf(premises, premisesName), parameter.displayName),
    parameters ?? []
  );

const choiceOf = (restaurantNumber: string, newRestaurantNumber: string): PremisesChoice | undefined => {
  if (restaurantNumber) return { kind: 'EXISTING', restaurantNumber };
  return newRestaurantNumber === 'true' ? { kind: 'NEW' } : undefined;
};

/** The premises the errand carries; undefined without a complete address and a choice. */
export const premisesFromErrandParameters = (parameters: CParameter[] | undefined): DecisionPremises | undefined => {
  const value = (key: string) => getErrandParameterValue(parameters, key);
  const address = complete(value('premisesStreetAddress'), value('premisesPostalCode'), value('premisesPostalArea'));
  const choice = choiceOf(value('restaurantNumber'), value('newRestaurantNumber'));

  return address && choice ? { ...address, choice } : undefined;
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
