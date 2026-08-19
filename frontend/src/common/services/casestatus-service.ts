import { CaseLabels } from '@casedata/interfaces/case-label';

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
    case 'ROB':
      return 'ROB';
    default:
      return '(okänd)';
  }
};

// Ärendetypen kommer från case-data även när statusen visas i en supportmanagement-vy.
// Uppslaget är samlat här så att common-lagret har exakt en kant mot @casedata — den kanten
// är också sömmen att klippa i om casedata flyttas till ett eget repo.
export const caseTypeLabel = (errand: CaseStatusResponse) =>
  (CaseLabels.ALL as Record<string, string>)[errand.caseType ?? ''] ?? errand.caseType ?? '';

// Affärsregeln för "avslutat ärende" bor på ett ställe. Etiketterna kommer från
// casestatus-API:et, så ändras de där ska bara den här funktionen behöva röras.
export const isClosedCaseStatus = (errand: CaseStatusResponse) =>
  errand.status === 'Klart' || errand.externalStatus === 'Avslutat';

// The stakeholder card footer and the customer view tabs request the same status list,
// and switching tabs remounts the views, so party/org status lookups are cached briefly.
// Callers get fresh arrays *and* fresh objects, so no consumer can mutate a cached entry
// (sortBy sorts in place). Errors evict so retries hit the API.
const STATUS_CACHE_TTL_MS = 2 * 60 * 1000;
const statusCache = new Map<string, { fetchedAt: number; promise: Promise<CaseStatusResponse[]> }>();

const copyStatuses = (list: CaseStatusResponse[]) => list.map((status) => ({ ...status }));

// Cachen är avsiktligt kortlivad, men handläggaren ändrar själv det som cachas när relationer
// skapas eller tas bort. Anropas då från relations-service så att nästa läsning går mot API:et
// i stället för att visa en inaktuell bild.
export const clearCaseStatusCache = () => {
  statusCache.clear();
};

const cachedStatusFetch = (key: string, loader: () => Promise<CaseStatusResponse[]>) => {
  const now = Date.now();
  // Rensa utgångna poster så att kartan inte växer obegränsat under en lång session.
  statusCache.forEach((cached, cachedKey) => {
    if (now - cached.fetchedAt >= STATUS_CACHE_TTL_MS) {
      statusCache.delete(cachedKey);
    }
  });

  const entry = statusCache.get(key);
  if (entry) {
    return entry.promise.then(copyStatuses);
  }
  const promise = loader().catch((e) => {
    statusCache.delete(key);
    throw e;
  });
  statusCache.set(key, { fetchedAt: now, promise });
  return promise.then(copyStatuses);
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
