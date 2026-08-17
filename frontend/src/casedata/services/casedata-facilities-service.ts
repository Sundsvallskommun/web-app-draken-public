import { ApiErrand, IErrand } from '@casedata/interfaces/errand';
import { EstateInfoSearch } from '@common/interfaces/estate-details';
import { FacilityAddressDTO, FacilityDTO } from '@common/interfaces/facilities';
import { ApiResponse, apiService } from '@common/services/api-service';
import { removeMunicipalityName } from '@common/services/facilities-service';

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

const makeAddress: (estate: EstateInfoSearch) => FacilityAddressDTO = (estate) => {
  return {
    propertyDesignation: estate.designation,
  };
};

export const getErrandPropertyDesignations: (errand: IErrand) => string[] = (errand) => {
  if (!errand) {
    console.error('No errand found, cannot. Returning empty list.');
    return [];
  }
  return (errand.facilities ?? [])
    .filter((facility) => facility.address)
    .map((facility) => removeMunicipalityName(facility.address?.propertyDesignation ?? ''));
};
