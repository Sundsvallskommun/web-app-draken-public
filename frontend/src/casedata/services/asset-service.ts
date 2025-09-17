import { Asset } from '@casedata/interfaces/asset';
import { ApiResponse, apiService } from '@common/services/api-service';

export type GetAssetsParams = {
  municipalityId?: string;
  partyId?: string;
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
  try {
    const res = await apiService.get<ApiResponse<Asset[]>>(url);
    return res.data;
  } catch (e) {
    console.error('Something went wrong when fetching assets:', params, e);
    throw e;
  }
}

export function getAssetsForErrand(errandNumber: string, opts?: Omit<GetAssetsParams, 'assetId'>) {
  if (!errandNumber) throw new Error('Missing errandNumber');
  return getAssets({ assetId: errandNumber, ...opts });
}

export const getMetadataSchema: (municipalityId?: string, schemaId?: string) => Promise<ApiResponse<any>> = (
  municipalityId = '2281',
  schemaId = '2281_fterrandassets_1.0'
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

export const createAsset = (
  municipalityId: string,
  payload: Partial<Asset> & Record<string, any>
): Promise<ApiResponse<Asset>> => {
  if (!municipalityId) {
    console.error('No municipalityId provided, cannot create asset.');
  }
  const url = `assets?municipalityId=${municipalityId}`;
  return apiService
    .post<ApiResponse<Asset>, typeof payload>(url, payload)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when creating asset:', e);
      throw e;
    });
};

export const updateAsset = (
  municipalityId: string,
  id: string,
  payload: Partial<Asset> & Record<string, any>
): Promise<ApiResponse<Asset>> => {
  if (!municipalityId || !id) {
    console.error('Missing municipalityId or asset id, cannot update asset.');
  }
  const url = `assets/${encodeURIComponent(id)}?municipalityId=${municipalityId}`;
  return apiService
    .patch<ApiResponse<Asset>, typeof payload>(url, payload)
    .then((res) => res.data)
    .catch((e) => {
      console.error(`Something went wrong when updating asset ${id}:`, e);
      throw e;
    });
};
