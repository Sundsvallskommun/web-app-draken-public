'use client';

import {
  CustomerAsset,
  CustomerPlace,
  getCustomerAssets,
  getCustomerEngagements,
  getCustomerErrands,
  getCustomerPlaces,
  withSourceErrands,
} from '@common/services/customer-service';
import { useConfigStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';
import type { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';

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

export interface CustomerData {
  assets: CustomerLookup<CustomerAsset[]>;
  places: CustomerLookup<CustomerPlace[]>;
  errands: CustomerLookup<SupportErrand[]>;
  engagements: CustomerLookup<LegalEntityEngagement[]>;
}

/** Everything the customer view shows, fetched once per customer and shared by its tabs. */
export const useCustomerData = (customerId: string): CustomerData => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const key = `${municipalityId}|${customerId}`;

  const fetchedAssets = useCustomerLookup(
    key,
    municipalityId ? () => getCustomerAssets(municipalityId, customerId) : undefined
  );
  const knownAssets = fetchedAssets.status === 'done' ? fetchedAssets.data : undefined;
  const assets = useCustomerLookup(
    key,
    municipalityId && knownAssets ? () => withSourceErrands(municipalityId, knownAssets) : undefined
  );
  const places = useCustomerLookup(
    key,
    municipalityId && knownAssets ? () => getCustomerPlaces(municipalityId, knownAssets) : undefined
  );
  const knownPlaces = places.status === 'done' ? places.data : undefined;
  const errands = useCustomerLookup(
    key,
    municipalityId && knownPlaces ? () => getCustomerErrands(municipalityId, customerId, knownPlaces) : undefined
  );
  const engagements = useCustomerLookup(customerId, () => getCustomerEngagements(customerId));

  const failed = fetchedAssets.status === 'error';
  const placesFailed = failed || places.status === 'error';
  return {
    assets: failed ? fetchedAssets : assets,
    places: failed ? fetchedAssets : places,
    errands: placesFailed ? { status: 'error' } : errands,
    engagements,
  };
};
