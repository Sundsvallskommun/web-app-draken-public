import type { Address } from '@common/data-contracts/licensed-business/data-contracts';
import { describe, expect, test } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import type { PremisesAddressMatch, RestaurantNumberWithAssignment } from './licensed-business-service';
import {
  decisionPremisesAddress,
  fromDecisionParameters,
  premisesChoiceEffect,
  toDecisionPremisesParameters,
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

describe('decision parameters', () => {
  const address = { street: ERRAND.street, postalCode: ERRAND.postalCode, city: ERRAND.city };

  test('an existing restaurant number is sent with the address', () => {
    expect(
      toDecisionPremisesParameters(address, { kind: 'EXISTING', restaurantNumber: mockEnv.mockRestaurantNumber })
    ).toEqual([
      { key: 'restaurantNumber', values: [mockEnv.mockRestaurantNumber] },
      { key: 'street', values: [ERRAND.street] },
      { key: 'postalCode', values: [ERRAND.postalCode] },
      { key: 'city', values: [ERRAND.city] },
    ]);
  });

  test('a new restaurant number is asked for by sending the address alone', () => {
    expect(toDecisionPremisesParameters(address, { kind: 'NEW' }).map((parameter) => parameter.key)).toEqual([
      'street',
      'postalCode',
      'city',
    ]);
  });

  test('the premises are read back from the parameters of a decision', () => {
    const existing = toDecisionPremisesParameters(address, {
      kind: 'EXISTING',
      restaurantNumber: mockEnv.mockRestaurantNumber,
    });

    expect(fromDecisionParameters(existing)).toEqual({ ...address, restaurantNumber: mockEnv.mockRestaurantNumber });
    expect(fromDecisionParameters(toDecisionPremisesParameters(address, { kind: 'NEW' }))).toEqual({
      ...address,
      restaurantNumber: undefined,
    });
  });

  test('a decision without the address carries no premises', () => {
    expect(fromDecisionParameters(undefined)).toBeUndefined();
    expect(fromDecisionParameters([])).toBeUndefined();
    expect(fromDecisionParameters([{ key: 'street', values: [ERRAND.street] }])).toBeUndefined();
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
