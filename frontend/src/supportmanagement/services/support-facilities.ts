import { ApiResponse, apiService } from '@common/services/api-service';
import { ApiSupportErrand } from './support-errand-service';

export interface supportmanagementFacility {
  name: string;
  value: string;
}

export interface FacilitiesPayload {
  propertyDesignations: string[];
  districtnames: string[];
  streets: string[];
}

export const saveFacilityInfo = (id, facilities) => {
  const url = `supporterrands/saveFacilities/${id}`;
  const payload: FacilitiesPayload = {
    propertyDesignations: facilities?.map((f) => f.address?.propertyDesignation) || [],
    districtnames: facilities?.map((f) => f.extraParameters?.districtname || '') || [],
    streets: facilities?.map((f) => f.address?.street || '') || [],
  };

  return apiService
    .patch<ApiResponse<ApiSupportErrand>, FacilitiesPayload>(url, payload)
    .then((res) => res.data)
    .catch((e) => {
      throw e;
    });
};
