import { apiService } from '@common/services/api-service';

import { getSupportPbi, supportPbiIdentityCode, type SupportPbiPerson } from './support-pbi-service';

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

export interface SupportSuitabilityPerson {
  partyId: string;
  name: string;
  identityCode: string;
  roles: string;
  assessment: SupportSuitabilityAssessmentName | '';
  comment: string;
}

export const supportSuitabilityPeople = (people: SupportPbiPerson[]): SupportSuitabilityPerson[] =>
  people.map((person) => ({
    partyId: person.partyId,
    name: person.name,
    identityCode: supportPbiIdentityCode(person.identityCode),
    roles: person.roles,
    assessment: (person.assessment as SupportSuitabilityAssessmentName) ?? '',
    comment: person.assessmentComment ?? '',
  }));

export const getSupportSuitabilityPeople = (
  errandId: string,
  municipalityId: string
): Promise<SupportSuitabilityPerson[]> =>
  getSupportPbi(errandId, municipalityId).then((read) => supportSuitabilityPeople(read.people));

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
