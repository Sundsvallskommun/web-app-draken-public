'use client';

import { CustomerPlace, getCustomerErrands } from '@common/services/customer-service';
import { useConfigStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';

export type CustomerLookup<T> = { status: 'loading' } | { status: 'error' } | { status: 'done'; data: T };

const LOADING = { status: 'loading' } as const;

/** Runs `load` once per `key`; a result for an earlier key is never returned. Waits while `load` is undefined. */
export const useCustomerLookup = <T>(key: string, load: (() => Promise<T>) | undefined): CustomerLookup<T> => {
  const [result, setResult] = useState<{ key: string; lookup: CustomerLookup<T> }>();
  const ready = !!load;

  useEffect(() => {
    if (!load) {
      return;
    }
    let cancelled = false;
    load()
      .then((data) => !cancelled && setResult({ key, lookup: { status: 'done', data } }))
      .catch(() => !cancelled && setResult({ key, lookup: { status: 'error' } }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return result?.key === key ? result.lookup : LOADING;
};

/** The customer's errands, once its places are known. */
export const useCustomerErrands = (
  customerId: string,
  places: CustomerLookup<CustomerPlace[]>
): CustomerLookup<SupportErrand[]> => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const knownPlaces = places.status === 'done' ? places.data : undefined;
  const placeKeys = knownPlaces?.map((place) => place.key).join(',');
  const errands = useCustomerLookup(
    `${municipalityId}|${customerId}|${placeKeys}`,
    municipalityId && knownPlaces ? () => getCustomerErrands(municipalityId, customerId, knownPlaces) : undefined
  );
  return places.status === 'error' ? places : errands;
};
