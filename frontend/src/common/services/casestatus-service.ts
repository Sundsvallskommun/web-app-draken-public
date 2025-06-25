import { ApiResponse, apiService } from './api-service';
import { sortBy } from './helper-service';

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
