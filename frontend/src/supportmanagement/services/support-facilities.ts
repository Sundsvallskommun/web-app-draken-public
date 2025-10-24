import { ApiResponse, apiService } from '@common/services/api-service';
import { ApiSupportErrand } from './support-errand-service';

export interface supportmanagementFacility {
  name: string;
  value: string;
}
export const saveFacilityInfo = (id, facilities) => {
  const url = `supporterrands/saveFacilities/${id}`;
  const facilitiesArray = facilities?.map((f) => f.address.propertyDesignation) || [];

  return apiService
    .patch<ApiResponse<ApiSupportErrand>, Partial<string[]>>(url, facilitiesArray)
    .then((res) => res.data)
    .catch((e) => {
      throw e;
    });
};
