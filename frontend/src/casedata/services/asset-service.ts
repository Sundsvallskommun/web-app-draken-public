import { Asset } from '@casedata/interfaces/asset';
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

export async function getAssetById(municipalityId: string, id: string): Promise<ApiResponse<Asset>> {
  const url = `assets/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  const res = await apiService.get<ApiResponse<Asset>>(url);
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

export async function deleteAsset(municipalityId: string, id: string): Promise<ApiResponse<boolean>> {
  const url = `assets/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  const res = await apiService.deleteRequest<ApiResponse<boolean>>(url);
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
  assetId?: string;
  origin?: string;
  status?: Asset['status'];
};

export function buildCreateAssetPayload(
  formData: any,
  _schema: RJSFSchema | null,
  { schemaId, assetType, partyId, assetId, origin = 'CASEDATA', status = 'ACTIVE' }: BuildArgs
): Partial<Asset> & Record<string, any> {
  const tillsvidare = formData?.validityType === 'tillsvidare';
  const { validFrom, validTo, validityType, ...jsonValue } = formData ?? {};
  return {
    origin,
    partyId,
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

