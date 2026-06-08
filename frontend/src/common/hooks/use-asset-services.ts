'use client';

import { Asset } from '@common/interfaces/asset';
import {
  getErrandServiceAssets,
  getPartyServiceAssets,
  mapAssetsToServices,
  Service,
} from '@common/services/service-assets-service';
import type { RJSFSchema } from '@rjsf/utils';
import { useCallback, useEffect, useState } from 'react';

type AssetServicesArgs = {
  municipalityId: string;
  partyId: string;
  assetTypes: string[];
  schema?: RJSFSchema | null;
  origin?: string;
  errandId?: string;
};

const fetchAcrossTypes = async (
  fetcher: (assetType: string) => Promise<Asset[]>,
  assetTypes: string[]
): Promise<Asset[]> => {
  const results = await Promise.allSettled(assetTypes.map(fetcher));
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
};

function useAssetServices({ municipalityId, partyId, errandId, assetTypes, schema = null, origin }: AssetServicesArgs) {
  const [errandServices, setErrandServices] = useState<Service[]>([]);
  const [partyServices, setPartyServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const assetTypesKey = assetTypes.join('|');

  const refetch = useCallback(async () => {
    if (!municipalityId || !partyId || assetTypes.length === 0) {
      if (errandId) {
        setErrandServices([]);
      } else {
        setPartyServices([]);
      }
      setLoading(false);
      setError(undefined);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const assets = errandId
        ? await fetchAcrossTypes(
            (assetType) => getErrandServiceAssets({ municipalityId, partyId, errandId, assetType, origin }),
            assetTypes
          )
        : await fetchAcrossTypes(
            (assetType) => getPartyServiceAssets({ municipalityId, partyId, assetType, origin }),
            assetTypes
          );
      if (errandId) {
        setErrandServices(await mapAssetsToServices(municipalityId, assets, schema ?? null));
      } else {
        setPartyServices(await mapAssetsToServices(municipalityId, assets, schema ?? null));
      }
    } catch (e: any) {
      setError(e?.message ?? (errandId ? 'Kunde inte hämta insatser' : 'Kunde inte hämta personens insatser'));
    } finally {
      setLoading(false);
    }
    // assetTypesKey collapses array identity changes; the underlying values still gate refetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId, partyId, errandId, assetTypesKey, schema, origin]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { errandServices, partyServices, loading, error, refetch };
}

type UseErrandAssetServicesArgs = Omit<AssetServicesArgs, 'errandId'> & { errandId: string };

export function useErrandAssetServices(args: UseErrandAssetServicesArgs) {
  return useAssetServices(args);
}

type UsePartyAssetServicesArgs = Omit<AssetServicesArgs, 'errandId'> & { excludeIds?: string[] };

export function usePartyAssetServices({ excludeIds, ...rest }: UsePartyAssetServicesArgs) {
  const { partyServices, ...state } = useAssetServices(rest);
  const excludeSet = excludeIds?.length ? new Set(excludeIds) : null;
  const filteredServices = excludeSet ? partyServices.filter((s) => !excludeSet.has(s.id)) : partyServices;
  return { ...state, partyServices: filteredServices };
}
