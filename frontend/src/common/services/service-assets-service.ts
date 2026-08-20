import { enumTitlesOfArray, getRjsfSchema } from '@common/components/json/utils/schema-utils';
import { Asset, AssetStatus } from '@common/interfaces/asset';
import { getErrandServices, getPartyServices } from '@common/services/asset-service';
import type { RJSFSchema } from '@rjsf/utils';

export interface ErrandServiceAssetParams {
  municipalityId: string;
  partyId: string;
  errandId: string;
  assetType: string;
  origin?: string;
}

export type PartyServiceAssetParams = Omit<ErrandServiceAssetParams, 'errandId'>;

export interface Service {
  id: string;
  assetType?: string;
  assetId?: string;
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
  origin?: string;
  sourceErrandNamespace?: string;
  sourceErrandId?: string;
  sourceErrandNumber?: string;
}

const assetRequestCache = new Map<string, Promise<Asset[]>>();

function dedupeAssetRequest(key: string, loader: () => Promise<Asset[]>): Promise<Asset[]> {
  const existing = assetRequestCache.get(key);
  if (existing !== undefined) return existing;

  const promise = loader().finally(() => {
    assetRequestCache.delete(key);
  });
  assetRequestCache.set(key, promise);
  return promise;
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

const toTypeIds = (rawType: any): string[] => {
  if (Array.isArray(rawType)) return rawType;
  if (rawType) return [rawType];
  return [];
};

export function mapFormToServiceFromPayload(fd: any, schema: RJSFSchema | null, id: string): Service {
  const mobilityIds = normalizeArray(fd?.mobilityAids);
  const addonIds = normalizeArray(fd?.additionalAids);
  const transportModeIds = normalizeArray(fd?.transportMode);
  const typeIds = toTypeIds(fd?.type);
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

export function extractFormDataFromAsset(asset: Asset, schemaId: string): any {
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
  return dedupeAssetRequest(`errand:${JSON.stringify(fetchParams)}`, async () => {
    const resp = await getErrandServices(fetchParams);
    return resp?.data ?? [];
  });
};

export const getPartyServiceAssets = async (params: PartyServiceAssetParams): Promise<Asset[]> => {
  if (!params.partyId) return [];

  const fetchParams = {
    municipalityId: params.municipalityId,
    partyId: params.partyId,
    type: params.assetType,
    origin: params.origin,
  };
  return dedupeAssetRequest(`party:${JSON.stringify(fetchParams)}`, async () => {
    const resp = await getPartyServices(fetchParams);
    return resp?.data ?? [];
  });
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

const stampAssetMetadata = (service: Service, asset: Asset): void => {
  service.assetType = asset.type;
  service.assetId = asset.assetId;
  service.issued = asset.issued ?? '';
  service.validTo = asset.validTo ?? '';
  service.status = asset.status;
  service.origin = asset.origin;
  service.sourceErrandId = asset.sourceErrandId;
  service.sourceErrandNumber = asset.sourceErrandNumber;
  service.sourceErrandNamespace = asset.sourceErrandNamespace;
};

const assetToPlainService = (asset: Asset): Service => ({
  id: asset.id,
  restyp: [],
  aids: [],
  addon: [],
  transportMode: [],
  comment: asset.description ?? '',
  isWinterService: false,
});

export const mapAssetsToServices = async (
  municipalityId: string,
  assets: Asset[],
  fallbackSchema: RJSFSchema | null
): Promise<Service[]> => {
  const schemaById = await getSchemaMapForAssets(municipalityId, assets, fallbackSchema);
  const services: Service[] = [];

  for (const asset of assets) {
    const param = asset.jsonParameters?.[0];

    if (!param?.value) {
      const plain = assetToPlainService(asset);
      stampAssetMetadata(plain, asset);
      services.push(plain);
      continue;
    }

    const parsed = extractFormDataFromAsset(asset, param.schemaId);
    if (!parsed) continue;

    const assetSchema = param.schemaId ? schemaById.get(param.schemaId) ?? fallbackSchema : fallbackSchema;
    const service = mapFormToServiceFromPayload(parsed, assetSchema, asset.id);
    service.schemaVersion = param.schemaId?.split('_').pop() ?? '';
    stampAssetMetadata(service, asset);
    services.push(service);
  }

  return services;
};

export const canDeleteErrandServiceAsset = (asset: Pick<Asset, 'status'> | null | undefined): boolean => {
  return asset?.status !== 'ACTIVE';
};
