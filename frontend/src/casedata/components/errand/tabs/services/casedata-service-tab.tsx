'use client';

import {
  buildCreateAssetPayload,
  buildUpdateAssetPayload,
  createAsset,
  getAssets,
  updateAsset,
} from '@casedata/services/asset-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import SchemaForm from '@common/components/json/schema/schema-form.compontant';
import { getLatestRjsfSchema } from '@common/components/json/utils/schema-utils';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useAppContext } from '@contexts/app.context';
import type { RJSFSchema } from '@rjsf/utils';
import { useSnackbar } from '@sk-web-gui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { ServiceListComponent } from './casedata-service-list.component';
import { Service } from './casedata-service-mapper';
import { useErrandServices } from './useErrandService';

const fromCompositeId = (id: string) => {
  const [assetUuid, idxStr] = id.split('#');
  return { assetUuid, paramIndex: Number(idxStr) };
};

export const CasedataServicesTab: React.FC = () => {
  const { errand } = useAppContext();
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [editing, setEditing] = useState<Service | null>(null);
  const [schemaId, setSchemaId] = useState<string>('');
  const toast = useSnackbar();

  const assetType = 'FTErrandAssets';

  const partyId = getOwnerStakeholder(errand).personId;
  const errandNr = errand.errandNumber!;

  useEffect(() => {
    (async () => {
      const { schema, schemaId } = await getLatestRjsfSchema(assetType);
      setSchema(schema);
      setSchemaId(schemaId);
    })();
  }, [assetType]);
  const { services, loading, error, refetch } = useErrandServices({
    partyId,
    errandNumber: errandNr,
    assetType,
    status: 'ACTIVE',
    schema,
  });

  const removeService = useCallback(
    async (compositeId: string) => {
      try {
        const { assetUuid, paramIndex } = fromCompositeId(compositeId);

        const res = await getAssets({ partyId, assetId: errandNr, type: assetType });
        const asset = (res?.data ?? []).find((a) => a.id === assetUuid);
        if (!asset) {
          await refetch();
          return;
        }

        const params = Array.isArray(asset.jsonParameters) ? asset.jsonParameters : [];
        if (paramIndex < 0 || paramIndex >= params.length) {
          await refetch();
          return;
        }

        const newParams = params.filter((_, i) => i !== paramIndex);

        await updateAsset(asset.id, {
          origin: asset.origin,
          partyId: asset.partyId,
          assetId: asset.assetId,
          type: asset.type,
          issued: asset.issued ?? null,
          validTo: asset.validTo ?? null,
          status: asset.status,
          description: asset.description ?? '',
          additionalParameters: asset.additionalParameters ?? {},
          jsonParameters: newParams,
        });

        await refetch();
        toast(
          getToastOptions({
            message: 'Insatsen togs bort.',
            status: 'success',
          })
        );
      } catch (e: any) {
        toast(
          getToastOptions({
            message: e?.message ?? 'Något gick fel när insatsen skulle tas bort.',
            status: 'error',
          })
        );
      }
    },
    [partyId, errandNr, assetType, refetch, toast]
  );

  const handleSubmit = useCallback(
    async (payload: any) => {
      if (!schema || !schemaId) return;
      try {
        const list = await getAssets({ partyId, assetId: errandNr, type: assetType });
        const existingFull = (list?.data ?? [])[0];

        if (editing || existingFull) {
          const targetId = editing?.id ?? existingFull!.id;
          const fullForMerge =
            editing?.id === existingFull?.id && existingFull
              ? existingFull
              : existingFull ??
                (await (async () => {
                  const refetchFull = await getAssets({ partyId, assetId: errandNr, type: assetType });
                  return (refetchFull?.data ?? [])[0];
                })());

          await updateAsset(
            targetId,
            buildUpdateAssetPayload(
              payload,
              schema,
              { schemaId, assetType, partyId, assetId: errandNr },
              fullForMerge as any
            )
          );
        } else {
          await createAsset(
            buildCreateAssetPayload(payload, schema, {
              schemaId,
              assetType,
              partyId,
              assetId: errandNr,
            })
          );

          toast(
            getToastOptions({
              message: 'Ny insats tillagd.',
              status: 'success',
            })
          );
        }

        await refetch();
        setEditing(null);
        setFormData({});
      } catch (e: any) {
        toast(
          getToastOptions({
            message: e?.message ?? 'Något gick fel när insatsen skulle sparas.',
            status: 'error',
          })
        );
      }
    },
    [schema, editing, schemaId, assetType, partyId, errandNr, refetch, toast]
  );

  return (
    <div className="w-full py-24 px-32">
      <h2 className="text-h4-sm md:text-h4-md">Insatser</h2>
      <p className="mt-sm text-md">
        Här specificeras vilka insatser som omfattas av färdtjänstbeslutet, samt eventuella tilläggstjänster och den
        service kunden har rätt till vid sina resor.
      </p>

      <div className="mt-24">
        <SchemaForm schema={schema} formData={formData} onChange={(fd) => setFormData(fd)} onSubmit={handleSubmit} />
      </div>

      <div className="mt-32 pt-24">
        <h4 className="text-h6 mb-sm border-b">Här listas de insatser som fattats kring ärendet</h4>
        {loading ? (
          <div>Hämtar insatser…</div>
        ) : error ? (
          <div className="text-error">{error}</div>
        ) : (
          <ServiceListComponent services={services} onRemove={removeService} />
        )}
      </div>
    </div>
  );
};
