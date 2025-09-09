import { All } from '@supportmanagement/interfaces/priority';
import { ApiResponse, apiService } from './api-service';
import { CaseStatusResponse } from './casestatus-service';
import { appConfig } from '@config/appconfig';

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

export interface Relation {
  id?: string;
  type: string;
  source: {
    resourceId: string;
    type: string;
    service: string;
    namespace: string;
  };
  target: {
    resourceId: string;
    type: string;
    service: string;
    namespace: string;
  };
}

const formatServiceName = (str: string) => {
  if (str === 'SUPPORT_MANAGEMENT') return 'supportmanagement';
  if (str === 'CASE_DATA') return 'case-data';
  return str.toLocaleLowerCase();
};

interface RelationsResponse {
  relations: Relation[];
  meta: any;
}

export const createRelation = (
  municipalityId: string,
  sourceId: string,
  sourceErrandNumber: string,
  targetErrand: CaseStatusResponse
) => {
  const url = `${municipalityId}/relations`;

  const body: Partial<Relation> = {
    type: 'LINK',
    source: {
      resourceId: sourceId,
      type: sourceErrandNumber,
      service: appConfig.isSupportManagement ? 'supportmanagement' : 'case-data',
      namespace: '',
    },
    target: {
      resourceId: targetErrand.caseId,
      type: targetErrand.errandNumber,
      service: formatServiceName(targetErrand.system),
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

export const getSourceRelations = (municipalityId: string, sourceId: string, sort: string) => {
  const url = `${municipalityId}/sourcerelations/${sort}/${sourceId}`;

  return apiService
    .get<ApiResponse<RelationsResponse>>(url)
    .then((res) => {
      return res.data.data.relations;
    })
    .catch((e) => {
      console.error('Something went wrong when getting relation: ' + e);
      throw e;
    });
};

export const getTargetRelations = (municipalityId: string, targetId: string, sort: string) => {
  const url = `${municipalityId}/targetrelations/${sort}/${targetId}`;

  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => {
      return res.data.data;
    })
    .catch((e) => {
      console.error('Something went wrong when getting relation: ' + e);
      throw e;
    });
};
