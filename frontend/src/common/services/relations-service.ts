import { Relation } from '@common/data-contracts/relations/data-contracts';
import { appConfig } from '@config/appconfig';
import { All } from '@supportmanagement/interfaces/priority';

import { ApiResponse, apiService } from './api-service';
import { CaseStatusResponse } from './casestatus-service';

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
    .then((res) => res.data)
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
    .filter((relation) => ALLOWED_SERVICES.includes(relation.target.service))
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
    .filter((relation) => ALLOWED_SERVICES.includes(relation.source.service))
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

export const getResolvedRelations = (
  direction: 'source' | 'target',
  municipalityId: string,
  resourceId: string,
  sort: string
): Promise<ResolvedRelationsResponse> => {
  const url = `${municipalityId}/resolvedrelations/${direction}/${sort}/${resourceId}`;

  return apiService
    .get<ApiResponse<ResolvedRelationsResponse>>(url)
    .then((res) => res.data.data)
    .catch(() => ({ relations: [], caseStatuses: [] }));
};
