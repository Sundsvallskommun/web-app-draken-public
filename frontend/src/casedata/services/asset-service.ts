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

export async function getDraftAssets(params: GetAssetsParams): Promise<ApiResponse<Asset[]>> {
  const url = `asset-drafts${buildQuery(params)}`;
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

export async function createDraftAsset(
  municipalityId: string,
  payload: Partial<Asset> & Record<string, any>
): Promise<ApiResponse<Asset>> {
  const url = `asset-drafts?municipalityId=${municipalityId}`;
  const res = await apiService.post<ApiResponse<Asset>, typeof payload>(url, payload);
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
  assetId: string;
  origin?: string;
  status?: Asset['status'];
};

export function buildCreateAssetPayload(
  formData: any,
  _schema: RJSFSchema | null,
  { schemaId, assetType, partyId, assetId, origin = 'CASEDATA', status = 'DRAFT' }: BuildArgs
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
        value: formData,
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
): DraftAssetUpdateRequest {
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
    validTo: base.validTo,
    status: base.status ?? existing.status,
    statusReason: existing.statusReason,
    additionalParameters: existing.additionalParameters ?? {},
    jsonParameters: mergedParams,
  };
}

export function buildRemoveParameterPayload(paramIndex: number, existing: Asset): DraftAssetUpdateRequest {
  return {
    validTo: existing.validTo ?? undefined,
    status: existing.status,
    statusReason: existing.statusReason,
    additionalParameters: existing.additionalParameters ?? {},
    jsonParameters: (existing.jsonParameters ?? []).filter((_, i) => i !== paramIndex),
  };
}

export function buildReplaceParameterPayload(
  formData: any,
  paramIndex: number,
  { schemaId, assetType }: BuildArgs,
  existing: Asset
): DraftAssetUpdateRequest {
  const params = [...(existing.jsonParameters ?? [])];
  if (paramIndex < 0 || paramIndex >= params.length) {
    throw new Error(`Parameter index ${paramIndex} out of range (0–${params.length - 1}).`);
  }
  params[paramIndex] = { key: assetType, value: formData, schemaId };
  return {
    validTo: formData?.validityType === 'tillsvidare' ? undefined : formData?.validTo ?? existing.validTo,
    status: existing.status,
    statusReason: existing.statusReason,
    additionalParameters: existing.additionalParameters ?? {},
    jsonParameters: params,
  };
}
