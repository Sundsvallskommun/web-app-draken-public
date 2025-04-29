import { IErrand } from '@casedata/interfaces/errand';
import { ApiResponse, apiService } from '@common/services/api-service';

export const exportErrands: (
  municipalityId: string,
  errandsData: IErrand[],
  exportParameters?: string[]
) => Promise<string> = (municipalityId, errandsData: IErrand[], exportParameters) => {
  // Comma separated query param

  let url = `${municipalityId}/export`;
  if (exportParameters.length) {
    url += `?exclude=${exportParameters.join(',')}`;
  }

  return apiService.post<ApiResponse<string>, IErrand[]>(url, errandsData, exportParameters).then((res) => {
    return res.data.data;
  });
};
