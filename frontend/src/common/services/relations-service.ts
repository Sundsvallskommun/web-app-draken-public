import { Relation } from '@common/data-contracts/relations/data-contracts';
import { appConfig } from '@config/appconfig';
import { All } from '@supportmanagement/interfaces/priority';

import { ApiResponse, apiService } from './api-service';
import { CaseStatusResponse, clearCaseStatusCache } from './casestatus-service';

export const relationsToLabels = [
  { label: 'Status', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Ärendetyp', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Verksamhet', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Ärendenummer', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: '', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
];

export const relationsFromLabels = [
  { label: 'Status', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Ärendetyp', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Verksamhet', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Ärendenummer', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: '', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
];

// En ändrad relation gör både relationslistan och de cachade ärendelistorna inaktuella.
const invalidateRelationCaches = () => {
  clearResolvedRelationsCache();
  clearCaseStatusCache();
};

const formatServiceName = (str: string) => {
  if (str === 'SUPPORT_MANAGEMENT') return 'supportmanagement';
  if (str === 'CASE_DATA') return 'case-data';
  return str.toLocaleLowerCase();
};

export const createRelation = (municipalityId: string, sourceId: string, targetErrand: CaseStatusResponse) => {
  const url = `${municipalityId}/relations`;

  const body: Partial<Relation> = {
    type: 'LINK',
    source: {
      resourceId: sourceId,
      type: 'case',
      service: appConfig.isSupportManagement ? 'supportmanagement' : 'case-data',
      namespace: '',
    },
    target: {
      resourceId: targetErrand.caseId ?? '',
      type: 'case',
      service: formatServiceName(targetErrand.system ?? ''),
      namespace: targetErrand.namespace,
    },
  };

  return apiService
    .post<ApiResponse<Relation>, Partial<Relation>>(url, body)
    .then((res) => {
      invalidateRelationCaches();
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};

export const deleteRelation = (municipalityId: string, id: string) => {
  const url = `${municipalityId}/relations/${id}`;

  return apiService
    .deleteRequest<ApiResponse<boolean>>(url)
    .then((res) => {
      invalidateRelationCaches();
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when deleting relation: ' + e);
      throw e;
    });
};

export interface RelationWithErrandNumber {
  relation: Relation;
  errandNumber: string;
  otherResourceId: string;
}

interface ResolvedRelationsResponse {
  relations: Relation[];
  caseStatuses: CaseStatusResponse[];
}

const ALLOWED_SERVICES = ['supportmanagement', 'case-data'];

// The relations service returns service names in varying formats ('support-management',
// 'SUPPORT_MANAGEMENT', 'supportmanagement', 'case-data', 'casedata'). Normalise to our canonical
// values so filtering works regardless of which system created the relation.
const normalizeService = (service?: string): string => {
  const normalized = (service ?? '').toLowerCase().replace(/[-_]/g, '');
  if (normalized === 'supportmanagement') return 'supportmanagement';
  if (normalized === 'casedata') return 'case-data';
  return service ?? '';
};

export const getAllRelatedErrands = async (
  municipalityId: string,
  resourceId: string
): Promise<RelationWithErrandNumber[]> => {
  const [sourceResult, targetResult] = await Promise.all([
    getResolvedRelations('source', municipalityId, resourceId, 'ASC'),
    getResolvedRelations('target', municipalityId, resourceId, 'ASC'),
  ]);

  const allStatuses = [...sourceResult.caseStatuses, ...targetResult.caseStatuses];

  const fromSource: RelationWithErrandNumber[] = sourceResult.relations
    .filter((relation) => ALLOWED_SERVICES.includes(normalizeService(relation.target.service)))
    .map((relation) => {
      const otherResourceId = relation.target.resourceId;
      const status = allStatuses.find((s) => s.caseId === otherResourceId);
      return {
        relation,
        errandNumber: status?.errandNumber ?? otherResourceId,
        otherResourceId,
      };
    });

  const fromTarget: RelationWithErrandNumber[] = targetResult.relations
    .filter((relation) => ALLOWED_SERVICES.includes(normalizeService(relation.source.service)))
    .map((relation) => {
      const otherResourceId = relation.source.resourceId;
      const status = allStatuses.find((s) => s.caseId === otherResourceId);
      return {
        relation,
        errandNumber: status?.errandNumber ?? otherResourceId,
        otherResourceId,
      };
    });

  const seen = new Set<string>();
  const deduplicated = [...fromSource, ...fromTarget].filter((entry) => {
    if (seen.has(entry.relation.id!)) return false;
    seen.add(entry.relation.id!);
    return true;
  });

  return deduplicated.sort((a, b) => a.errandNumber.localeCompare(b.errandNumber));
};

export interface ReferredFromStakeholder {
  externalId: string;
  externalIdType: string;
  personNumber: string;
  organizationNumber: string;
  role: string;
  roleDisplayName: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  address: string;
  careOf: string;
  zipCode: string;
  city: string;
  contactChannels: { type: string; value: string }[];
}

export interface ReferredFromErrandResponse {
  errandNumber: string;
  classificationCategory: string;
  classificationCategoryDisplayName: string;
  classificationType: string;
  classificationTypeDisplayName: string;
  priority: string;
  channel: string;
  created: string;
  description: string;
  title: string;
  stakeholders: ReferredFromStakeholder[];
}

export const getReferredFromErrands = (
  municipalityId: string,
  resourceId: string
): Promise<ReferredFromErrandResponse[]> => {
  const url = `${municipalityId}/relations/referredfrom/${resourceId}`;

  return apiService
    .get<ApiResponse<ReferredFromErrandResponse[]>>(url)
    .then((res) => res.data.data)
    .catch((e) => {
      console.error('Error fetching referred-from errands: ' + e);
      return [];
    });
};

// Ett ärendes relationer efterfrågas av flera komponenter samtidigt — kundbildsfoten renderas
// en gång per intressentkort och modalen hämtar samma lista. Utan dedupliceringen blir det ett
// identiskt anrop per kort. Fönstret är kort och töms så fort en relation skapas eller tas bort.
const RESOLVED_RELATIONS_TTL_MS = 30 * 1000;
const resolvedRelationsCache = new Map<string, { fetchedAt: number; promise: Promise<ResolvedRelationsResponse> }>();

const clearResolvedRelationsCache = () => {
  resolvedRelationsCache.clear();
};

export const getResolvedRelations = (
  direction: 'source' | 'target',
  municipalityId: string,
  resourceId: string,
  sort: string
): Promise<ResolvedRelationsResponse> => {
  const url = `${municipalityId}/resolvedrelations/${direction}/${sort}/${resourceId}`;

  const now = Date.now();
  resolvedRelationsCache.forEach((cached, key) => {
    if (now - cached.fetchedAt >= RESOLVED_RELATIONS_TTL_MS) {
      resolvedRelationsCache.delete(key);
    }
  });

  const entry = resolvedRelationsCache.get(url);
  if (entry) {
    return entry.promise.then((res) => ({ relations: [...res.relations], caseStatuses: [...res.caseStatuses] }));
  }

  const promise = apiService
    .get<ApiResponse<ResolvedRelationsResponse>>(url)
    .then((res) => res.data.data)
    .catch(() => {
      resolvedRelationsCache.delete(url);
      return { relations: [], caseStatuses: [] };
    });
  resolvedRelationsCache.set(url, { fetchedAt: now, promise });

  return promise.then((res) => ({ relations: [...res.relations], caseStatuses: [...res.caseStatuses] }));
};
