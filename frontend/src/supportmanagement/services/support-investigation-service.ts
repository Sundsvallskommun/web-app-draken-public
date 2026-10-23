import type { Investigation, Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import type { SupportInvestigationSectionInput } from './support-investigation-sections';

export interface SupportInvestigationInput {
  version: number;
  type?: string;
  title?: string;
  /** Replaces the whole list. */
  parameters?: Parameter[];
  summary?: string;
  conclusion?: string;
  recommendation?: string;
  recommendationMotivation?: string;
}

export const isSupportInvestigationCompleted = (investigation: Investigation | undefined): boolean =>
  investigation?.status === 'COMPLETED' || investigation?.status === 'CANCELLED';

export const isSupportInvestigationConflict = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 412;

export const getSupportInvestigation = (errandId: string, municipalityId: string): Promise<Investigation | undefined> =>
  apiService
    .get<Investigation[]>(`supportinvestigations/${municipalityId}/${errandId}`)
    .then((res) => (res.data ?? [])[0])
    .catch((e) => {
      console.error('Something went wrong when fetching the investigation');
      throw e;
    });

interface SupportInvestigationStart {
  title: string;
  sections: SupportInvestigationSectionInput[];
  type?: string;
  parameters?: Parameter[];
}

/** Answers with the investigation the errand already has, if any, instead of starting a second one. */
export const startSupportInvestigation = (
  errandId: string,
  municipalityId: string,
  title: string,
  sections: SupportInvestigationSectionInput[],
  protocol?: Pick<SupportInvestigationStart, 'type' | 'parameters'>
): Promise<Investigation> =>
  apiService
    .post<Investigation, SupportInvestigationStart>(`supportinvestigations/${municipalityId}/${errandId}`, {
      title,
      sections,
      ...protocol,
    })
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when starting the investigation');
      throw e;
    });

export const completeSupportInvestigationSections = (
  errandId: string,
  municipalityId: string,
  investigationId: string,
  sections: SupportInvestigationSectionInput[]
): Promise<Investigation> =>
  apiService
    .post<Investigation, { sections: SupportInvestigationSectionInput[] }>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}/sections`,
      { sections }
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when completing the investigation with its examinations');
      throw e;
    });

export const saveSupportInvestigationSection = (
  errandId: string,
  municipalityId: string,
  investigationId: string,
  sectionId: string,
  section: { text?: string; assessment?: string }
): Promise<Investigation> =>
  apiService
    .patch<Investigation, { text?: string; assessment?: string }>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}/sections/${sectionId}`,
      section
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving an examination of the investigation');
      throw e;
    });

export const SUPPORT_INVESTIGATION_TEXT_MAX_LENGTH = 8192;

export const saveSupportInvestigation = (
  errandId: string,
  municipalityId: string,
  investigationId: string,
  investigation: SupportInvestigationInput
): Promise<Investigation> =>
  apiService
    .patch<Investigation, SupportInvestigationInput>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}`,
      investigation
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving the investigation');
      throw e;
    });
