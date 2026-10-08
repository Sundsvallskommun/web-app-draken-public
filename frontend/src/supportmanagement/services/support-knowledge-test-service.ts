import { apiService } from '@common/services/api-service';

import { getSupportPbi, supportPbiIdentityCode, type SupportPbiPerson } from './support-pbi-service';

const SupportKnowledgeTestStatus = {
  APPROVED: 'APPROVED',
  FAILED: 'FAILED',
  BOOKED: 'BOOKED',
  RETAKE: 'RETAKE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

export type SupportKnowledgeTestStatusName =
  (typeof SupportKnowledgeTestStatus)[keyof typeof SupportKnowledgeTestStatus];

export const SUPPORT_KNOWLEDGE_TEST_STATUSES: {
  status: SupportKnowledgeTestStatusName;
  translationKey: string;
}[] = [
  { status: SupportKnowledgeTestStatus.APPROVED, translationKey: 'common:knowledge_test.status.approved' },
  { status: SupportKnowledgeTestStatus.FAILED, translationKey: 'common:knowledge_test.status.failed' },
  { status: SupportKnowledgeTestStatus.BOOKED, translationKey: 'common:knowledge_test.status.booked' },
  { status: SupportKnowledgeTestStatus.RETAKE, translationKey: 'common:knowledge_test.status.retake' },
  {
    status: SupportKnowledgeTestStatus.NOT_APPLICABLE,
    translationKey: 'common:knowledge_test.status.not_applicable',
  },
];

export interface SupportKnowledgeTestPerson {
  partyId: string;
  name: string;
  identityCode: string;
  roles: string;
  addedByHand: boolean;
  status: SupportKnowledgeTestStatusName | '';
  testedAt: string;
  comment: string;
}

export const supportKnowledgeTestPeople = (people: SupportPbiPerson[]): SupportKnowledgeTestPerson[] =>
  people.map((person) => ({
    partyId: person.partyId,
    name: person.name,
    identityCode: supportPbiIdentityCode(person.identityCode),
    roles: person.roles,
    addedByHand: person.addedByHand,
    status: (person.knowledgeTest as SupportKnowledgeTestStatusName) ?? '',
    testedAt: person.knowledgeTestDate ?? '',
    comment: person.knowledgeTestComment ?? '',
  }));

export const getSupportKnowledgeTestPeople = (
  errandId: string,
  municipalityId: string
): Promise<SupportKnowledgeTestPerson[]> =>
  getSupportPbi(errandId, municipalityId).then((read) => supportKnowledgeTestPeople(read.people));

export interface SupportKnowledgeTestRecord {
  status?: SupportKnowledgeTestStatusName;
  testedAt?: string;
  comment?: string;
}

/** A field the handler left empty is a field the errand should not carry, so it is left out rather than blanked. */
export const supportKnowledgeTestRecord = (person: SupportKnowledgeTestPerson): SupportKnowledgeTestRecord => ({
  status: person.status || undefined,
  testedAt: person.testedAt.trim() || undefined,
  comment: person.comment.trim() || undefined,
});

export const saveSupportKnowledgeTest = (
  errandId: string,
  municipalityId: string,
  partyId: string,
  record: SupportKnowledgeTestRecord
): Promise<void> =>
  apiService
    .patch<void, SupportKnowledgeTestRecord>(
      `supportpbi/${municipalityId}/${errandId}/${partyId}/knowledgetest`,
      record
    )
    .then(() => undefined)
    .catch((e) => {
      console.error('Something went wrong when saving the knowledge test of a person of significant influence');
      throw e;
    });
