import { ErrandsData, IErrand } from '@casedata/interfaces/errand';
import { ApiResponse, apiService } from '@common/services/api-service';

export const exportErrands: (municipalityId: string, errandsData: ErrandsData) => Promise<string> = (
  municipalityId,
  errandsData: ErrandsData
) => {
  return apiService
    .post<ApiResponse<string>, IErrand[]>(`${municipalityId}/export`, errandsData.errands)
    .then((res) => {
      return res.data.data;
    });
};
