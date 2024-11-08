import { Channels } from '@casedata/interfaces/channels';
import { Appeal, Decision } from '@casedata/interfaces/decision';
import { ErrandPhase } from '@casedata/interfaces/errand-phase';
import { All, Priority } from '@casedata/interfaces/priority';
import { FacilityDTO } from '@common/interfaces/facilities';
import { Data } from '@common/services/api-service';
import { Attachment } from './attachment';
import { ApiErrandStatus } from './errand-status';
import { ErrandNote } from './errandNote';
import { CasedataOwnerOrContact, CreateStakeholderDto, Stakeholder } from './stakeholder';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';

export interface ApiErrand {
  id: number;
  errandNumber: string;
  externalCaseId: string;
  caseType: string;
  priority: Priority;
  phase: ErrandPhase;
  channel: string;
  statuses: ApiErrandStatus[];
  description: string;
  caseTitleAddition: string;
  startDate: string;
  endDate: string;
  diaryNumber: string;
  municipalityId: string;
  applicationReceived: string;
  extraParameters: ExtraParameter[];
  decisions: Decision[];
  appeals: Appeal[];
  created: string;
  updated: string;
  stakeholders: Stakeholder[];
  facilities: FacilityDTO[];
  notes: ErrandNote[];
  messageIds: { messageId: string; adAccount: string }[];
}

export interface ApiPagingData {
  pageable: {
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    pageNumber: number;
    pageSize: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface PagedApiErrandsResponse extends ApiPagingData {
  content: ApiErrand[];
}

export interface IErrand {
  id: number;
  externalCaseId: string;
  errandNumber: string;
  caseType: string;
  label: string;
  description: string;
  administrator: Stakeholder;
  administratorName: string;
  priority: string;
  status: string;
  statusDescription: string;
  phase: ErrandPhase;
  channel: Channels;
  municipalityId: string;
  stakeholders: CasedataOwnerOrContact[];
  facilities: FacilityDTO[];
  created: string;
  updated: string;
  notes: ErrandNote[];
  decisions: Decision[];
  appeals: Appeal[];
  attachments: Attachment[];
  messageIds: { messageId: string; adAccount: string }[];
  extraParameters: ExtraParameter[];
}

export interface ErrandsData extends Data {
  errands: IErrand[];
  isLoading?: boolean;
  page?: number;
  size?: number;
  totalPages?: number;
  totalElements?: number;
  labels: {
    label: string;
    screenReaderOnly: boolean;
    sortable: boolean;
    sticky?: boolean;
    shownForStatus: ErrandPhase | All;
  }[];
}

export interface RegisterErrandData {
  id?: string;
  errandNumber?: string;
  externalCaseId: string;
  priority: string;
  caseType: string;
  description: string;
  caseTitleAddition: string;
  startDate: string;
  endDate: string;
  diaryNumber: string;
  status: string;
  phase: ErrandPhase;
  municipalityId: string;
  // statuses: StatusesDto[];
  stakeholders: Partial<CreateStakeholderDto>[];
  facilities: string[];
  attachments: string[] | FileList[];
  applicationReceived: string;
  decision: string;
  extraParameters: ExtraParameter[];
}
