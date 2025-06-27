import { User } from '@common/interfaces/user';
import { ApiResponse, apiService } from './api-service';
import { sortBy } from './helper-service';
import { StringMatcher } from 'node_modules/cypress/types/net-stubbing';

export interface CaseStatusResponse {
  caseId?: string;
  externalCaseId?: string;
  caseType?: string;
  status?: string;
  firstSubmitted?: string;
  lastStatusChange?: string;
  system?: string;
  namespace?: string;
  errandNumber?: string;
}

export const findOperationUsingNamespace = (namespace: string) => {
  switch (namespace) {
    case 'SBK_MEX':
      return 'MEX';
    case 'SBK_PARKING_PERMIT':
      return 'PRH';
    default:
      '';
      break;
  }
};

export const getStatusesUsingPartyId = (municipalityId: string, partyId: string) => {
  const url = `${municipalityId}/party/${partyId}/statuses`;

  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      const mexErrands = res.data.data.filter((item) => item.namespace === 'SBK_MEX');
      const sortedData = sortBy(mexErrands, 'firstSubmitted').reverse().slice(0, 12);
      return sortedData;
    })
    .catch((e) => {
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};

export const getErrandStatus = (municipalityId: string, query: string) => {
  const url = `${municipalityId}/errands/statuses/${query}`;

  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      const mexErrands = res.data.data.filter((item) => item.namespace === 'SBK_MEX');
      const sortedData = sortBy(mexErrands, 'firstSubmitted').reverse().slice(0, 12);
      return sortedData;
    })
    .catch((e) => {
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};

export const getErrandNumberfromId = (municipalityId: string, errandId: string) => {
  const url = `${municipalityId}/errandbyid/${errandId}`;

  return apiService
    .get<string>(url)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching errand number: ' + e);
      throw e;
    });
};
