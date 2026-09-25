import { apiService } from '@common/services/api-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';

export interface SupportPbiCandidate extends LegalEntityEngagement {
  partyId?: string;
  marked?: boolean;
  unresolved?: boolean;
}

const SUPPORT_PBI_ROLE = 'PBI';

export const namespaceHasPbiRole = (metadata: SupportMetadata | undefined): boolean =>
  !!metadata?.roles?.some((role) => role.name === SUPPORT_PBI_ROLE);

export const getSupportPbiCandidates = (errandId: string, municipalityId: string): Promise<SupportPbiCandidate[]> =>
  apiService
    .get<SupportPbiCandidate[]>(`supportpbi/${municipalityId}/${errandId}/candidates`)
    .then((res) => res.data ?? [])
    .catch((e) => {
      console.error('Something went wrong when fetching the people engaged in the company');
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

export const unmarkSupportPbi = (errandId: string, municipalityId: string, partyId: string): Promise<void> =>
  apiService
    .deleteRequest<void>(`supportpbi/${municipalityId}/${errandId}/${partyId}`)
    .then(() => undefined)
    .catch((e) => {
      console.error('Something went wrong when removing the marking of a person of significant influence');
      throw e;
    });

export const isSupportPbiConflict = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 412;
