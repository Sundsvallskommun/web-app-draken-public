'use client';

import {
  CustomerAsset,
  CustomerErrandsPage,
  CustomerPlace,
  getCustomerAssets,
  getCustomerEngagements,
  getCustomerErrandCounts,
  getCustomerErrands,
  getCustomerInspections,
  getCustomerPlaces,
  toCustomerAssets,
} from '@common/services/customer-service';
import { useConfigStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useEffect, useMemo, useState } from 'react';
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
  /** The customer's closed inspections, for the Tillsyn card. */
  inspections: CustomerLookup<SupportErrand[]>;
  errandCounts: CustomerLookup<{ ongoing: number; closed: number }>;
  /** The page of the Ärenden tab, kept here so that switching tabs does not fetch it again. */
  errands: CustomerLookup<CustomerErrandsPage>;
  errandsPage: number;
  setErrandsPage: (page: number) => void;
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
  const assets = useMemo(
    (): CustomerLookup<CustomerAsset[]> =>
      fetchedAssets.status === 'done' ? { status: 'done', data: toCustomerAssets(fetchedAssets.data) } : fetchedAssets,
    [fetchedAssets]
  );
  const places = useCustomerLookup(
    key,
    municipalityId && knownAssets ? () => getCustomerPlaces(municipalityId, knownAssets) : undefined
  );
  const inspections = useCustomerLookup(
    key,
    municipalityId ? () => getCustomerInspections(municipalityId, customerId) : undefined
  );
  const errandCounts = useCustomerLookup(
    key,
    municipalityId ? () => getCustomerErrandCounts(municipalityId, customerId) : undefined
  );
  // A page chosen for another customer is not carried over.
  const [paging, setPaging] = useState({ key, page: 0 });
  const errandsPage = paging.key === key ? paging.page : 0;
  const errands = useCustomerLookup(
    `${key}|${errandsPage}`,
    municipalityId ? () => getCustomerErrands(municipalityId, customerId, errandsPage) : undefined
  );
  const engagements = useCustomerLookup(customerId, () => getCustomerEngagements(customerId));

  const failed = fetchedAssets.status === 'error';
  return {
    assets,
    places: failed ? fetchedAssets : places,
    inspections,
    errandCounts,
    errands,
    errandsPage,
    setErrandsPage: (page: number) => setPaging({ key, page }),
    engagements,
  };
};
