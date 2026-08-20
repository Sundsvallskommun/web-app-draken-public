import { DraftAssetUpdateRequest } from '@common/interfaces/asset';
import {
  buildCreateAssetPayload,
  createDraftAsset,
  deleteDraftAsset,
  updateAsset,
  updateDraftAsset,
} from '@common/services/asset-service';
import {
  canDeleteErrandServiceAsset,
  ErrandServiceAssetParams,
  getErrandServiceAssetById,
} from '@common/services/service-assets-service';
import type { RJSFSchema } from '@rjsf/utils';

export type { ErrandServiceAssetParams };

export const createErrandServiceDraftAsset = (
  params: ErrandServiceAssetParams,
  formData: any,
  schema: RJSFSchema | null,
  schemaId: string
) => {
  return createDraftAsset(
    params.municipalityId,
    buildCreateAssetPayload(formData, schema, {
      schemaId,
      assetType: params.assetType,
      partyId: params.partyId,
    }),
    params.errandId
  );
};

export const deleteErrandServiceDraftAsset = async (
  params: ErrandServiceAssetParams,
  assetId: string
): Promise<boolean> => {
  const asset = await getErrandServiceAssetById(params, assetId);
  if (!asset) return false;
  if (!canDeleteErrandServiceAsset(asset)) {
    throw new Error('Aktiva insatser måste redigeras innan de kan tas bort.');
  }

  await deleteDraftAsset(params.municipalityId, assetId);
  return true;
};

export const updateErrandServiceAsset = async (
  params: ErrandServiceAssetParams,
  assetId: string,
  payload: DraftAssetUpdateRequest
) => {
  const asset = await getErrandServiceAssetById(params, assetId);
  if (!asset) {
    throw new Error('Kunde inte hitta insatsen.');
  }
  const draftedActiveAsset = asset.status === 'ACTIVE';
  if (draftedActiveAsset) {
    await updateAsset(params.municipalityId, assetId, { status: 'DRAFT' });
  }

  const response = await updateDraftAsset(params.municipalityId, assetId, payload);
  return { response, draftedActiveAsset };
};
