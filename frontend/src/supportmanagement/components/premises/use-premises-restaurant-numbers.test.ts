// @vitest-environment jsdom
import {
  findPremisesAddress,
  getRestaurantNumbersWithAssignments,
  searchLicensedBusinessAddresses,
} from '@supportmanagement/services/licensed-business-service';
import type { PremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../../tests/mock-env';
import { usePremisesRestaurantNumbers } from './use-premises-restaurant-numbers';

vi.mock('@supportmanagement/services/licensed-business-service', () => ({
  findPremisesAddress: vi.fn(),
  getRestaurantNumbersWithAssignments: vi.fn(),
  searchLicensedBusinessAddresses: vi.fn(),
}));

const MUNICIPALITY_ID = '2281';
const PREMISES: PremisesAddress = { ...mockEnv.mockPremisesAddress, source: 'FORM' };

const address = {
  id: mockEnv.mockLicensedBusinessAddressId,
  streetAddress: PREMISES.street,
  postalCode: mockEnv.mockPremisesAddress.postalCode,
};
const otherAddress = { ...address, id: mockEnv.mockSecondaryLicensedBusinessAddressId };
const numbers = [
  { number: mockEnv.mockRestaurantNumber, status: 'ACTIVE', assignment: null, assignmentFailed: false },
] as never;

beforeEach(() => {
  vi.mocked(findPremisesAddress).mockReset();
  vi.mocked(getRestaurantNumbersWithAssignments).mockReset().mockResolvedValue(numbers);
  vi.mocked(searchLicensedBusinessAddresses).mockReset();
});
afterEach(cleanup);

const settled = async (result: { current: { loading: boolean } }) =>
  waitFor(() => expect(result.current.loading).toBe(false));

describe('usePremisesRestaurantNumbers', () => {
  test('an exact match loads the restaurant numbers of that address straight away', async () => {
    vi.mocked(findPremisesAddress).mockResolvedValue({ match: 'EXACT', address });

    const { result } = renderHook(() => usePremisesRestaurantNumbers(MUNICIPALITY_ID, PREMISES));
    await waitFor(() => expect(result.current.restaurantNumbers).toEqual(numbers));

    expect(result.current.address).toEqual(address);
    expect(vi.mocked(findPremisesAddress).mock.calls[0]).toEqual([
      MUNICIPALITY_ID,
      { street: PREMISES.street, postalCode: PREMISES.postalCode },
    ]);
    expect(vi.mocked(getRestaurantNumbersWithAssignments).mock.calls[0]).toEqual([MUNICIPALITY_ID, address.id]);
  });

  test('search results wait for an address to be picked', async () => {
    vi.mocked(findPremisesAddress).mockResolvedValue({
      match: 'SEARCH',
      query: PREMISES.street,
      addresses: [address, otherAddress],
      totalRecords: 2,
    });

    const { result } = renderHook(() => usePremisesRestaurantNumbers(MUNICIPALITY_ID, PREMISES));
    await settled(result);

    expect(result.current.match?.match).toBe('SEARCH');
    expect(result.current.address).toBeUndefined();
    expect(getRestaurantNumbersWithAssignments).not.toHaveBeenCalled();

    act(() => result.current.selectAddress(otherAddress));
    await waitFor(() => expect(result.current.restaurantNumbers).toEqual(numbers));

    expect(result.current.address).toEqual(otherAddress);
    expect(vi.mocked(getRestaurantNumbersWithAssignments).mock.calls[0]).toEqual([MUNICIPALITY_ID, otherAddress.id]);
  });

  test('a free-text search replaces the match and clears the picked address', async () => {
    vi.mocked(findPremisesAddress).mockResolvedValue({ match: 'EXACT', address });
    vi.mocked(searchLicensedBusinessAddresses).mockResolvedValue({
      addresses: [address, otherAddress],
      totalRecords: 2,
    });

    const { result } = renderHook(() => usePremisesRestaurantNumbers(MUNICIPALITY_ID, PREMISES));
    await waitFor(() => expect(result.current.restaurantNumbers).toEqual(numbers));

    act(() => result.current.search(`  ${mockEnv.mockCompanyAddress.street} `));
    await waitFor(() => expect(result.current.match?.match).toBe('SEARCH'));

    expect(result.current.match).toEqual({
      match: 'SEARCH',
      query: mockEnv.mockCompanyAddress.street,
      addresses: [address, otherAddress],
      totalRecords: 2,
    });
    expect(result.current.address).toBeUndefined();
    expect(result.current.restaurantNumbers).toEqual([]);
  });

  test('a fallback search with a single hit loads the restaurant numbers of that address', async () => {
    vi.mocked(findPremisesAddress).mockResolvedValue({
      match: 'SEARCH',
      query: PREMISES.street,
      addresses: [otherAddress],
      totalRecords: 1,
    });

    const { result } = renderHook(() => usePremisesRestaurantNumbers(MUNICIPALITY_ID, PREMISES));
    await waitFor(() => expect(result.current.restaurantNumbers).toEqual(numbers));

    expect(result.current.address).toEqual(otherAddress);
    expect(vi.mocked(getRestaurantNumbersWithAssignments).mock.calls).toEqual([[MUNICIPALITY_ID, otherAddress.id]]);
  });

  test('a free-text search with a single hit loads the restaurant numbers of that address', async () => {
    vi.mocked(findPremisesAddress).mockResolvedValue({
      match: 'SEARCH',
      query: PREMISES.street,
      addresses: [address, otherAddress],
      totalRecords: 2,
    });
    vi.mocked(searchLicensedBusinessAddresses).mockResolvedValue({ addresses: [otherAddress], totalRecords: 1 });

    const { result } = renderHook(() => usePremisesRestaurantNumbers(MUNICIPALITY_ID, PREMISES));
    await settled(result);
    expect(getRestaurantNumbersWithAssignments).not.toHaveBeenCalled();

    act(() => result.current.search(mockEnv.mockCompanyAddress.street));
    await waitFor(() => expect(result.current.restaurantNumbers).toEqual(numbers));

    expect(result.current.address).toEqual(otherAddress);
    expect(vi.mocked(getRestaurantNumbersWithAssignments).mock.calls).toEqual([[MUNICIPALITY_ID, otherAddress.id]]);
  });

  test('a blank search is ignored', async () => {
    vi.mocked(findPremisesAddress).mockResolvedValue({ match: 'EXACT', address });
    const { result } = renderHook(() => usePremisesRestaurantNumbers(MUNICIPALITY_ID, PREMISES));
    await settled(result);

    act(() => result.current.search('   '));

    expect(searchLicensedBusinessAddresses).not.toHaveBeenCalled();
  });

  test('without a premises address nothing is requested', async () => {
    const { result } = renderHook(() => usePremisesRestaurantNumbers(MUNICIPALITY_ID, undefined));
    await settled(result);

    expect(findPremisesAddress).not.toHaveBeenCalled();
    expect(result.current.match).toBeUndefined();
  });

  test('a failing request is reported as an error', async () => {
    vi.mocked(findPremisesAddress).mockRejectedValue(new Error('502'));

    const { result } = renderHook(() => usePremisesRestaurantNumbers(MUNICIPALITY_ID, PREMISES));

    await waitFor(() => expect(result.current.error).toBe('Serveringsställen kunde inte hämtas'));
    expect(result.current.loading).toBe(false);
  });

  test('a slow answer for an earlier address does not overwrite the current one', async () => {
    let resolveFirst: (value: Awaited<ReturnType<typeof findPremisesAddress>>) => void = () => undefined;
    vi.mocked(findPremisesAddress)
      .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce({
        match: 'SEARCH',
        query: mockEnv.mockCompanyAddress.street,
        addresses: [otherAddress],
        totalRecords: 1,
      });

    const { result, rerender } = renderHook(({ premises }) => usePremisesRestaurantNumbers(MUNICIPALITY_ID, premises), {
      initialProps: { premises: PREMISES },
    });
    rerender({ premises: { ...mockEnv.mockCompanyAddress, source: 'OWNER' } });
    await waitFor(() => expect(result.current.match?.match).toBe('SEARCH'));

    await act(async () => resolveFirst({ match: 'EXACT', address }));

    expect(result.current.match).toEqual({
      match: 'SEARCH',
      query: mockEnv.mockCompanyAddress.street,
      addresses: [otherAddress],
      totalRecords: 1,
    });
    // Only the current search's single hit is loaded; the stale exact match never is.
    await waitFor(() => expect(result.current.address).toEqual(otherAddress));
    expect(vi.mocked(getRestaurantNumbersWithAssignments).mock.calls).toEqual([[MUNICIPALITY_ID, otherAddress.id]]);
  });
});
