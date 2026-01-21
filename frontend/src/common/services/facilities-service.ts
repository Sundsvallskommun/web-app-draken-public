import { EstateInfoSearch, EstateInformation } from '@common/interfaces/estate-details';
import { FacilityAddressDTO, FacilityDTO } from '@common/interfaces/facilities';

import { ApiResponse, apiService } from '@common/services/api-service';

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
  };
};

export const getFacilityByAddress = (query: string) => {
  const url = `estateByAddress/${query}`;

  return apiService
    .get<ApiResponse<EstateInfoSearch[]>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching estateInfo: ' + query);
      throw e;
    });
};

export const getFacilityByDesignation = (query: string) => {
  const url = `estateByPropertyDesignation/${query}`;

  return apiService
    .get<ApiResponse<EstateInfoSearch[]>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching estateInfo: ' + query);
      throw e;
    });
};

export const getFacilityInfo = (designation: string) => {
  const url = `estateInfo/${designation}`;

  return apiService
    .get<ApiResponse<EstateInformation>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching estateInfo: ' + designation);
      throw e;
    });
};

export const removeMunicipalityName = (municipalityName: string) => {
  return municipalityName.replace('SUNDSVALL ', '');
};
