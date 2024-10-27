import { Asset } from '@casedata/interfaces/asset';
import { ApiResponse, apiService } from '@common/services/api-service';

export const getAssets: (partyId: string, type: string) => Promise<ApiResponse<Asset[]>> = (partyId, type) => {
  if (!partyId) {
    console.error('No note id found, cannot fetch. Returning.');
  }
  const url = `assets?partyId=${partyId}&type=${type}`;
  return apiService
    .get<ApiResponse<Asset[]>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching asset: ', partyId);
      throw e;
    });
};
