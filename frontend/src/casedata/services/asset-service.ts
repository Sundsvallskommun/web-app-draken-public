import { Asset, AssetUpdateRequest, DraftAssetUpdateRequest } from '@casedata/interfaces/asset';
import { ApiResponse, apiService } from '@common/services/api-service';
import {
  getLatestSchema,
  getSchema,
  getUiSchema,
  JsonSchemaResponse,
  UiSchemaResponse,
} from '@common/services/jsonschema-service';
import type { RJSFSchema } from '@rjsf/utils';

export { getLatestSchema, getSchema, getUiSchema };
export type { JsonSchemaResponse, UiSchemaResponse };

export type GetAssetsParams = {
  partyId?: string;
  municipalityId?: string;
  type?: string;
  status?: string;
  origin?: string;
  assetId?: string;
  issued?: string;
  validTo?: string;
  errandId?: string;
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

export async function getAssetById(municipalityId: string, id: string): Promise<ApiResponse<Asset>> {
  const url = `assets/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  const res = await apiService.get<ApiResponse<Asset>>(url);
  return res.data;
}

export async function getDraftAssets(params: GetAssetsParams): Promise<ApiResponse<Asset[]>> {
  const url = `asset-drafts${buildQuery(params)}`;
  const res = await apiService.get<ApiResponse<Asset[]>>(url);
  return res.data;
}

export async function createAsset(
  municipalityId: string,
  payload: Partial<Asset> & Record<string, any>,
  errandId?: string
): Promise<ApiResponse<Asset>> {
  const query = buildQuery({ municipalityId, errandId });
  const url = `assets${query}`;
  const res = await apiService.post<ApiResponse<Asset>, typeof payload>(url, payload);
  return res.data;
}

export async function createDraftAsset(
  municipalityId: string,
  payload: Partial<Asset> & Record<string, any>,
  errandId?: string
): Promise<ApiResponse<Asset>> {
  const query = buildQuery({ municipalityId, errandId });
  const url = `asset-drafts${query}`;
  const res = await apiService.post<ApiResponse<Asset>, typeof payload>(url, payload);
  return res.data;
}

export async function deleteAsset(municipalityId: string, id: string): Promise<ApiResponse<boolean>> {
  const url = `assets/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  const res = await apiService.deleteRequest<ApiResponse<boolean>>(url);
  return res.data;
}

export async function deleteDraftAsset(municipalityId: string, id: string): Promise<ApiResponse<boolean>> {
  const url = `asset-drafts/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  const res = await apiService.deleteRequest<ApiResponse<boolean>>(url);
  return res.data;
}

export async function updateAsset(
  municipalityId: string,
  id: string,
  payload: AssetUpdateRequest
): Promise<ApiResponse<Asset>> {
  const url = `assets/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  const res = await apiService.patch<ApiResponse<Asset>, AssetUpdateRequest>(url, payload);
  return res.data;
}

export async function updateDraftAsset(
  municipalityId: string,
  id: string,
  payload: DraftAssetUpdateRequest
): Promise<ApiResponse<Asset>> {
  const url = `asset-drafts/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  const res = await apiService.patch<ApiResponse<Asset>, DraftAssetUpdateRequest>(url, payload);
  return res.data;
}

type BuildArgs = {
  schemaId: string;
  assetType: string;
  partyId: string;
  assetId?: string;
  origin?: string;
  status?: Asset['status'];
};

export function buildCreateAssetPayload(
  formData: any,
  _schema: RJSFSchema | null,
  { schemaId, assetType, partyId, assetId, origin = 'CASEDATA', status = 'DRAFT' }: BuildArgs
): Partial<Asset> & Record<string, any> {
  const tillsvidare = formData?.validityType === 'tillsvidare';
  const { validFrom, validTo, validityType, ...jsonValue } = formData ?? {};
  return {
    origin,
    partyId,
    ...(assetId ? { assetId } : {}),
    type: assetType,
    issued: validFrom ?? null,
    validTo: tillsvidare ? null : validTo ?? null,
    status,
    description: '',
    additionalParameters: {},
    jsonParameters: [
      {
        key: assetType,
        value: jsonValue,
        schemaId,
      },
    ],
  };
}
