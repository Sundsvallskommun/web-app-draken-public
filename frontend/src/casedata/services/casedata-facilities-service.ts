import { ApiErrand, IErrand } from '@casedata/interfaces/errand';
import { EstateInfoSearch } from '@common/interfaces/estate-details';
import { FacilityAddressDTO, FacilityDTO } from '@common/interfaces/facilities';
import { ApiResponse, apiService } from '@common/services/api-service';
import { removeMunicipalityName } from '@common/services/facilities-service';

export const getFacilities: (municipalityId: string, errandId: string) => Promise<FacilityDTO[]> = (
  municipalityId,
  errandId
) => {
  if (!errandId || !municipalityId) {
    console.error('No errand id or municipality id found, cannot fetch. Returning empty list.');
    return Promise.resolve([]);
  }
  const url = `casedata/${municipalityId}/errand/${errandId}`;
  return apiService
    .get<ApiResponse<ApiErrand>>(url)
    .then((res) => res.data.data.facilities)
    .catch((e) => {
      console.error('Something went wrong when fetching facilities for errand: ', errandId);
      throw e;
    });
};

export const saveFacilities = (municipalityId: string, errandId: number, estate: FacilityDTO[]) => {
  if (!errandId || !municipalityId) {
    console.error('No errand id or municipality id found, cannot save. Returning.');
    return Promise.resolve();
  }
  const url = `casedata/${municipalityId}/errands/${errandId}/facilities`;
  return apiService
    .post<ApiResponse<ApiErrand>, Partial<FacilityDTO[]>>(url, estate)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving facilities for errand: ', errandId);
      throw e;
    });
};

export const makeFacility: (estate: EstateInfoSearch) => FacilityDTO = (estate) => {
  return {
    address: makeAddress(estate),
  };
};

export const makeAddress: (estate: EstateInfoSearch) => FacilityAddressDTO = (estate) => {
  return {
    propertyDesignation: estate.designation,
  };
};

export const getErrandPropertyDesignations: (errand: IErrand) => string[] = (errand) => {
  if (!errand) {
    console.error('No errand found, cannot. Returning empty list.');
    return [];
  }
  return errand.facilities
    .filter((facility) => facility.address)
    .map((facility) => removeMunicipalityName(facility.address?.propertyDesignation));
};
