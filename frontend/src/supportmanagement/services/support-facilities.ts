import type { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

export interface supportmanagementFacility {
  name: string;
  value: string;
}

export interface FacilitiesPayload {
  propertyDesignations: string[];
  districtnames: string[];
  streets: string[];
}

interface Facility {
  address?: {
    propertyDesignation?: string;
    street?: string;
  };
  extraParameters?: {
    districtname?: string;
  };
}

export const saveFacilityInfo = (id: string, facilities: Facility[], expectedVersion: number) => {
  const municipalityId = process.env.NEXT_PUBLIC_MUNICIPALITY_ID;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    return Promise.reject(new Error('A valid support errand version is required to save facilities'));
  }
  const url = `supporterrands/saveFacilities/${municipalityId}/${id}`;
  const payload: FacilitiesPayload = {
    propertyDesignations: facilities?.map((f) => f.address?.propertyDesignation || '') || [],
    districtnames: facilities?.map((f) => f.extraParameters?.districtname || '') || [],
    streets: facilities?.map((f) => f.address?.street || '') || [],
  };

  return apiService
    .patch<Parameter[], FacilitiesPayload>(url, payload, {
      headers: { 'If-Match': `"${expectedVersion}"` },
    })
    .then((res) => res.data)
    .catch((e) => {
      throw e;
    });
};
