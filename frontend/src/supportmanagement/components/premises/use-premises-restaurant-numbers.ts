'use client';

import type { Address } from '@common/data-contracts/licensed-business/data-contracts';
import {
  findPremisesAddress,
  getRestaurantNumbersWithAssignments,
  type PremisesAddressMatch,
  type RestaurantNumberWithAssignment,
  searchLicensedBusinessAddresses,
} from '@supportmanagement/services/licensed-business-service';
import type { PremisesAddress } from '@supportmanagement/services/support-premises-address-service';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface PremisesRestaurantNumbers {
  loading: boolean;
  error?: string;
  /** How the premises address was matched; undefined before a match or when there is no address to go on. */
  match?: PremisesAddressMatch;
  /** The address whose restaurant numbers are shown: the exact match, or the one picked from search results. */
  address?: Address;
  restaurantNumbers: RestaurantNumberWithAssignment[];
  /** Shows the restaurant numbers of an address picked from the search results. */
  selectAddress: (address: Address) => void;
  /** Replaces the matched addresses with a free-text search. */
  search: (query: string) => void;
}

/**
 * Finds the premises address in LicensedBusiness and loads the restaurant numbers there, each with its
 * most recent assignment. An exact match loads the numbers straight away; search results wait for
 * the person to pick an address.
 */
export const usePremisesRestaurantNumbers = (
  municipalityId: string | undefined,
  premises: PremisesAddress | undefined
): PremisesRestaurantNumbers => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [match, setMatch] = useState<PremisesAddressMatch>();
  const [address, setAddress] = useState<Address>();
  const [restaurantNumbers, setRestaurantNumbers] = useState<RestaurantNumberWithAssignment[]>([]);
  // Only the latest request may write state, so a slow answer cannot overwrite a newer one.
  const requestId = useRef(0);

  const run = useCallback(async (request: (isCurrent: () => boolean) => Promise<void>, failure: string) => {
    const id = ++requestId.current;
    const isCurrent = () => id === requestId.current;
    setLoading(true);
    setError(undefined);
    try {
      await request(isCurrent);
    } catch {
      if (isCurrent()) setError(failure);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, []);

  const loadRestaurantNumbers = useCallback(
    async (selected: Address, isCurrent: () => boolean) => {
      setAddress(selected);
      setRestaurantNumbers([]);
      if (!municipalityId || !selected.id) return;
      const numbers = await getRestaurantNumbersWithAssignments(municipalityId, selected.id);
      if (isCurrent()) setRestaurantNumbers(numbers);
    },
    [municipalityId]
  );

  const street = premises?.street;
  const postalCode = premises?.postalCode;

  useEffect(() => {
    setMatch(undefined);
    setAddress(undefined);
    setRestaurantNumbers([]);
    if (!municipalityId || !street) {
      requestId.current++;
      setLoading(false);
      setError(undefined);
      return;
    }

    void run(async (isCurrent) => {
      const found = await findPremisesAddress(municipalityId, { street, postalCode });
      if (!isCurrent()) return;
      setMatch(found);
      if (found?.match === 'EXACT') await loadRestaurantNumbers(found.address, isCurrent);
    }, 'Serveringsställen kunde inte hämtas');
  }, [municipalityId, street, postalCode, run, loadRestaurantNumbers]);

  const selectAddress = useCallback(
    (selected: Address) => {
      void run((isCurrent) => loadRestaurantNumbers(selected, isCurrent), 'Serveringsställen kunde inte hämtas');
    },
    [run, loadRestaurantNumbers]
  );

  const search = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!municipalityId || !trimmed) return;
      void run(async (isCurrent) => {
        setAddress(undefined);
        setRestaurantNumbers([]);
        const addresses = await searchLicensedBusinessAddresses(municipalityId, trimmed);
        if (isCurrent()) setMatch({ match: 'SEARCH', query: trimmed, addresses });
      }, 'Adressökningen misslyckades');
    },
    [municipalityId, run]
  );

  return { loading, error, match, address, restaurantNumbers, selectAddress, search };
};
