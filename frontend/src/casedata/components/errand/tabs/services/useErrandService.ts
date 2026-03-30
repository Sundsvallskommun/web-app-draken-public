'use client';

import type { Asset } from '@casedata/interfaces/asset';
import { getAssetById } from '@casedata/services/asset-service';
import { RelationType, RelationService } from '@common/interfaces/relation-types';
import { getSourceRelations } from '@common/services/relations-service';
import type { RJSFSchema } from '@rjsf/utils';
import { useCallback, useEffect, useState } from 'react';
import { mapFormToServiceFromPayload, Service } from './casedata-service-mapper';

type UseErrandServicesArgs = {
  municipalityId: string;
  partyId: string;
  errandId: string;
  errandNumber: string;
  assetType: string;
  schema?: RJSFSchema | null;
  status?: string;
  origin?: string;
};

export function useErrandServices({
  municipalityId,
  partyId,
  errandId,
  errandNumber,
  assetType,
  schema = null,
  status,
  origin,
}: UseErrandServicesArgs) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const relations = await getSourceRelations(municipalityId, errandId, 'DESC');
      const assetIds = relations
        .filter((r) => r.type === RelationType.ASSET && r.target?.service === RelationService.PARTY_ASSETS)
        .map((r) => r.target.resourceId);

      if (assetIds.length === 0) {
        setServices([]);
        return;
      }

      const assetResponses = await Promise.all(
        assetIds.map((id) => getAssetById(municipalityId, id).catch(() => null))
      );
      const assets: Asset[] = assetResponses
        .map((r) => r?.data)
        .filter((a): a is Asset => !!a && (!status || a.status === status));

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
  }, [municipalityId, errandId, assetType, status, schema]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { services, loading, error, refetch, setServices };
}
