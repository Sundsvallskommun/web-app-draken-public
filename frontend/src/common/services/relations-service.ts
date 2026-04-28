import { Relation, RelationPagedResponse } from '@common/data-contracts/relations/data-contracts';
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

export const getSourceRelations = (municipalityId: string, sourceId: string, sort: string): Promise<Relation[]> => {
  const url = `${municipalityId}/sourcerelations/${sort}/${sourceId}`;

  return apiService
    .get<ApiResponse<RelationPagedResponse>>(url)
    .then((res) => {
      return res.data.data.relations ?? [];
    })
    .catch(() => {
      return [] as Relation[];
    });
};

export interface RelationWithErrandNumber {
  relation: Relation;
  errandNumber: string;
}

interface ResolvedRelationsResponse {
  relations: Relation[];
  caseStatuses: CaseStatusResponse[];
}

export const getTargetRelations = (
  municipalityId: string,
  targetId: string,
  sort: string
): Promise<ResolvedRelationsResponse> => {
  const url = `${municipalityId}/targetrelations/${sort}/${targetId}`;

  return apiService
    .get<ApiResponse<ResolvedRelationsResponse>>(url)
    .then((res) => res.data.data)
    .catch(() => ({ relations: [], caseStatuses: [] }));
};

export const getResolvedSourceRelations = (
  municipalityId: string,
  sourceId: string,
  sort: string
): Promise<ResolvedRelationsResponse> => {
  const url = `${municipalityId}/resolvedrelations/${sort}/${sourceId}`;

  return apiService
    .get<ApiResponse<ResolvedRelationsResponse>>(url)
    .then((res) => res.data.data)
    .catch(() => ({ relations: [], caseStatuses: [] }));
};
