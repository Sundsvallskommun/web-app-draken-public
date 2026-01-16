import { Asset } from '@casedata/interfaces/asset';
import { ApiResponse, apiService } from '@common/services/api-service';
import type { RJSFSchema } from '@rjsf/utils';

export type GetAssetsParams = {
  partyId: string;
  municipalityId?: string;
  type?: string;
  status?: string;
  origin?: string;
  assetId?: string;
  issued?: string;
  validTo?: string;
};

const buildQuery = (p: GetAssetsParams) => {
  const params = new URLSearchParams();
  (Object.entries(p) as [keyof GetAssetsParams, any][]).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(String(k), String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export async function getAssets(params: GetAssetsParams): Promise<ApiResponse<Asset[]>> {
  const url = `assets${buildQuery(params)}`;
  const res = await apiService.get<ApiResponse<Asset[]>>(url);
  return res.data;
}

export async function createAsset(
  municipalityId: string,
  payload: Partial<Asset> & Record<string, any>
): Promise<ApiResponse<Asset>> {
  const url = `assets?municipalityId=${municipalityId}`;
  const res = await apiService.post<ApiResponse<Asset>, typeof payload>(url, payload);
  return res.data;
}

export async function updateAsset(
  municipalityId: string,
  id: string,
  payload: Partial<Asset> & Record<string, any>
): Promise<ApiResponse<Asset>> {
  const url = `assets/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  const res = await apiService.patch<ApiResponse<Asset>, typeof payload>(url, payload);
  return res.data;
}

type BuildArgs = {
  schemaId: string;
  assetType: string;
  partyId: string;
  assetId: string;
  origin?: string;
  status?: Asset['status'];
};

export function buildCreateAssetPayload(
  formData: any,
  _schema: RJSFSchema | null,
  { schemaId, assetType, partyId, assetId, origin = 'CASEDATA', status = 'ACTIVE' }: BuildArgs
): Partial<Asset> & Record<string, any> {
  const tillsvidare = formData?.validityType === 'tillsvidare';
  return {
    origin,
    partyId,
    assetId,
    type: assetType,
    issued: formData?.validFrom ?? null,
    validTo: tillsvidare ? null : formData?.validTo ?? null,
    status,
    description: '',
    additionalParameters: {},
    jsonParameters: [
      {
        key: assetType,
        value: JSON.stringify(formData),
        schemaId,
      },
    ],
  };
}

export function buildUpdateAssetPayload(
  formData: any,
  schema: RJSFSchema | null,
  args: BuildArgs,
  existing: Asset
): Partial<Asset> & Record<string, any> {
  const base = buildCreateAssetPayload(formData, schema, args);
  const newParam = base.jsonParameters?.[0];

  const existingParams = Array.isArray(existing.jsonParameters) ? existing.jsonParameters : [];
  let mergedParams = existingParams;

  if (newParam) {
    const alreadyExists = existingParams.some(
      (p: any) => p?.key === newParam.key && p?.schemaId === newParam.schemaId && p?.value === newParam.value
    );

    if (!alreadyExists) {
      mergedParams = [...existingParams, newParam];
    }
  }

  return {
    ...existing,
    origin: existing.origin ?? base.origin,
    partyId: existing.partyId ?? base.partyId,
    assetId: existing.assetId ?? base.assetId,
    type: existing.type ?? base.type,
    issued: base.issued,
    validTo: base.validTo,
    status: base.status ?? existing.status,
    description: base.description ?? existing.description,
    additionalParameters: existing.additionalParameters ?? {},
    jsonParameters: mergedParams,
  };
}
export const getMetadataSchema: (municipalityId: string, schemaId: string) => Promise<ApiResponse<any>> = (
  municipalityId,
  schemaId
) => {
  const url = `${municipalityId}/metadata/jsonschemas/${schemaId}`;
  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching metadata schema for id: ', schemaId);
      throw e;
    });
};

export const getLatestMetadataSchema: (municipalityId: string, schemaName: string) => Promise<ApiResponse<any>> = (
  municipalityId,
  schemaName
) => {
  const url = `${municipalityId}/metadata/jsonschemas/${schemaName}/latest`;

  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching latest schema for schemaName:', schemaName);
      throw e;
    });
};

export async function updateServiceStatuses(
  municipalityId: string,
  partyId: string,
  errandNumber: string,
  decisionOutcome: string
): Promise<void> {
  const newStatus = decisionOutcome === 'APPROVAL' ? 'APPROVED' : 'DENIED';

  const response = await getAssets({
    municipalityId,
    partyId,
    assetId: errandNumber,
    type: 'FTErrandAssets',
  });

  const assets = response.data ?? [];

  for (const asset of assets) {
    if (!asset.jsonParameters?.length) continue;

    const updatedParams = asset.jsonParameters.map((param) => {
      try {
        const parsed = JSON.parse(param.value);
        if (parsed.status === 'PENDING') {
          parsed.status = newStatus;
        }
        return { ...param, value: JSON.stringify(parsed) };
      } catch {
        return param;
      }
    });

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
      jsonParameters: updatedParams,
    });
  }
}
