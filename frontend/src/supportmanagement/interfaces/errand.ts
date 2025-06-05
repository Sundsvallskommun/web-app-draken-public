import { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import { Status, SupportStakeholderFormModel, ExternalTags } from '@supportmanagement/services/support-errand-service';
import { Priority } from './priority';
import { CParameter } from 'src/data-contracts/backend/data-contracts';

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

export interface RegisterSupportErrandFormModel {
  id?: string;
  caseId?: string;
  title?: string;
  priority?: Priority;
  category: string;
  type: string;
  labels: string[];
  contactReason: string;
  contactReasonDescription: string;
  businessRelated: boolean;
  status: Status;
  resolution?: string;
  municipalityId: string;
  channel: string;
  description: string;
  notes: string;
  messageContact: string;
  assignedUserId: string;
  assignedGroupId: string;
  customer?: SupportStakeholderFormModel[];
  contacts: SupportStakeholderFormModel[];
  attachments: { file: File | undefined }[];
  newAttachment: FileList | undefined;
  escalationEmail?: string;
  escalationMessageBody?: string;
  escalationMessageBodyPlaintext: string;
  existingAttachments: SupportAttachment[];
  addExisting: string;
  externalTags?: ExternalTags;
  facilities?: [];
  parameters?: CParameter[];
}

export interface UpdateSupportErrandFormModel {
  id: string;
  caseId: string;
  category: string;
  type: string;
  contactReason: string;
  contactReasonDescription: string;
  businessRelated: boolean;
  municipalityId: string;
  channel: string;
  description: string;
  attachments: { file: File | undefined }[];
  newAttachment: FileList | undefined;
  facilities?: [];
}
