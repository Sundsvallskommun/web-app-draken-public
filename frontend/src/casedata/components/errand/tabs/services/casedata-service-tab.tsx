'use client';

import {
  buildCreateAssetPayload,
  buildRemoveParameterPayload,
  buildReplaceParameterPayload,
  buildUpdateAssetPayload,
  createAsset,
  getAssets,
  updateAsset,
} from '@casedata/services/asset-service';
import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { ServicesObjectFieldTemplate } from '@common/components/json/fields/services-object-field-template.componant';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { getLatestRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import { getToastOptions } from '@common/utils/toast-message-settings';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { Modal, useSnackbar } from '@sk-web-gui/react';
import { useCasedataStore, useConfigStore } from '@stores/index';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ServiceListComponent } from './casedata-service-list.component';
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
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errand = useCasedataStore((s) => s.errand);
  const [schema, setSchema] = useState<RJSFSchema | null>(null);
  const [uiSchema, setUiSchema] = useState<UiSchema | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [schemaId, setSchemaId] = useState<string>('');
  const toast = useSnackbar();

  const assetType = 'FTErrandAssets';

  const partyId = errand ? getOwnerStakeholder(errand)?.personId ?? '' : '';
  const errandNr = errand?.errandNumber ?? '';

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

  const fetchAsset = useCallback(
    async (assetUuid: string) => {
      const res = await getAssets({ municipalityId, partyId, assetId: errandNr, type: assetType });
      return (res?.data ?? []).find((a) => a.id === assetUuid) ?? null;
    },
    [municipalityId, partyId, errandNr, assetType]
  );

  const removeService = useCallback(
    async (compositeId: string) => {
      try {
        const { assetUuid, paramIndex } = fromCompositeId(compositeId);
        const asset = await fetchAsset(assetUuid);
        if (!asset) {
          await refetch();
          return;
        }

        const params = Array.isArray(asset.jsonParameters) ? asset.jsonParameters : [];
        if (paramIndex < 0 || paramIndex >= params.length) {
          await refetch();
          return;
        }

        await updateAsset(municipalityId, asset.id, buildRemoveParameterPayload(paramIndex, asset));
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
    [municipalityId, fetchAsset, refetch, toast]
  );

  const handleSubmit = useCallback(
    async (payload: any) => {
      if (!schema || !municipalityId || !schemaId) return;
      try {
        const list = await getAssets({ municipalityId, partyId, assetId: errandNr, type: assetType });
        const existingFull = (list?.data ?? [])[0];

        if (existingFull) {
          await updateAsset(
            municipalityId,
            existingFull.id,
            buildUpdateAssetPayload(payload, schema, { schemaId, assetType, partyId, assetId: errandNr }, existingFull)
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
        }

        toast(
          getToastOptions({
            message: existingFull ? 'Insatsen uppdaterades.' : 'Ny insats tillagd.',
            status: 'success',
          })
        );

        await refetch();
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
    [schema, municipalityId, schemaId, assetType, partyId, errandNr, refetch, toast]
  );

  const startEdit = useCallback(
    async (compositeId: string) => {
      try {
        const { assetUuid, paramIndex } = fromCompositeId(compositeId);
        const asset = await fetchAsset(assetUuid);
        if (!asset) {
          toast(getToastOptions({ message: 'Kunde inte hitta insatsen.', status: 'error' }));
          return;
        }

        const params = Array.isArray(asset.jsonParameters) ? asset.jsonParameters : [];
        if (paramIndex < 0 || paramIndex >= params.length) {
          toast(getToastOptions({ message: 'Kunde inte hitta insatsen.', status: 'error' }));
          return;
        }

        let value = params[paramIndex]?.value;
        if (typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch {
            // keep as-is
          }
        }

        setEditFormData(value);
        setEditingId(compositeId);
      } catch {
        toast(getToastOptions({ message: 'Kunde inte hämta insatsdata.', status: 'error' }));
      }
    },
    [fetchAsset, toast]
  );

  const closeEditModal = useCallback(() => {
    setEditingId(null);
    setEditFormData(null);
  }, []);

  const handleEditSubmit = useCallback(
    async (payload: any) => {
      if (!editingId || !schemaId) return;
      try {
        const { assetUuid, paramIndex } = fromCompositeId(editingId);
        const asset = await fetchAsset(assetUuid);
        if (!asset) {
          toast(getToastOptions({ message: 'Kunde inte hitta insatsen.', status: 'error' }));
          return;
        }

        const replacePayload = buildReplaceParameterPayload(
          payload,
          paramIndex,
          { schemaId, assetType, partyId, assetId: errandNr },
          asset
        );

        await updateAsset(municipalityId, assetUuid, replacePayload);
        await refetch();
        closeEditModal();
        toast(getToastOptions({ message: 'Insatsen uppdaterades.', status: 'success' }));
      } catch {
        toast(getToastOptions({ message: 'Något gick fel när insatsen skulle uppdateras.', status: 'error' }));
      }
    },
    [editingId, schemaId, municipalityId, partyId, errandNr, assetType, fetchAsset, refetch, closeEditModal, toast]
  );

  return (
    <div className="w-full max-w-full py-24 px-32 overflow-x-hidden">
      <h2 className="text-h4-sm md:text-h4-md">Insatser</h2>
      <p className="mt-sm text-md">
        Här specificeras vilka insatser som omfattas av färdtjänstbeslutet, samt eventuella tilläggstjänster och den
        service kunden har rätt till vid sina resor.
      </p>

      {!(errand ? isErrandLocked(errand) : false) && (
        <div className="mt-24 max-w-full">
          {uiSchema && (
            <SchemaForm
              schema={filteredSchema!}
              uiSchema={uiSchema}
              formData={formData}
              onChange={(fd) => setFormData(fd)}
              onSubmit={handleSubmit}
              objectFieldTemplate={ServicesObjectFieldTemplate}
            />
          )}
        </div>
      )}

      <div className="mt-32 pt-24">
        <h4 className="text-h6 mb-sm border-b">Här listas de insatser som fattats kring ärendet</h4>
        {loading ? (
          <div>Hämtar insatser…</div>
        ) : error ? (
          <div className="text-error">{error}</div>
        ) : (
          <ServiceListComponent
            services={services}
            onRemove={removeService}
            onEdit={startEdit}
            readOnly={errand ? isErrandLocked(errand) : false}
          />
        )}
      </div>

      <Modal show={editingId !== null} className="w-[80rem]" onClose={closeEditModal} label="Redigera insats">
        <Modal.Content>
          {editFormData && uiSchema && filteredSchema && (
            <SchemaForm
              schema={filteredSchema}
              uiSchema={uiSchema}
              formData={editFormData}
              onChange={(fd) => setEditFormData(fd)}
              onSubmit={handleEditSubmit}
              objectFieldTemplate={ServicesObjectFieldTemplate}
              submitButtonOptions={{ label: 'Spara', leadingIcon: false }}
            />
          )}
        </Modal.Content>
      </Modal>
    </div>
  );
};
