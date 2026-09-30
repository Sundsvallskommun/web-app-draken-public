import type {
  Address,
  Addresses,
  AddressRestaurantNumber,
  Assignment,
} from '@common/data-contracts/licensed-business/data-contracts';
import { type ApiResponse, apiService } from '@common/services/api-service';

import type { PremisesAddress } from './support-premises-address-service';

const baseUrl = (municipalityId: string) => `${encodeURIComponent(municipalityId)}/licensed-business`;

/** The one registered address matching street and postal code, or null when the register has none. */
export const lookupLicensedBusinessAddress = async (
  municipalityId: string,
  streetAddress: string,
  postalCode: string
): Promise<Address | null> => {
  const params = new URLSearchParams({ streetAddress, postalCode });
  const res = await apiService.get<ApiResponse<Address | null>>(
    `${baseUrl(municipalityId)}/addresses/lookup?${params}`
  );
  return res.data.data ?? null;
};

/** Addresses shown per search. More matches than this means the query should be narrowed, not paged through. */
export const ADDRESS_SEARCH_LIMIT = 12;

export interface AddressSearchResult {
  addresses: Address[];
  /** Matches in the register; more than `addresses.length` when the search should be narrowed. */
  totalRecords: number;
}

/**
 * Free-text address search, first page only. The register matches on prefix: "Storgatan 1" finds
 * Storgatan 11, 12, 13 ... and not only Storgatan 1.
 */
export const searchLicensedBusinessAddresses = async (
  municipalityId: string,
  query: string
): Promise<AddressSearchResult> => {
  const params = new URLSearchParams({ query, limit: String(ADDRESS_SEARCH_LIMIT) });
  const res = await apiService.get<ApiResponse<Addresses>>(`${baseUrl(municipalityId)}/addresses/search?${params}`);
  const addresses = res.data.data?.content ?? [];
  return { addresses, totalRecords: res.data.data?._meta?.totalRecords ?? addresses.length };
};

const getAddressRestaurantNumbers = async (
  municipalityId: string,
  addressId: string
): Promise<AddressRestaurantNumber[]> => {
  const res = await apiService.get<ApiResponse<AddressRestaurantNumber[]>>(
    `${baseUrl(municipalityId)}/addresses/${encodeURIComponent(addressId)}/restaurant-numbers`
  );
  return res.data.data ?? [];
};

/** The most recent assignment of the number, or null when it has never been assigned. */
const getRestaurantNumberAssignment = async (
  municipalityId: string,
  restaurantNumber: string
): Promise<Assignment | null> => {
  const res = await apiService.get<ApiResponse<Assignment | null>>(
    `${baseUrl(municipalityId)}/restaurant-numbers/${encodeURIComponent(restaurantNumber)}/assignment`
  );
  return res.data.data ?? null;
};

/**
 * How the premises address was matched in the register:
 * - EXACT: street and postal code identified one address.
 * - SEARCH: no exact match was possible, so the street was searched; the person picks among `addresses`.
 */
export type PremisesAddressMatch =
  | { match: 'EXACT'; address: Address }
  | ({ match: 'SEARCH'; query: string } & AddressSearchResult);

/**
 * Finds the premises in the register: an exact lookup when both street and postal code are known,
 * falling back to a free-text search on the street when the lookup finds nothing or the postal code
 * is missing. Undefined when there is no premises address to go on.
 */
export const findPremisesAddress = async (
  municipalityId: string,
  premises: Pick<PremisesAddress, 'street' | 'postalCode'> | undefined
): Promise<PremisesAddressMatch | undefined> => {
  if (!premises) return undefined;

  if (premises.postalCode) {
    const address = await lookupLicensedBusinessAddress(municipalityId, premises.street, premises.postalCode);
    if (address) return { match: 'EXACT', address };
  }

  const result = await searchLicensedBusinessAddresses(municipalityId, premises.street);
  return { match: 'SEARCH', query: premises.street, ...result };
};

export interface RestaurantNumberWithAssignment extends AddressRestaurantNumber {
  /** Null when the number has never been assigned. */
  assignment: Assignment | null;
  /** The assignment could not be fetched; the number itself is still shown. */
  assignmentFailed: boolean;
}

/** Every restaurant number at the address, each with its most recent assignment. */
export const getRestaurantNumbersWithAssignments = async (
  municipalityId: string,
  addressId: string
): Promise<RestaurantNumberWithAssignment[]> => {
  const numbers = await getAddressRestaurantNumbers(municipalityId, addressId);

  const assignments = await Promise.allSettled(
    numbers.map((restaurantNumber) =>
      restaurantNumber.number
        ? getRestaurantNumberAssignment(municipalityId, restaurantNumber.number)
        : Promise.resolve(null)
    )
  );

  return numbers.map((restaurantNumber, index) => {
    const result = assignments[index];
    return {
      ...restaurantNumber,
      assignment: result?.status === 'fulfilled' ? result.value : null,
      assignmentFailed: result?.status === 'rejected',
    };
  });
};
