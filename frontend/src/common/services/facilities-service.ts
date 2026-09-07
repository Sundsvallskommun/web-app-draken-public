import { EstateInformation, EstateInfoSearch } from '@common/interfaces/estate-details';
import { FacilityAddressDTO, FacilityDTO } from '@common/interfaces/facilities';
import { ApiResponse, apiService } from '@common/services/api-service';
import { logClientFailure } from '@common/services/client-diagnostics';

export const makeFacility: (estate: EstateInfoSearch) => FacilityDTO = (estate) => {
  return {
    address: makeAddress(estate),
    extraParameters: {
      districtname: estate.districtname || '',
    },
  };
};

export const makeAddress: (estate: EstateInfoSearch) => FacilityAddressDTO = (estate) => {
  return {
    propertyDesignation: estate.designation,
    street: estate.address || '',
  };
};

export const getFacilityByAddress = (query: string) => {
  const url = `estateByAddress/${query}`;

  return apiService
    .get<ApiResponse<EstateInfoSearch[]>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('common.facilities.getFacilityByAddress', e);
      throw e;
    });
};

export const getSingleFacilityByDesignation = (query: string) => {
  const url = `singleEstateByPropertyDesignation/${query}`;

  return apiService
    .get<ApiResponse<EstateInfoSearch[]>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('common.facilities.getSingleFacilityByDesignation', e);
      throw e;
    });
};

export const getFacilityByDesignation = (query: string) => {
  const url = `estateByPropertyDesignation/${query}`;

  return apiService
    .get<ApiResponse<EstateInfoSearch[]>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('common.facilities.getFacilityByDesignation', e);
      throw e;
    });
};

export const getFacilityInfo = (designation: string) => {
  const url = `estateInfo/${designation}`;

  return apiService
    .get<ApiResponse<EstateInformation>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('common.facilities.getFacilityInfo', e);
      throw e;
    });
};

export const removeMunicipalityName = (municipalityName: string) => {
  return municipalityName.replace('SUNDSVALL ', '');
};
