import { apiService } from '@common/services/api-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import {
  findPremisesAddress,
  getRestaurantNumbersWithAssignments,
  lookupLicensedBusinessAddress,
  searchLicensedBusinessAddresses,
} from './licensed-business-service';

vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn() } }));

const MUNICIPALITY_ID = '2281';
const BASE = `${MUNICIPALITY_ID}/licensed-business`;
const PREMISES = mockEnv.mockPremisesAddress;

const address = {
  id: mockEnv.mockLicensedBusinessAddressId,
  streetAddress: PREMISES.street,
  postalCode: PREMISES.postalCode,
  postalArea: PREMISES.city,
};
const otherAddress = { ...address, id: mockEnv.mockSecondaryLicensedBusinessAddressId };

const activeNumber = {
  id: mockEnv.mockRestaurantNumberId,
  number: mockEnv.mockRestaurantNumber,
  status: 'ACTIVE',
  premisesName: mockEnv.mockPremisesName,
};
const availableNumber = { number: mockEnv.mockSecondaryRestaurantNumber, status: 'AVAILABLE' };

const assignment = {
  id: mockEnv.mockAssignmentId,
  licenseHolder: { orgNumber: mockEnv.mockOrganizationNumber, name: mockEnv.mockCompanyName },
  premisesName: mockEnv.mockPremisesName,
  status: 'ACTIVE',
};

/** Routes each BFF GET to a response; an Error value rejects that request. */
const respond = (routes: Record<string, unknown>) =>
  vi.mocked(apiService.get).mockImplementation(async (url: string) => {
    const path = url.split('?')[0];
    if (!(path in routes)) throw new Error(`unexpected GET ${url}`);
    const data = routes[path];
    if (data instanceof Error) throw data;
    return { data: { data, message: 'success' } } as never;
  });

const requestedUrls = () => vi.mocked(apiService.get).mock.calls.map(([url]) => url);

beforeEach(() => {
  vi.mocked(apiService.get).mockReset();
});

describe('BFF requests', () => {
  test('the lookup sends street and postal code as query parameters', async () => {
    respond({ [`${BASE}/addresses/lookup`]: address });

    expect(await lookupLicensedBusinessAddress(MUNICIPALITY_ID, PREMISES.street, PREMISES.postalCode)).toEqual(address);
    expect(requestedUrls()).toEqual([
      `${BASE}/addresses/lookup?${new URLSearchParams({
        streetAddress: PREMISES.street,
        postalCode: PREMISES.postalCode,
      })}`,
    ]);
  });

  test('the search returns the addresses of the page, or none', async () => {
    respond({ [`${BASE}/addresses/search`]: { content: [address] } });
    expect(await searchLicensedBusinessAddresses(MUNICIPALITY_ID, PREMISES.street)).toEqual([address]);

    respond({ [`${BASE}/addresses/search`]: {} });
    expect(await searchLicensedBusinessAddresses(MUNICIPALITY_ID, PREMISES.street)).toEqual([]);
  });
});

describe('findPremisesAddress', () => {
  test('street and postal code matching one address is an exact match, without a search', async () => {
    respond({ [`${BASE}/addresses/lookup`]: address });

    expect(await findPremisesAddress(MUNICIPALITY_ID, PREMISES)).toEqual({ match: 'EXACT', address });
    expect(requestedUrls()).toHaveLength(1);
  });

  test('an address the lookup does not know falls back to a search on the street', async () => {
    respond({ [`${BASE}/addresses/lookup`]: null, [`${BASE}/addresses/search`]: { content: [address, otherAddress] } });

    expect(await findPremisesAddress(MUNICIPALITY_ID, PREMISES)).toEqual({
      match: 'SEARCH',
      query: PREMISES.street,
      addresses: [address, otherAddress],
    });
    expect(requestedUrls()[1]).toBe(`${BASE}/addresses/search?${new URLSearchParams({ query: PREMISES.street })}`);
  });

  test('without a postal code there is nothing to look up, so the street is searched directly', async () => {
    respond({ [`${BASE}/addresses/search`]: { content: [] } });

    expect(await findPremisesAddress(MUNICIPALITY_ID, { street: PREMISES.street })).toEqual({
      match: 'SEARCH',
      query: PREMISES.street,
      addresses: [],
    });
    expect(requestedUrls()).toHaveLength(1);
  });

  test('no premises address is nothing to find, and nothing is requested', async () => {
    expect(await findPremisesAddress(MUNICIPALITY_ID, undefined)).toBeUndefined();
    expect(apiService.get).not.toHaveBeenCalled();
  });

  test('a failing lookup is an error, not a reason to search', async () => {
    respond({ [`${BASE}/addresses/lookup`]: new Error('500') });

    await expect(findPremisesAddress(MUNICIPALITY_ID, PREMISES)).rejects.toThrow('500');
    expect(requestedUrls()).toHaveLength(1);
  });
});

describe('getRestaurantNumbersWithAssignments', () => {
  const numbersUrl = `${BASE}/addresses/${mockEnv.mockLicensedBusinessAddressId}/restaurant-numbers`;
  const assignmentUrl = (number: string) => `${BASE}/restaurant-numbers/${number}/assignment`;

  test('pairs every restaurant number at the address with its most recent assignment', async () => {
    respond({
      [numbersUrl]: [activeNumber, availableNumber],
      [assignmentUrl(mockEnv.mockRestaurantNumber)]: assignment,
      [assignmentUrl(mockEnv.mockSecondaryRestaurantNumber)]: null,
    });

    expect(await getRestaurantNumbersWithAssignments(MUNICIPALITY_ID, mockEnv.mockLicensedBusinessAddressId)).toEqual([
      { ...activeNumber, assignment, assignmentFailed: false },
      { ...availableNumber, assignment: null, assignmentFailed: false },
    ]);
  });

  test('a number whose assignment cannot be fetched is still listed', async () => {
    respond({
      [numbersUrl]: [activeNumber, availableNumber],
      [assignmentUrl(mockEnv.mockRestaurantNumber)]: new Error('502'),
      [assignmentUrl(mockEnv.mockSecondaryRestaurantNumber)]: null,
    });

    const numbers = await getRestaurantNumbersWithAssignments(MUNICIPALITY_ID, mockEnv.mockLicensedBusinessAddressId);

    expect(numbers.map((n) => [n.number, n.assignmentFailed])).toEqual([
      [mockEnv.mockRestaurantNumber, true],
      [mockEnv.mockSecondaryRestaurantNumber, false],
    ]);
  });

  test('an address without restaurant numbers asks for no assignments', async () => {
    respond({ [numbersUrl]: [] });

    expect(await getRestaurantNumbersWithAssignments(MUNICIPALITY_ID, mockEnv.mockLicensedBusinessAddressId)).toEqual(
      []
    );
    expect(requestedUrls()).toHaveLength(1);
  });
});
