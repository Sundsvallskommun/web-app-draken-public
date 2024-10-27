import { Appeal, RegisterAppeal } from '@casedata/interfaces/appeal';
import { ApiResponse, apiService } from '@common/services/api-service';
import { AxiosResponse } from 'axios';

export const registerAppeal: (
  municipalityId: string,
  errandId: string,
  appeal: RegisterAppeal
) => Promise<AxiosResponse<boolean>> = (municipalityId, errandId, appeal) => {
  let apiCall;
  const url = `casedata/${municipalityId}/errands/${errandId}/appeals`;
  apiCall = apiService.patch<boolean, RegisterAppeal>(url, appeal);
  return apiCall.catch((e) => {
    console.error('Something went wrong when registering the appeal: ', appeal);
    throw e;
  });
};

export const updateAppeal: (
  municipalityId: string,
  errandId: number,
  appealId: number,
  appeal: RegisterAppeal
) => Promise<AxiosResponse<boolean>> = (municipalityId, errandId, appealId, appeal) => {
  let apiCall;
  const url = `casedata/${municipalityId}/${errandId}/appeals/${appealId}`;
  apiCall = apiService.patch<boolean, RegisterAppeal>(url, appeal);
  return apiCall.catch((e) => {
    console.error('Something went wrong when updating the appeal: ', appeal);
    throw e;
  });
};

export const fetchAppeal: (municipalityId: string, appealId: number) => Promise<ApiResponse<Appeal>> = (
  municipalityId,
  appealId
) => {
  if (!appealId) {
    console.error('No appeal id found, cannot fetch. Returning.');
  }
  const url = `${municipalityId}/appeals/${appealId}`;
  return apiService
    .get<ApiResponse<Appeal>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching appeal: ', appealId);
      throw e;
    });
};
