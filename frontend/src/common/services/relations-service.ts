import { All } from '@supportmanagement/interfaces/priority';
import { ApiResponse, apiService } from './api-service';

export const relationsLabels = [
  { label: 'Status', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärendetyp', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Verksamhet', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Ärendenummer', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: '', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
];

export interface Relations {
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

export const createRelation = (municipalityId: string, sourceId: string, targetId: string) => {
  const url = `${municipalityId}/relations`;

  console.log('Creating relation with sourceId: ' + sourceId + ' and targetId: ' + targetId);
  const body: Partial<Relations> = {
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
      service: 'casedata',
      namespace: 'SBK_MEX',
    },
  };

  return apiService
    .post<ApiResponse<Relations>, Partial<Relations>>(url, body)
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
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};

export const getRelations = (municipalityId: string, sourceId: string) => {
  const url = `${municipalityId}/relations?filter=source.resourceId%3A%27${sourceId}%27`;

  return apiService
    .get<ApiResponse<any>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when creating relation: ' + e);
      throw e;
    });
};
