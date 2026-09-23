import type { Investigation } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

export interface SupportInvestigationSectionInput {
  sectionKey: string;
  heading: string;
  sortOrder: number;
}

export interface SupportInvestigationInput {
  version: number;
  summary?: string;
  conclusion?: string;
  recommendation?: string;
  recommendationMotivation?: string;
}

export interface SupportInvestigationSectionUpdate {
  text?: string;
  assessment?: string;
}

/**
 * The examinations an AoT investigation is made of, in the order the business examines them. Support
 * Management holds no list of its own - the sections are written when the investigation starts.
 */
export const SUPPORT_INVESTIGATION_SECTIONS: { sectionKey: string; headingKey: string; sortOrder: number }[] = [
  { sectionKey: 'statements', headingKey: 'common:investigation.sections.statements', sortOrder: 1 },
  {
    sectionKey: 'personal_suitability',
    headingKey: 'common:investigation.sections.personal_suitability',
    sortOrder: 2,
  },
  {
    sectionKey: 'financial_suitability',
    headingKey: 'common:investigation.sections.financial_suitability',
    sortOrder: 3,
  },
  { sectionKey: 'knowledge_test', headingKey: 'common:investigation.sections.knowledge_test', sortOrder: 4 },
  { sectionKey: 'premises', headingKey: 'common:investigation.sections.premises', sortOrder: 5 },
];

const ASSESSMENT_KEYS: Record<string, string> = {
  PENDING: 'common:investigation.assessments.pending',
  APPROVED: 'common:investigation.assessments.approved',
  DEFICIENCY: 'common:investigation.assessments.deficiency',
  NOT_APPLICABLE: 'common:investigation.assessments.not_applicable',
};

export const SUPPORT_INVESTIGATION_ASSESSMENTS = Object.keys(ASSESSMENT_KEYS);

export const supportInvestigationAssessmentKey = (assessment: string | undefined): string =>
  assessment ? ASSESSMENT_KEYS[assessment] ?? assessment : '';

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

export const startSupportInvestigation = (
  errandId: string,
  municipalityId: string,
  title: string,
  sections: SupportInvestigationSectionInput[]
): Promise<Investigation> =>
  apiService
    .post<Investigation, { title: string; sections: SupportInvestigationSectionInput[] }>(
      `supportinvestigations/${municipalityId}/${errandId}`,
      { title, sections }
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when starting the investigation');
      throw e;
    });

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

export const saveSupportInvestigationSection = (
  errandId: string,
  municipalityId: string,
  investigationId: string,
  sectionId: string,
  section: SupportInvestigationSectionUpdate
): Promise<Investigation> =>
  apiService
    .patch<Investigation, SupportInvestigationSectionUpdate>(
      `supportinvestigations/${municipalityId}/${errandId}/${investigationId}/sections/${sectionId}`,
      section
    )
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving an examination of the investigation');
      throw e;
    });
