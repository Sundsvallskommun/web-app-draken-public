import { Asset, AssetStatus, DraftAssetUpdateRequest } from '@casedata/interfaces/asset';
import {
  buildCreateAssetPayload,
  createDraftAsset,
  deleteDraftAsset,
  getAssets,
  getDraftAssets,
  updateAsset,
  updateDraftAsset,
} from '@casedata/services/asset-service';
import { enumTitlesOfArray, getRjsfSchema } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema } from '@rjsf/utils';

export interface ErrandServiceAssetParams {
  municipalityId: string;
  partyId: string;
  errandId: string;
  assetType: string;
  origin?: string;
}

export interface Service {
  id: string;
  restyp: string[];
  aids: string[];
  addon: string[];
  transportMode: string[];
  comment: string;
  isWinterService: boolean;
  issued?: string;
  validTo?: string;
  status?: AssetStatus;
  schemaVersion?: string;
}

function normalizeArray(values: any): string[] {
  if (Array.isArray(values)) {
    if (values.length > 0 && typeof values[0] === 'object') {
      return values.map((x: any) => x?.value ?? x?.key).filter(Boolean);
    }
    return values;
  }
  return [];
}

export function mapFormToServiceFromPayload(fd: any, schema: RJSFSchema | null, id: string): Service {
  const mobilityIds = normalizeArray(fd?.mobilityAids);
  const addonIds = normalizeArray(fd?.additionalAids);
  const transportModeIds = normalizeArray(fd?.transportMode);
  const typeIds = Array.isArray(fd?.type) ? fd.type : fd?.type ? [fd.type] : [];
  const isWinterService = fd?.isWinterService === 'ja' || fd?.isWinterService === true;

  return {
    id,
    restyp: enumTitlesOfArray(schema, 'type', typeIds),
    aids: enumTitlesOfArray(schema, 'mobilityAids', mobilityIds),
    addon: enumTitlesOfArray(schema, 'additionalAids', addonIds),
    transportMode: enumTitlesOfArray(schema, 'transportMode', transportModeIds),
    comment: typeof fd?.notes === 'string' ? fd.notes : '',
    isWinterService,
  };
}

export function extractFormDataFromAsset(asset: Asset, schemaId: string): any | null {
  const jp = asset.jsonParameters?.find((p) => p.schemaId === schemaId) ?? asset.jsonParameters?.[0];
  if (!jp?.value) return null;
  try {
    return typeof jp.value === 'string' ? JSON.parse(jp.value) : jp.value;
  } catch {
    return null;
  }
}

export function assetToService(asset: Asset, schema: RJSFSchema | null, schemaId: string): Service | null {
  const fd = extractFormDataFromAsset(asset, schemaId);
  if (!fd) return null;
  return mapFormToServiceFromPayload(fd, schema, asset.id);
}

const toFetchParams = ({ municipalityId, partyId, errandId, assetType, origin }: ErrandServiceAssetParams) => ({
  municipalityId,
  partyId,
  errandId,
  type: assetType,
  origin,
});

export const getErrandServiceAssets = async (params: ErrandServiceAssetParams): Promise<Asset[]> => {
  if (!params.errandId || !params.partyId) return [];

  const fetchParams = toFetchParams(params);
  const [draftResp, activeResp] = await Promise.all([getDraftAssets(fetchParams), getAssets(fetchParams)]);
  const draftAssets = draftResp?.data ?? [];
  const activeAssets = activeResp?.data ?? [];
  const draftIds = new Set(draftAssets.map((asset) => asset.id));

  return [...draftAssets, ...activeAssets.filter((asset) => !draftIds.has(asset.id))];
};

export const getErrandServiceAssetById = async (
  params: ErrandServiceAssetParams,
  assetId: string
): Promise<Asset | null> => {
  const assets = await getErrandServiceAssets(params);
  return assets.find((asset) => asset.id === assetId) ?? null;
};

const getSchemaMapForAssets = async (
  municipalityId: string,
  assets: Asset[],
  fallbackSchema: RJSFSchema | null
): Promise<Map<string, RJSFSchema | null>> => {
  const schemaIds = Array.from(
    new Set(assets.map((asset) => asset.jsonParameters?.[0]?.schemaId).filter((id): id is string => !!id))
  );
  const schemaById = new Map<string, RJSFSchema | null>();

  await Promise.all(
    schemaIds.map(async (id) => {
      try {
        schemaById.set(id, await getRjsfSchema(municipalityId, id));
      } catch {
        schemaById.set(id, fallbackSchema);
      }
    })
  );

  return schemaById;
};

export const mapAssetsToServices = async (
  municipalityId: string,
  assets: Asset[],
  fallbackSchema: RJSFSchema | null
): Promise<Service[]> => {
  const schemaById = await getSchemaMapForAssets(municipalityId, assets, fallbackSchema);
  const services: Service[] = [];

  for (const asset of assets) {
    const param = asset.jsonParameters?.[0];
    if (!param?.value) continue;

    const parsed = extractFormDataFromAsset(asset, param.schemaId);
    if (!parsed) continue;

    const assetSchema = param.schemaId ? schemaById.get(param.schemaId) ?? fallbackSchema : fallbackSchema;
    const service = mapFormToServiceFromPayload(parsed, assetSchema, asset.id);
    service.schemaVersion = param.schemaId?.split('_').pop() ?? '';
    service.issued = asset.issued ?? '';
    service.validTo = asset.validTo ?? '';
    service.status = asset.status;
    services.push(service);
  }

  return services;
};

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

export const canDeleteErrandServiceAsset = (asset: Pick<Asset, 'status'> | null | undefined): boolean => {
  return asset?.status !== 'ACTIVE';
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
