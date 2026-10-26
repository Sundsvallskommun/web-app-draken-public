import type { Address } from '@common/data-contracts/licensed-business/data-contracts';
import { describe, expect, test } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import type { PremisesAddressMatch, RestaurantNumberWithAssignment } from './licensed-business-service';
import {
  decisionPremisesAddress,
  premisesChoiceEffect,
  premisesFromErrandParameters,
  toDecisionPremises,
  withPremisesProcessParameters,
} from './support-decision-premises-service';
import type { PremisesAddress } from './support-premises-address-service';

const REGISTERED = mockEnv.mockCompanyAddress;
const ERRAND = mockEnv.mockPremisesAddress;

const registered: Address = {
  id: mockEnv.mockLicensedBusinessAddressId,
  streetAddress: REGISTERED.street,
  postalCode: REGISTERED.postalCode,
  postalArea: REGISTERED.city,
};
const premises: PremisesAddress = { ...ERRAND, source: 'FORM' };

const search = (addresses: Address[]): PremisesAddressMatch => ({
  match: 'SEARCH',
  query: ERRAND.street,
  addresses,
  totalRecords: addresses.length,
});

const numberWith = (status: string | undefined): RestaurantNumberWithAssignment => ({
  number: mockEnv.mockRestaurantNumber,
  assignment: status ? { status } : null,
  assignmentFailed: false,
});

describe('decisionPremisesAddress', () => {
  test('the registered address is the one the decision is about once it is settled', () => {
    expect(
      decisionPremisesAddress({ match: { match: 'EXACT', address: registered }, address: registered }, premises)
    ).toEqual({
      street: REGISTERED.street,
      postalCode: REGISTERED.postalCode,
      city: REGISTERED.city,
    });
  });

  test('the errand address is used only when the register has nothing to pick from', () => {
    expect(decisionPremisesAddress({ match: search([]) }, premises)).toEqual({
      street: ERRAND.street,
      postalCode: ERRAND.postalCode,
      city: ERRAND.city,
    });
  });

  test('there is no address while one is still to be picked, or nothing has been looked up', () => {
    expect(decisionPremisesAddress({ match: search([registered, registered]) }, premises)).toBeUndefined();
    expect(decisionPremisesAddress({}, premises)).toBeUndefined();
  });

  test('an address missing a part is not one the process can act on', () => {
    const withoutArea = { ...registered, postalArea: undefined };

    expect(decisionPremisesAddress({ address: withoutArea }, premises)).toBeUndefined();
    expect(decisionPremisesAddress({ match: search([]) }, { ...premises, city: undefined })).toBeUndefined();
    expect(decisionPremisesAddress({ match: search([]) }, undefined)).toBeUndefined();
  });
});

describe('toDecisionPremises', () => {
  const address = { street: ERRAND.street, postalCode: ERRAND.postalCode, city: ERRAND.city };

  test('the choice is decided with the address', () => {
    const existing = { kind: 'EXISTING', restaurantNumber: mockEnv.mockRestaurantNumber } as const;

    expect(toDecisionPremises(address, existing)).toEqual({ ...address, choice: existing });
    expect(toDecisionPremises(address, { kind: 'NEW' })).toEqual({ ...address, choice: { kind: 'NEW' } });
  });
});

describe('the premises on the errand', () => {
  const address = { street: ERRAND.street, postalCode: ERRAND.postalCode, city: ERRAND.city };
  const existing = { kind: 'EXISTING', restaurantNumber: mockEnv.mockRestaurantNumber } as const;
  const asObject = (parameters: { key: string; values?: string[] }[]) =>
    Object.fromEntries(parameters.map((parameter) => [parameter.key, parameter.values?.[0]]));

  test('the address goes in parts, since that is how the process looks it up', () => {
    expect(asObject(withPremisesProcessParameters(undefined, { ...address, choice: existing }, 'Kiosken'))).toEqual({
      premisesStreetAddress: ERRAND.street,
      premisesPostalCode: ERRAND.postalCode,
      premisesPostalArea: ERRAND.city,
      premisesName: 'Kiosken',
      restaurantNumber: mockEnv.mockRestaurantNumber,
    });
  });

  test('a new number is asked for by its own key, and the earlier choice is left behind', () => {
    const chosen = withPremisesProcessParameters(undefined, { ...address, choice: existing }, '');
    const changed = asObject(withPremisesProcessParameters(chosen, { ...address, choice: { kind: 'NEW' } }, ''));

    expect(changed.newRestaurantNumber).toBe('true');
    expect(changed).not.toHaveProperty('restaurantNumber');
    expect(changed).not.toHaveProperty('premisesName');
  });

  test('what the errand carried about anything else is kept', () => {
    const written = withPremisesProcessParameters(
      [{ key: 'PREMISES_INSPECTED_AT', values: ['2026-10-17'] }],
      { ...address, choice: existing },
      ''
    );

    expect(asObject(written).PREMISES_INSPECTED_AT).toBe('2026-10-17');
  });

  test('the choice is read back from the errand, and needs a whole address', () => {
    const written = withPremisesProcessParameters(undefined, { ...address, choice: existing }, '');

    expect(premisesFromErrandParameters(written)).toEqual({ ...address, choice: existing });
    expect(premisesFromErrandParameters(undefined)).toBeUndefined();
    expect(premisesFromErrandParameters([])).toBeUndefined();
    expect(premisesFromErrandParameters(written.filter((p) => p.key !== 'premisesPostalArea'))).toBeUndefined();
    expect(premisesFromErrandParameters(written.filter((p) => p.key !== 'restaurantNumber'))).toBeUndefined();
  });
});

describe('premisesChoiceEffect', () => {
  const existing = { kind: 'EXISTING', restaurantNumber: mockEnv.mockRestaurantNumber } as const;

  test('a new number is created when that is the choice', () => {
    expect(premisesChoiceEffect({ kind: 'NEW' }, [numberWith('ACTIVE')])).toBe('NEW_NUMBER');
  });

  test('a running assignment on the chosen number is replaced', () => {
    expect(premisesChoiceEffect(existing, [numberWith('ACTIVE')])).toBe('REPLACE_ASSIGNMENT');
  });

  test('a number whose assignment has ended, or that never had one, gets a new assignment', () => {
    expect(premisesChoiceEffect(existing, [numberWith('ENDED')])).toBe('NEW_ASSIGNMENT');
    expect(premisesChoiceEffect(existing, [numberWith(undefined)])).toBe('NEW_ASSIGNMENT');
  });
});
