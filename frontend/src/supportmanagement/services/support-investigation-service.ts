import type { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import type { SupportInvestigationSectionInput } from './support-investigation-sections';
import type { SupportJsonParameter, SupportJsonParameterWrite } from './support-json-parameter-service';

/** A section as the BFF answers it: with the JSON parameters Support Management keeps beside it. */
export type SupportInvestigationSection = InvestigationSection & { jsonParameters?: SupportJsonParameter[] };

/** An investigation as the BFF answers it: with its JSON parameters, and those of each section. */
export type SupportInvestigation = Omit<Investigation, 'sections'> & {
  sections?: SupportInvestigationSection[];
  jsonParameters?: SupportJsonParameter[];
};

export interface SupportInvestigationInput {
  version: number;
  type?: string;
  title?: string;
  summary?: string;
  conclusion?: string;
  recommendation?: string;
  recommendationMotivation?: string;
}

export const isSupportInvestigationCompleted = (investigation: Investigation | undefined): boolean =>
  investigation?.status === 'COMPLETED' || investigation?.status === 'CANCELLED';

export const isSupportInvestigationConflict = (error: unknown): boolean =>
  (error as { response?: { status?: number } })?.response?.status === 412;

export const getSupportInvestigation = (
  errandId: string,
  municipalityId: string
): Promise<SupportInvestigation | undefined> =>
  apiService
    .get<SupportInvestigation[]>(`supportinvestigations/${municipalityId}/${errandId}`)
    .then((res) => (res.data ?? [])[0])
    .catch((e) => {
      console.error('Something went wrong when fetching the investigation');
      throw e;
    });

interface SupportInvestigationStart {
  title: string;
  sections: SupportInvestigationSectionInput[];
  type?: string;
}

/** Answers with the investigation the errand already has, if any, instead of starting a second one. */
export const startSupportInvestigation = (
  errandId: string,
  municipalityId: string,
  title: string,
  sections: SupportInvestigationSectionInput[],
  protocol?: Pick<SupportInvestigationStart, 'type'>
): Promise<SupportInvestigation> =>
  apiService
    .post<SupportInvestigation, SupportInvestigationStart>(`supportinvestigations/${municipalityId}/${errandId}`, {
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
): Promise<SupportInvestigation> =>
  apiService
    .post<SupportInvestigation, { sections: SupportInvestigationSectionInput[] }>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}/sections`,
      { sections }
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when completing the investigation with its examinations');
      throw e;
    });

export interface SupportInvestigationSectionUpdate {
  text?: string;
  assessment?: string;
}

export const saveSupportInvestigationSection = (
  errandId: string,
  municipalityId: string,
  investigationId: string,
  sectionId: string,
  section: SupportInvestigationSectionUpdate
): Promise<SupportInvestigation> =>
  apiService
    .patch<SupportInvestigation, SupportInvestigationSectionUpdate>(
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
): Promise<SupportInvestigation> =>
  apiService
    .patch<SupportInvestigation, SupportInvestigationInput>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}`,
      investigation
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving the investigation');
      throw e;
    });

/** Sets status COMPLETED; the inspection process builds its protocol only from a completed investigation. */
export const completeSupportInvestigation = (
  errandId: string,
  municipalityId: string,
  investigation: Investigation
): Promise<SupportInvestigation> =>
  apiService
    .patch<SupportInvestigation, SupportInvestigationInput>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigation.id}/complete`,
      { version: investigation.version ?? 0 }
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when completing the investigation');
      throw e;
    });

/** Deletes the JSON parameter of the investigation under the key. */
export const deleteSupportInvestigationJsonParameter = (
  errandId: string,
  municipalityId: string,
  investigationId: string,
  key: string
): Promise<SupportInvestigation> =>
  apiService
    .deleteRequest<SupportInvestigation>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}/json-parameters/${key}`
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when deleting a JSON parameter of the investigation');
      throw e;
    });

/** Creates or replaces the JSON parameter of the investigation under the key. */
export const saveSupportInvestigationJsonParameter = (
  errandId: string,
  municipalityId: string,
  investigationId: string,
  key: string,
  parameter: SupportJsonParameterWrite
): Promise<SupportInvestigation> =>
  apiService
    .put<SupportInvestigation, SupportJsonParameterWrite>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}/json-parameters/${key}`,
      parameter
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving a JSON parameter of the investigation');
      throw e;
    });

/** Creates or replaces the JSON parameter of the section under the key. */
export const saveSupportInvestigationSectionJsonParameter = (
  errandId: string,
  municipalityId: string,
  investigationId: string,
  sectionId: string,
  key: string,
  parameter: SupportJsonParameterWrite
): Promise<SupportInvestigation> =>
  apiService
    .put<SupportInvestigation, SupportJsonParameterWrite>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}/sections/${sectionId}/json-parameters/${key}`,
      parameter
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving a JSON parameter of an examination');
      throw e;
    });
