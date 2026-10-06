import { apiService } from '@common/services/api-service';
import { engagementRoles } from '@common/services/legal-entity-service';

import { getSupportPbiCandidates, type SupportPbiCandidate } from './support-pbi-service';

const SupportSuitabilityAssessment = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  DEFICIENCY: 'DEFICIENCY',
} as const;

export type SupportSuitabilityAssessmentName =
  (typeof SupportSuitabilityAssessment)[keyof typeof SupportSuitabilityAssessment];

export const SUPPORT_SUITABILITY_ASSESSMENTS: {
  assessment: SupportSuitabilityAssessmentName;
  translationKey: string;
}[] = [
  {
    assessment: SupportSuitabilityAssessment.APPROVED,
    translationKey: 'common:personal_suitability.assessment.approved',
  },
  {
    assessment: SupportSuitabilityAssessment.DEFICIENCY,
    translationKey: 'common:personal_suitability.assessment.deficiency',
  },
  {
    assessment: SupportSuitabilityAssessment.PENDING,
    translationKey: 'common:personal_suitability.assessment.pending',
  },
];

export const SUPPORT_PARAMETER_VALUE_MAX_LENGTH = 3000;

export interface SupportSuitabilityPerson {
  partyId: string;
  name: string;
  identityCode: string;
  roles: string;
  assessment: SupportSuitabilityAssessmentName | '';
  comment: string;
}

const hyphenated = (identityCode: string): string =>
  /^\d{12}$/.test(identityCode) ? `${identityCode.slice(0, 8)}-${identityCode.slice(8)}` : identityCode;

export const supportSuitabilityPeople = (candidates: SupportPbiCandidate[]): SupportSuitabilityPerson[] =>
  candidates
    .filter((candidate) => candidate.marked && candidate.partyId && candidate.name)
    .map((candidate) => ({
      partyId: candidate.partyId as string,
      name: candidate.name as string,
      identityCode: hyphenated(candidate.identity?.code ?? ''),
      roles: engagementRoles(candidate),
      assessment: (candidate.assessment as SupportSuitabilityAssessmentName) ?? '',
      comment: candidate.assessmentComment ?? '',
    }));

export const getSupportSuitabilityPeople = (
  errandId: string,
  municipalityId: string
): Promise<SupportSuitabilityPerson[]> =>
  getSupportPbiCandidates(errandId, municipalityId).then(supportSuitabilityPeople);

export interface SupportSuitabilityVerdict {
  assessment: SupportSuitabilityAssessmentName;
  comment?: string;
}

export const assessSupportSuitability = (
  errandId: string,
  municipalityId: string,
  partyId: string,
  verdict: SupportSuitabilityVerdict
): Promise<void> =>
  apiService
    .patch<void, SupportSuitabilityVerdict>(`supportpbi/${municipalityId}/${errandId}/${partyId}/assessment`, verdict)
    .then(() => undefined)
    .catch((e) => {
      console.error('Something went wrong when saving the assessment of a person of significant influence');
      throw e;
    });

export const supportSuitabilityProblem = (people: SupportSuitabilityPerson[]): string | undefined => {
  if (people.length === 0) return 'common:personal_suitability.validation.no_people';
  if (people.some((person) => !person.assessment)) return 'common:personal_suitability.validation.assessment_required';
  return undefined;
};
