'use client';

import {
  buildCreateAssetPayload,
  buildUpdateAssetPayload,
  createAsset,
  getAssets,
  updateAsset,
} from '@casedata/services/asset-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { ServicesObjectFieldTemplate } from '@common/components/json/fields/services-object-field-template.componant';
import SchemaForm from '@common/components/json/schema/schema-form.compontant';
import { getLatestRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useAppContext } from '@contexts/app.context';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { useSnackbar } from '@sk-web-gui/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ServiceListComponent } from './casedata-service-list.component';
import { Service } from './casedata-service-mapper';
import { useErrandServices } from './useErrandService';

const fromCompositeId = (id: string) => {
  const [assetUuid, idxStr] = id.split('#');
  return { assetUuid, paramIndex: Number(idxStr) };
};

//Temporary transport mode filtering based on case type until final specicication is done.
//Final solution should be export to json schema API with different schema per case type.
const TRANSPORT_MODE_BY_CASE_TYPE: Record<string, string[]> = {
  PARATRANSIT: ['vanligt_sate_personbil', 'fordon_hogt_insteg', 'rullstolsplats', 'rullstolsplats_stor'],
  PARATRANSIT_RENEWAL: ['vanligt_sate_personbil', 'fordon_hogt_insteg', 'rullstolsplats', 'rullstolsplats_stor'],
  PARATRANSIT_NOTIFICATION: ['vanligt_sate_personbil', 'fordon_hogt_insteg', 'rullstolsplats', 'rullstolsplats_stor'],

  PARATRANSIT_NATIONAL: ['tag', 'buss', 'flyg', 'bat', 'personbilstaxi', 'rullstolstaxi'],
  PARATRANSIT_NOTIFICATION_NATIONAL: ['tag', 'buss', 'flyg', 'bat', 'personbilstaxi', 'rullstolstaxi'],
};

function filterSchemaByCase(schema: RJSFSchema | null, caseType: string): RJSFSchema | null {
  if (!schema) return null;
  const allowedModes = TRANSPORT_MODE_BY_CASE_TYPE[caseType];
  if (!allowedModes) return schema;

  const filtered = JSON.parse(JSON.stringify(schema));
  if (filtered.properties?.transportMode?.items?.oneOf) {
    filtered.properties.transportMode.items.oneOf = filtered.properties.transportMode.items.oneOf.filter(
      (opt: { const: string }) => allowedModes.includes(opt.const)
    );
  }
  return filtered;
}

export const CasedataServicesTab: React.FC = () => {
  const { municipalityId, errand } = useAppContext();
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<UiSchema | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [editing, setEditing] = useState<Service | null>(null);
  const [schemaId, setSchemaId] = useState<string>('');
  const toast = useSnackbar();

  const assetType = 'FTErrandAssets';

  const partyId = getOwnerStakeholder(errand).personId;
  const errandNr = errand.errandNumber!;

  const filteredSchema = useMemo(() => {
    return filterSchemaByCase(schema, errand?.caseType ?? '');
  }, [schema, errand?.caseType]);

  useEffect(() => {
    (async () => {
      const { schema, schemaId } = await getLatestRjsfSchema(municipalityId, assetType);
      setSchema(schema);
      setSchemaId(schemaId);

      const fetchedUiSchema = await getUiSchemaForSchema(municipalityId, schemaId);
      setUiSchema(fetchedUiSchema);
    })();
  }, [municipalityId, assetType]);
  const { services, loading, error, refetch } = useErrandServices({
    municipalityId,
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

        const res = await getAssets({ municipalityId, partyId, assetId: errandNr, type: assetType });
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

        await updateAsset(municipalityId, asset.id, {
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
    [municipalityId, partyId, errandNr, assetType, refetch, toast]
  );

  const handleSubmit = useCallback(
    async (payload: any) => {
      if (!schema || !municipalityId || !schemaId) return;
      try {
        const list = await getAssets({ municipalityId, partyId, assetId: errandNr, type: assetType });
        const existingFull = (list?.data ?? [])[0];

        if (editing || existingFull) {
          const targetId = editing?.id ?? existingFull!.id;
          const fullForMerge =
            editing?.id === existingFull?.id && existingFull
              ? existingFull
              : existingFull ??
                (await (async () => {
                  const refetchFull = await getAssets({ municipalityId, partyId, assetId: errandNr, type: assetType });
                  return (refetchFull?.data ?? [])[0];
                })());

          await updateAsset(
            municipalityId,
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
            municipalityId,
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
    [schema, municipalityId, editing, schemaId, assetType, partyId, errandNr, refetch, toast]
  );

  return (
    <div className="w-full max-w-full py-24 px-32 overflow-x-hidden">
      <h2 className="text-h4-sm md:text-h4-md">Insatser</h2>
      <p className="mt-sm text-md">
        Här specificeras vilka insatser som omfattas av färdtjänstbeslutet, samt eventuella tilläggstjänster och den
        service kunden har rätt till vid sina resor.
      </p>

      <div className="mt-24 max-w-full">
        {uiSchema && (
          <SchemaForm
            schema={filteredSchema}
            uiSchema={uiSchema}
            formData={formData}
            onChange={(fd) => setFormData(fd)}
            onSubmit={handleSubmit}
            objectFieldTemplate={ServicesObjectFieldTemplate}
          />
        )}
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
