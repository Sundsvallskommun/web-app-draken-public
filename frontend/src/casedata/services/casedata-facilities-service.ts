import { ApiErrand, IErrand } from '@casedata/interfaces/errand';
import { EstateInfoSearch } from '@common/interfaces/estate-details';
import { FacilityAddressDTO, FacilityDTO } from '@common/interfaces/facilities';
import { ApiResponse, apiService } from '@common/services/api-service';
import { logClientFailure } from '@common/services/client-diagnostics';
import { removeMunicipalityName } from '@common/services/facilities-service';

export const getFacilities: (municipalityId: string, errandId: string) => Promise<FacilityDTO[]> = (
  municipalityId,
  errandId
) => {
  if (!errandId || !municipalityId) {
    logClientFailure('casedata.casedata-facilities.getFacilities');
    return Promise.resolve([]);
  }
  const url = `casedata/${municipalityId}/errand/${errandId}`;
  return apiService
    .get<ApiResponse<ApiErrand>>(url)
    .then((res) => res.data.data.facilities)
    .catch((e) => {
      logClientFailure('casedata.casedata-facilities.getFacilities', e);
      throw e;
    });
};

export const saveFacilities = (municipalityId: string, errandId: number, estate: FacilityDTO[]) => {
  if (!errandId || !municipalityId) {
    logClientFailure('casedata.casedata-facilities.saveFacilities');
    return Promise.resolve();
  }
  const url = `casedata/${municipalityId}/errands/${errandId}/facilities`;
  return apiService
    .post<ApiResponse<ApiErrand>, Partial<FacilityDTO[]>>(url, estate)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('casedata.casedata-facilities.saveFacilities', e);
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
    logClientFailure('casedata.casedata-facilities.getErrandPropertyDesignations');
    return [];
  }
  return (errand.facilities ?? [])
    .filter((facility) => facility.address)
    .map((facility) => removeMunicipalityName(facility.address?.propertyDesignation ?? ''));
};
