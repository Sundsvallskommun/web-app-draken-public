import { ApiResponse, apiService } from './api-service';
import { sortBy } from './helper-service';

export interface CaseStatusResponse {
  caseId?: string;
  externalCaseId?: string;
  caseType?: string;
  status?: string;
  externalStatus?: string;
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
      return 'SGP';
    case 'SALARYANDPENSION':
      return 'LOP';
    case 'CONTACTSUNDSVALL':
      return 'KS';
    default:
      return '(okänd)';
  }
};

// The stakeholder card footer and the customer view tabs request the same status list,
// and switching tabs remounts the views, so party/org status lookups are cached briefly.
// Callers get copies since sortBy sorts in place. Errors evict so retries hit the API.
const STATUS_CACHE_TTL_MS = 2 * 60 * 1000;
const statusCache = new Map<string, { fetchedAt: number; promise: Promise<CaseStatusResponse[]> }>();

const cachedStatusFetch = (key: string, loader: () => Promise<CaseStatusResponse[]>) => {
  const entry = statusCache.get(key);
  if (entry && Date.now() - entry.fetchedAt < STATUS_CACHE_TTL_MS) {
    return entry.promise.then((list) => [...list]);
  }
  const promise = loader().catch((e) => {
    statusCache.delete(key);
    throw e;
  });
  statusCache.set(key, { fetchedAt: Date.now(), promise });
  return promise.then((list) => [...list]);
};

export const getStatusesUsingPartyId = (municipalityId: string, partyId: string) => {
  if (!municipalityId || !partyId) {
    return Promise.resolve([]);
  }
  const url = `${municipalityId}/party/${partyId}/statuses`;

  return cachedStatusFetch(`party-${url}`, () =>
    apiService
      .get<ApiResponse<any>>(url)
      .then((res) => {
        const sortedData = sortBy(res.data.data, 'firstSubmitted').slice(0, 200);
        return sortedData;
      })
      .catch((e) => {
        console.error('Something went wrong when fetching statuses for party: ' + e);
        throw e;
      })
  );
};

export const getStatusesUsingOrganizationNumber = (municipalityId: string, organizationNumber: string) => {
  if (!municipalityId || !organizationNumber) {
    return Promise.resolve([]);
  }
  const url = `${municipalityId}/${organizationNumber}/statuses`;

  return cachedStatusFetch(`org-${url}`, () =>
    apiService
      .get<ApiResponse<any>>(url)
      .then((res) => {
        const sortedData = sortBy(res.data.data, 'firstSubmitted').slice(0, 200);
        return sortedData;
      })
      .catch((e) => {
        console.error('Something went wrong when fetching statuses for organization: ' + e);
        throw e;
      })
  );
};

export const getErrandStatus = (municipalityId: string, query: string) => {
  const url = `${municipalityId}/errands/statuses/${query}`;

  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      const sortedData = sortBy(res.data.data, 'firstSubmitted').slice(0, 200);
      return sortedData;
    })
    .catch((e) => {
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};
