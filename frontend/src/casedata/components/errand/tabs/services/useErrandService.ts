'use client';

import type { Asset } from '@casedata/interfaces/asset';
import { getAssets, getDraftAssets } from '@casedata/services/asset-service';
import type { RJSFSchema } from '@rjsf/utils';
import { useCallback, useEffect, useState } from 'react';

import { mapFormToServiceFromPayload, Service } from './casedata-service-mapper';

type UseErrandServicesArgs = {
  municipalityId: string;
  partyId: string;
  errandNumber: string;
  assetType: string;
  schema?: RJSFSchema | null;
  origin?: string;
};

export function useErrandServices({
  municipalityId,
  partyId,
  errandNumber,
  assetType,
  schema = null,
  origin,
}: UseErrandServicesArgs) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const fetchParams = { municipalityId, partyId, assetId: errandNumber, type: assetType, origin };
      const [draftResp, activeResp] = await Promise.all([
        getDraftAssets(fetchParams),
        getAssets(fetchParams),
      ]);
      const draftAssets = draftResp?.data ?? [];
      const activeAssets = activeResp?.data ?? [];
      const draftIds = new Set(draftAssets.map((a) => a.id));
      const assets: Asset[] = [...draftAssets, ...activeAssets.filter((a) => !draftIds.has(a.id))];
      const mapped: Service[] = [];

      for (const a of assets) {
        const params = Array.isArray(a.jsonParameters) ? a.jsonParameters : [];
        params.forEach((p, idx) => {
          if (!p?.value || p?.key !== assetType) return;

          const parsed = typeof p.value === 'string' ? JSON.parse(p.value) : p.value;
          if (!parsed) return;
          const compositeId = `${a.id}#${idx}`;
          const s = mapFormToServiceFromPayload(parsed, schema, compositeId);
          if (s) mapped.push(s);
        });
      }

      mapped.sort((a, b) => a.id.localeCompare(b.id));
      setServices(mapped);
    } catch (e: any) {
      setError(e?.message ?? 'Kunde inte hämta insatser');
    } finally {
      setLoading(false);
    }
  }, [municipalityId, partyId, errandNumber, assetType, origin, schema]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { services, loading, error, refetch, setServices };
}
