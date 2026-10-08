import { apiService } from '@common/services/api-service';
import { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';

export interface SupportPbiCandidate extends LegalEntityEngagement {
  partyId?: string;
  marked?: boolean;
  unresolved?: boolean;
  assessment?: string;
  assessmentComment?: string;
}

export interface SupportPbiPerson {
  partyId: string;
  name: string;
  identityCode: string;
  roles: string;
  addedByHand: boolean;
  assessment?: string;
  assessmentComment?: string;
  knowledgeTest?: string;
  knowledgeTestDate?: string;
  knowledgeTestComment?: string;
}

// The marking is a stakeholder parameter, since a stakeholder can only have one role in SupportManagement.
export const SUPPORT_PBI_PARAMETER = 'PBI';

export const SUPPORT_PARAMETER_VALUE_MAX_LENGTH = 3000;

export const supportPbiIdentityCode = (identityCode: string): string =>
  /^\d{12}$/.test(identityCode) ? `${identityCode.slice(0, 8)}-${identityCode.slice(8)}` : identityCode;

export const getSupportPbiCandidates = (errandId: string, municipalityId: string): Promise<SupportPbiCandidate[]> =>
  apiService
    .get<SupportPbiCandidate[]>(`supportpbi/${municipalityId}/${errandId}/candidates`)
    .then((res) => res.data ?? [])
    .catch((e) => {
      console.error('Something went wrong when fetching the people engaged in the company');
      throw e;
    });

export interface SupportPbi {
  candidates: SupportPbiCandidate[];
  people: SupportPbiPerson[];
}

export const getSupportPbi = (errandId: string, municipalityId: string): Promise<SupportPbi> =>
  apiService
    .get<SupportPbi>(`supportpbi/${municipalityId}/${errandId}`)
    .then((res) => ({ candidates: res.data?.candidates ?? [], people: res.data?.people ?? [] }))
    .catch((e) => {
      console.error('Something went wrong when fetching the people of significant influence');
      throw e;
    });

export const markSupportPbi = (errandId: string, municipalityId: string, partyId: string): Promise<void> =>
  apiService
    .post<void, { partyId: string }>(`supportpbi/${municipalityId}/${errandId}`, { partyId })
    .then(() => undefined)
    .catch((e) => {
      console.error('Something went wrong when marking a person of significant influence');
      throw e;
    });

export interface SupportPbiByHand {
  partyId: string;
  role?: string;
}

export const addSupportPbiByHand = (
  errandId: string,
  municipalityId: string,
  person: SupportPbiByHand
): Promise<void> =>
  apiService
    .post<void, SupportPbiByHand>(`supportpbi/${municipalityId}/${errandId}/person`, person)
    .then(() => undefined)
    .catch((e) => {
      console.error('Something went wrong when adding a person of significant influence');
      throw e;
    });

export const removeSupportPbi = (errandId: string, municipalityId: string, partyId: string): Promise<void> =>
  apiService
    .deleteRequest<void>(`supportpbi/${municipalityId}/${errandId}/${partyId}`)
    .then(() => undefined)
    .catch((e) => {
      console.error('Something went wrong when removing a person of significant influence');
      throw e;
    });

export const isSupportPbiConflict = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 412;
