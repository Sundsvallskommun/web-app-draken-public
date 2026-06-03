'use client';

import {
  getErrandServiceAssets,
  getPartyServiceAssets,
  mapAssetsToServices,
  Service,
} from '@casedata/services/casedata-service-assets-service';
import type { RJSFSchema } from '@rjsf/utils';
import { useCallback, useEffect, useState } from 'react';

type AssetServicesArgs = {
  municipalityId: string;
  partyId: string;
  assetType: string;
  schema?: RJSFSchema | null;
  origin?: string;
  errandId?: string;
};

function useAssetServices({ municipalityId, partyId, errandId, assetType, schema = null, origin }: AssetServicesArgs) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refetch = useCallback(async () => {
    if (!municipalityId || !partyId || !assetType || !schema) {
      setServices([]);
      setLoading(false);
      setError(undefined);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const assets = errandId
        ? await getErrandServiceAssets({ municipalityId, partyId, errandId, assetType, origin })
        : await getPartyServiceAssets({ municipalityId, partyId, assetType, origin });
      setServices(await mapAssetsToServices(municipalityId, assets, schema));
    } catch (e: any) {
      setError(e?.message ?? (errandId ? 'Kunde inte hämta insatser' : 'Kunde inte hämta personens insatser'));
    } finally {
      setLoading(false);
    }
  }, [municipalityId, partyId, errandId, assetType, schema, origin]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { services, loading, error, refetch };
}

type UseErrandServicesArgs = Omit<AssetServicesArgs, 'errandId'> & { errandId: string };

export function useErrandServices(args: UseErrandServicesArgs) {
  return useAssetServices(args);
}

type UsePartyServicesArgs = Omit<AssetServicesArgs, 'errandId'> & { excludeIds?: string[] };

export function usePartyServices({ excludeIds, ...rest }: UsePartyServicesArgs) {
  const { services, ...state } = useAssetServices(rest);
  const excludeSet = excludeIds?.length ? new Set(excludeIds) : null;
  const filteredServices = excludeSet ? services.filter((s) => !excludeSet.has(s.id)) : services;
  return { ...state, services: filteredServices };
}
