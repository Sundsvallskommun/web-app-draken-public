'use client';

import type { Asset } from '@casedata/interfaces/asset';
import { getAssets, getDraftAssets } from '@casedata/services/asset-service';
import type { RJSFSchema } from '@rjsf/utils';
import { useCallback, useEffect, useState } from 'react';

import { mapFormToServiceFromPayload, Service } from './casedata-service-mapper';

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
    setLoading(true);
    setError(undefined);
    try {
      if (!errandId || !partyId) {
        setServices([]);
        return;
      }
      const fetchParams = { municipalityId, partyId, errandId, type: assetType, origin };
      const [draftResp, activeResp] = await Promise.all([getDraftAssets(fetchParams), getAssets(fetchParams)]);
      const draftAssets = draftResp?.data ?? [];
      const activeAssets = activeResp?.data ?? [];
      const draftIds = new Set(draftAssets.map((a) => a.id));
      const assets: Asset[] = [...draftAssets, ...activeAssets.filter((a) => !draftIds.has(a.id))];
      const mapped: Service[] = [];

      for (const a of assets) {
        const param = a.jsonParameters?.[0];
        if (!param?.value) continue;

        const parsed = typeof param.value === 'string' ? JSON.parse(param.value) : param.value;
        if (!parsed) continue;

        const s = mapFormToServiceFromPayload(parsed, schema, a.id);
        if (s) {
          s.schemaVersion = param.schemaId?.split('_').pop() ?? '';
          s.issued = a.issued ?? '';
          s.validTo = a.validTo ?? '';
          mapped.push(s);
        }
      }

      setServices(mapped);
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
