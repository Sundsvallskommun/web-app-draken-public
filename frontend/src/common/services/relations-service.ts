import { All } from '@supportmanagement/interfaces/priority';
import { ApiResponse, apiService } from './api-service';

export const relationsLabels = [
  { label: 'Status', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendetyp', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Verksamhet', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Ärendenummer', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: '', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
];

export const relationsLabelsCaseData = [
  { label: 'Status', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendeägare', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
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

interface RelationsResponse {
  relations: Relation[];
  meta: any;
}

export const createRelation = (municipalityId: string, sourceId: string, targetId: string) => {
  const url = `${municipalityId}/relations`;

  const body: Partial<Relation> = {
    type: 'LINK',
    source: {
      resourceId: sourceId,
      type: 'case',
      service: 'supportmanagement',
      namespace: 'CONTACTSUNDSVALL',
    },
    target: {
      resourceId: targetId,
      type: 'case',
      service: 'case-data',
      namespace: 'SBK_MEX',
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

export const getRelations = (municipalityId: string, sourceId: string, sort: string) => {
  const url = `${municipalityId}/relations/${sourceId}/${sort}`;

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
  const url = `${municipalityId}/targetrelations/${targetId}/${sort}`;

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
