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

export const createRelation = (sourceId: string, sourceErrandNumber: string, targetErrand: CaseStatusResponse) => {
  const url = `/relations`;

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

export const deleteRelation = (id: string) => {
  const url = `/relations/${id}`;

  return apiService
    .deleteRequest<ApiResponse<boolean>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when deleting relation: ' + e);
      throw e;
    });
};

export const getSourceRelations = (sourceId: string, sort: string): Promise<Relation[]> => {
  const url = `/sourcerelations/${sort}/${sourceId}`;

  return apiService
    .get<ApiResponse<RelationPagedResponse>>(url)
    .then((res) => {
      return res.data.data.relations;
    })
    .catch(() => {
      return [] as Relation[];
    });
};

export const getTargetRelations = (targetId: string, sort: string): Promise<Relation[]> => {
  const url = `/targetrelations/${sort}/${targetId}`;

  return apiService
    .get<ApiResponse<RelationPagedResponse>>(url)
    .then((res) => {
      return res.data.data.relations;
    })
    .catch(() => {
      return [] as Relation[];
    });
};
