// @vitest-environment jsdom
import type { Address } from '@common/data-contracts/licensed-business/data-contracts';
import type { RestaurantNumberWithAssignment } from '@supportmanagement/services/licensed-business-service';
import type { DecisionPremises, PremisesChoice } from '@supportmanagement/services/support-decision-premises-service';
import type { PremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../tests/mock-env';
import { useDecisionPremises } from './use-decision-premises';
import { type PremisesRestaurantNumbers, usePremisesRestaurantNumbers } from './use-premises-restaurant-numbers';

vi.mock('./use-premises-restaurant-numbers', () => ({ usePremisesRestaurantNumbers: vi.fn() }));

const MUNICIPALITY_ID = '2281';
const PREMISES: PremisesAddress = { ...mockEnv.mockPremisesAddress, source: 'FORM' };

const address: Address = {
  id: mockEnv.mockLicensedBusinessAddressId,
  streetAddress: mockEnv.mockPremisesAddress.street,
  postalCode: mockEnv.mockPremisesAddress.postalCode,
  postalArea: mockEnv.mockPremisesAddress.city,
};
const otherAddress: Address = {
  ...address,
  id: mockEnv.mockSecondaryLicensedBusinessAddressId,
  streetAddress: mockEnv.mockCompanyAddress.street,
};

const activeNumber: RestaurantNumberWithAssignment = {
  number: mockEnv.mockRestaurantNumber,
  assignment: { status: 'ACTIVE' },
  assignmentFailed: false,
};
const EXISTING = { kind: 'EXISTING', restaurantNumber: mockEnv.mockRestaurantNumber } as const;

const lookupAt = (selected: Address | undefined, restaurantNumbers = [activeNumber]): PremisesRestaurantNumbers => ({
  loading: false,
  match: selected ? { match: 'EXACT', address: selected } : undefined,
  address: selected,
  restaurantNumbers: selected ? restaurantNumbers : [],
  selectAddress: vi.fn(),
  search: vi.fn(),
});

beforeEach(() => {
  vi.mocked(usePremisesRestaurantNumbers).mockReset().mockReturnValue(lookupAt(address));
});
afterEach(cleanup);

test('nothing is sent until a choice is made', () => {
  const { result } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES));

  expect(result.current.choice).toBeUndefined();
  expect(result.current.decided).toBeUndefined();
  expect(result.current.address?.street).toBe(address.streetAddress);
  expect(vi.mocked(usePremisesRestaurantNumbers).mock.calls[0]).toEqual([MUNICIPALITY_ID, PREMISES]);
});

test('choosing an existing number decides it with the registered address, and says what happens to its assignment', () => {
  const { result } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES));

  act(() => result.current.choose(EXISTING));

  expect(result.current.effect).toBe('REPLACE_ASSIGNMENT');
  expect(result.current.decided).toEqual({
    street: address.streetAddress,
    postalCode: address.postalCode,
    city: address.postalArea,
    choice: EXISTING,
  });
});

test('choosing a new number decides the address with that choice', () => {
  const { result } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES));

  act(() => result.current.choose({ kind: 'NEW' }));

  expect(result.current.effect).toBe('NEW_NUMBER');
  expect(result.current.decided).toEqual({
    street: address.streetAddress,
    postalCode: address.postalCode,
    city: address.postalArea,
    choice: { kind: 'NEW' },
  });
});

test('a choice made at one address is not carried over to another', () => {
  const { result, rerender } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES));
  act(() => result.current.choose({ kind: 'NEW' }));

  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(lookupAt(otherAddress));
  rerender();

  expect(result.current.choice).toBeUndefined();
  expect(result.current.decided).toBeUndefined();
});

test('a chosen number that is no longer among the numbers at the address is not decided', () => {
  const { result, rerender } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES));
  act(() => result.current.choose(EXISTING));

  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(lookupAt(address, []));
  rerender();

  expect(result.current.choice).toBeUndefined();
  expect(result.current.decided).toBeUndefined();
});

test('without a settled address there is nothing to choose for', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(lookupAt(undefined));
  const { result } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES));

  act(() => result.current.choose({ kind: 'NEW' }));

  expect(result.current.address).toBeUndefined();
  expect(result.current.choice).toBeUndefined();
  expect(result.current.decided).toBeUndefined();
});

const savedAt = (at: Address, choice: PremisesChoice = { kind: 'NEW' }): DecisionPremises => ({
  street: at.streetAddress ?? '',
  postalCode: at.postalCode ?? '',
  city: at.postalArea ?? '',
  choice,
});

test('a saved draft starts the lookup from its own address and brings its choice back', () => {
  vi.mocked(usePremisesRestaurantNumbers).mockReturnValue(lookupAt(otherAddress));
  const saved = savedAt(otherAddress, EXISTING);

  const { result } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES, saved));

  expect(vi.mocked(usePremisesRestaurantNumbers).mock.calls[0]).toEqual([
    MUNICIPALITY_ID,
    { street: saved.street, postalCode: saved.postalCode, city: saved.city, source: PREMISES.source },
  ]);
  expect(result.current.choice).toEqual(EXISTING);
  expect(result.current.decided?.choice).toEqual(EXISTING);
});

test('a draft saved with a new number asked for comes back as that choice', () => {
  const { result } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES, savedAt(address)));

  expect(result.current.choice).toEqual({ kind: 'NEW' });
});

test('what a draft says about another address than the one settled on is not a choice in hand', () => {
  const { result } = renderHook(() => useDecisionPremises(MUNICIPALITY_ID, PREMISES, savedAt(otherAddress, EXISTING)));

  expect(result.current.choice).toBeUndefined();
  expect(result.current.decided).toBeUndefined();
});

test('a choice made after the draft was read stands while the draft says the same', () => {
  const { result, rerender } = renderHook(() =>
    // Read anew on every render, as the caller does: the same content must not restore the choice again.
    useDecisionPremises(MUNICIPALITY_ID, PREMISES, savedAt(address, EXISTING))
  );
  expect(result.current.choice).toEqual(EXISTING);

  act(() => result.current.choose({ kind: 'NEW' }));
  rerender();

  expect(result.current.choice).toEqual({ kind: 'NEW' });
});
