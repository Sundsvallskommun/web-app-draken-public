'use client';

import {
  getErrandServiceAssets,
  getPartyServiceAssets,
  mapAssetsToServices,
  Service,
} from '@casedata/services/casedata-service-assets-service';
import type { RJSFSchema } from '@rjsf/utils';
import { useCallback, useEffect, useState } from 'react';

type UseErrandServicesArgs = {
  municipalityId: string;
  partyId: string;
  errandId: string;
  assetType: string;
  schema?: RJSFSchema | null;
  origin?: string;
};

export function useErrandServices({
  municipalityId,
  partyId,
  errandId,
  assetType,
  schema = null,
  origin,
}: UseErrandServicesArgs) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refetch = useCallback(async () => {
    if (!municipalityId || !partyId || !errandId || !assetType || !schema) {
      setServices([]);
      setLoading(false);
      setError(undefined);
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const assets = await getErrandServiceAssets({ municipalityId, partyId, errandId, assetType, origin });
      setServices(await mapAssetsToServices(municipalityId, assets, schema));
    } catch (e: any) {
      setError(e?.message ?? 'Kunde inte hämta insatser');
    } finally {
      setLoading(false);
    }
  }, [municipalityId, partyId, errandId, assetType, origin, schema]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { services, loading, error, refetch, setServices };
}

type UsePartyServicesArgs = {
  municipalityId: string;
  partyId: string;
  assetType: string;
  schema?: RJSFSchema | null;
  origin?: string;
  excludeIds?: string[];
};

export function usePartyServices({
  municipalityId,
  partyId,
  assetType,
  schema = null,
  origin,
  excludeIds,
}: UsePartyServicesArgs) {
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
      const assets = await getPartyServiceAssets({ municipalityId, partyId, assetType, origin });
      setServices(await mapAssetsToServices(municipalityId, assets, schema));
    } catch (e: any) {
      setError(e?.message ?? 'Kunde inte hämta personens insatser');
    } finally {
      setLoading(false);
    }
  }, [municipalityId, partyId, assetType, origin, schema]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const excludeSet = excludeIds ? new Set(excludeIds) : null;
  const filteredServices = excludeSet ? services.filter((s) => !excludeSet.has(s.id)) : services;

  return { services: filteredServices, loading, error, refetch };
}
