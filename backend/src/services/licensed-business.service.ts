import { User } from '@interfaces/users.interface';

import { apiServiceName } from '@/config/api-config';
import { Address, Addresses, AddressRestaurantNumber, Assignment } from '@/data-contracts/licensed-business/data-contracts';

import ApiService, { ApiResponse } from './api.service';

export interface AddressSearchPaging {
  page?: number;
  limit?: number;
}

// routing-controllers resets HttpException's prototype, so the status is read off the object, not via instanceof.
const isNotFound = (error: unknown): boolean => (error as { status?: number })?.status === 404;

/** A 404 from these endpoints is an answer - no such address, or a number never assigned - so it becomes null. */
const orNullWhenNotFound = async <T>(request: Promise<ApiResponse<T>>): Promise<T | null> => {
  try {
    return (await request).data;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

/** Read-only access to the LicensedBusiness register of premises addresses and their restaurant numbers (serveringsställen). */
export class LicensedBusinessService {
  private apiService = new ApiService();
  private LICENSED_BUSINESS_SERVICE = apiServiceName('licensed-business');

  private url(municipalityId: string, ...path: string[]): string {
    return [this.LICENSED_BUSINESS_SERVICE, encodeURIComponent(municipalityId), ...path].join('/');
  }

  /** The one address matching street and postal code. Upstream normalizes case, whitespace and "1 A"/"1A". */
  async lookupAddress(municipalityId: string, streetAddress: string, postalCode: string, user: User): Promise<Address | null> {
    const url = this.url(municipalityId, 'addresses', 'lookup');
    return orNullWhenNotFound(this.apiService.get<Address>({ url, params: { streetAddress, postalCode } }, user));
  }

  /** Free-text address search; an empty page when nothing matches. */
  async searchAddresses(municipalityId: string, query: string, paging: AddressSearchPaging, user: User): Promise<Addresses> {
    const url = this.url(municipalityId, 'addresses', 'search');
    const response = await this.apiService.get<Addresses>({ url, params: { query, page: paging.page, limit: paging.limit } }, user);
    return response.data;
  }

  /** Every restaurant number at the address, each with its status and the premises name of its shown assignment. */
  async getAddressRestaurantNumbers(municipalityId: string, addressId: string, user: User): Promise<AddressRestaurantNumber[]> {
    const url = this.url(municipalityId, 'addresses', encodeURIComponent(addressId), 'restaurant-numbers');
    const response = await this.apiService.get<AddressRestaurantNumber[]>({ url }, user);
    return response.data ?? [];
  }

  /** The most recent assignment of the number, or null when it has never been assigned. */
  async getRestaurantNumberAssignment(municipalityId: string, restaurantNumber: string, user: User): Promise<Assignment | null> {
    const url = this.url(municipalityId, 'restaurant-numbers', encodeURIComponent(restaurantNumber), 'assignment');
    return orNullWhenNotFound(this.apiService.get<Assignment>({ url }, user));
  }
}
