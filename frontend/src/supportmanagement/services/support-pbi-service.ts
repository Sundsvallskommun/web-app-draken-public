import { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { engagementRoles, type LegalEntityPersonEngagement } from '@common/services/legal-entity-service';
import {
  emptyContact,
  ExternalIdType,
  SupportStakeholderFormModel,
  SupportStakeholderTypeEnum,
} from '@supportmanagement/services/support-errand-service';
import { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';
import { v4 as uuidv4 } from 'uuid';

/**
 * A person of significant influence (PBI) is a stakeholder on the errand with a few parameters. The company
 * engagements from LegalEntity are only a convenient way to find people to add; the marking itself lives in
 * the form and is saved by Spara ärende like everything else. Everything here is pure.
 */

const PBI_PARAMETER = 'PBI';
const PBI_SOURCE_PARAMETER = 'PBI_SOURCE';
const PBI_ROLE_PARAMETER = 'PBI_ROLE';
const PBI_MOTIVATION_PARAMETER = 'PBI_MOTIVATION';
const PBI_ASSESSMENT_PARAMETER = 'PBI_ASSESSMENT';
const PBI_ASSESSMENT_COMMENT_PARAMETER = 'PBI_ASSESSMENT_COMMENT';
const PBI_ENGAGEMENT_PARAMETER = 'PBI_ENGAGEMENT';
const PBI_KNOWLEDGE_TEST_COUNT_PARAMETER = 'PBI_KNOWLEDGE_TESTS';

const PBI_KNOWLEDGE_TEST_PARAMETER = 'PBI_KNOWLEDGE_TEST';
const PBI_KNOWLEDGE_TEST_DATE_PARAMETER = 'PBI_KNOWLEDGE_TEST_DATE';
const PBI_KNOWLEDGE_TEST_COMMENT_PARAMETER = 'PBI_KNOWLEDGE_TEST_COMMENT';

const PBI_PARAMETERS = new Set([
  PBI_PARAMETER,
  PBI_SOURCE_PARAMETER,
  PBI_ROLE_PARAMETER,
  PBI_MOTIVATION_PARAMETER,
  PBI_ASSESSMENT_PARAMETER,
  PBI_ASSESSMENT_COMMENT_PARAMETER,
  PBI_ENGAGEMENT_PARAMETER,
  PBI_KNOWLEDGE_TEST_COUNT_PARAMETER,
  PBI_KNOWLEDGE_TEST_PARAMETER,
  PBI_KNOWLEDGE_TEST_DATE_PARAMETER,
  PBI_KNOWLEDGE_TEST_COMMENT_PARAMETER,
]);

/** Where a stakeholder that exists only for the marking came from. A stakeholder without a source was there before. */
export const PbiSource = { COMPANY: 'COMPANY', MANUAL: 'MANUAL' } as const;
export type PbiSourceName = (typeof PbiSource)[keyof typeof PbiSource];

const PbiAssessment = { PENDING: 'PENDING', APPROVED: 'APPROVED', DEFICIENCY: 'DEFICIENCY' } as const;
export type PbiAssessmentName = (typeof PbiAssessment)[keyof typeof PbiAssessment];

export const PBI_ASSESSMENTS: { assessment: PbiAssessmentName; translationKey: string }[] = [
  { assessment: PbiAssessment.APPROVED, translationKey: 'common:personal_suitability.assessment.approved' },
  { assessment: PbiAssessment.DEFICIENCY, translationKey: 'common:personal_suitability.assessment.deficiency' },
  { assessment: PbiAssessment.PENDING, translationKey: 'common:personal_suitability.assessment.pending' },
];

export const PbiKnowledgeTestStatus = {
  APPROVED: 'APPROVED',
  FAILED: 'FAILED',
  BOOKED: 'BOOKED',
  RETAKE: 'RETAKE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;
export type PbiKnowledgeTestStatusName = (typeof PbiKnowledgeTestStatus)[keyof typeof PbiKnowledgeTestStatus];

export const PBI_KNOWLEDGE_TEST_STATUSES: { status: PbiKnowledgeTestStatusName; translationKey: string }[] = [
  { status: PbiKnowledgeTestStatus.APPROVED, translationKey: 'common:knowledge_test.status.approved' },
  { status: PbiKnowledgeTestStatus.FAILED, translationKey: 'common:knowledge_test.status.failed' },
  { status: PbiKnowledgeTestStatus.BOOKED, translationKey: 'common:knowledge_test.status.booked' },
  { status: PbiKnowledgeTestStatus.RETAKE, translationKey: 'common:knowledge_test.status.retake' },
  { status: PbiKnowledgeTestStatus.NOT_APPLICABLE, translationKey: 'common:knowledge_test.status.not_applicable' },
];

const PbiKnowledgeTestType = {
  PERMANENT_PUBLIC: 'PERMANENT_PUBLIC',
  PERMANENT_CLOSED_CATERING: 'PERMANENT_CLOSED_CATERING',
  PERMANENT_CLOSED: 'PERMANENT_CLOSED',
  TEMPORARY_PUBLIC: 'TEMPORARY_PUBLIC',
  TEMPORARY_CLOSED: 'TEMPORARY_CLOSED',
  TASTING: 'TASTING',
  FARM_SALES: 'FARM_SALES',
} as const;
export type PbiKnowledgeTestTypeName = (typeof PbiKnowledgeTestType)[keyof typeof PbiKnowledgeTestType];

export const PBI_KNOWLEDGE_TEST_TYPES: { type: PbiKnowledgeTestTypeName; translationKey: string }[] = [
  { type: PbiKnowledgeTestType.PERMANENT_PUBLIC, translationKey: 'common:knowledge_test.types.permanent_public' },
  {
    type: PbiKnowledgeTestType.PERMANENT_CLOSED_CATERING,
    translationKey: 'common:knowledge_test.types.permanent_closed_catering',
  },
  { type: PbiKnowledgeTestType.PERMANENT_CLOSED, translationKey: 'common:knowledge_test.types.permanent_closed' },
  { type: PbiKnowledgeTestType.TEMPORARY_PUBLIC, translationKey: 'common:knowledge_test.types.temporary_public' },
  { type: PbiKnowledgeTestType.TEMPORARY_CLOSED, translationKey: 'common:knowledge_test.types.temporary_closed' },
  { type: PbiKnowledgeTestType.TASTING, translationKey: 'common:knowledge_test.types.tasting' },
  { type: PbiKnowledgeTestType.FARM_SALES, translationKey: 'common:knowledge_test.types.farm_sales' },
];

export const PBI_KNOWLEDGE_TEST_TYPE_OTHER = 'OTHER';

const knowledgeTestType = (type: string): { translationKey: string } | undefined =>
  PBI_KNOWLEDGE_TEST_TYPES.find((candidate) => candidate.type === type);

export const knowledgeTestTypeChoice = (type: string): string =>
  !type || knowledgeTestType(type) ? type : PBI_KNOWLEDGE_TEST_TYPE_OTHER;

export const knowledgeTestTypeName = (type: string, translate: (key: string) => string): string => {
  const named = knowledgeTestType(type);
  return named ? translate(named.translationKey) : type;
};

export const PBI_ROLE_MAX_LENGTH = 200;
export const PBI_KNOWLEDGE_TEST_TYPE_MAX_LENGTH = 200;
export const SUPPORT_PARAMETER_VALUE_MAX_LENGTH = 3000;

/** One test of one person. A status cleared is a status the errand no longer carries. */
export interface PbiKnowledgeTest {
  type: string;
  status: PbiKnowledgeTestStatusName | '';
  testedAt: string;
  comment: string;
}

export const emptyKnowledgeTest = (): PbiKnowledgeTest => ({ type: '', status: '', testedAt: '', comment: '' });

const knowledgeTestIsEmpty = (test: PbiKnowledgeTest): boolean =>
  !test.type.trim() && !test.status && !test.testedAt.trim() && !test.comment.trim();

export interface Pbi {
  source?: PbiSourceName;
  role: string;
  motivation: string;
  assessment: PbiAssessmentName | '';
  comment: string;
  knowledgeTests: PbiKnowledgeTest[];
  engagements: string[];
}

const valueOf = (stakeholder: Pick<SupportStakeholderFormModel, 'parameters'>, key: string): string | undefined =>
  stakeholder.parameters?.find((parameter) => parameter.key === key)?.values?.[0] || undefined;

const valuesOf = (stakeholder: Pick<SupportStakeholderFormModel, 'parameters'>, key: string): string[] =>
  stakeholder.parameters?.find((parameter) => parameter.key === key)?.values?.filter(Boolean) ?? [];

const KNOWLEDGE_TEST_KEY = /^PBI_KNOWLEDGE_TEST_(\d+)_(TYPE|STATUS|DATE|COMMENT)$/;

const KNOWLEDGE_TEST_FIELDS: Record<string, keyof PbiKnowledgeTest> = {
  TYPE: 'type',
  STATUS: 'status',
  DATE: 'testedAt',
  COMMENT: 'comment',
};

const knowledgeTestKey = (number: number, field: string): string => `PBI_KNOWLEDGE_TEST_${number}_${field}`;

const knowledgeTestsOf = (stakeholder: Pick<SupportStakeholderFormModel, 'parameters'>): PbiKnowledgeTest[] => {
  const written = new Map<number, PbiKnowledgeTest>();
  for (const parameter of stakeholder.parameters ?? []) {
    const match = KNOWLEDGE_TEST_KEY.exec(parameter.key);
    if (!match) continue;
    const number = Number(match[1]);
    written.set(number, {
      ...(written.get(number) ?? emptyKnowledgeTest()),
      [KNOWLEDGE_TEST_FIELDS[match[2]]]: parameter.values?.[0] ?? '',
    });
  }

  const counted = Number(valueOf(stakeholder, PBI_KNOWLEDGE_TEST_COUNT_PARAMETER) ?? 0);
  const numbers = [...written.keys()];
  const count = Math.max(counted, ...numbers, 0);
  if (count > 0) return Array.from({ length: count }, (_, index) => written.get(index + 1) ?? emptyKnowledgeTest());

  const single: PbiKnowledgeTest = {
    ...emptyKnowledgeTest(),
    status: (valueOf(stakeholder, PBI_KNOWLEDGE_TEST_PARAMETER) as PbiKnowledgeTestStatusName | undefined) ?? '',
    testedAt: valueOf(stakeholder, PBI_KNOWLEDGE_TEST_DATE_PARAMETER) ?? '',
    comment: valueOf(stakeholder, PBI_KNOWLEDGE_TEST_COMMENT_PARAMETER) ?? '',
  };
  return knowledgeTestIsEmpty(single) ? [] : [single];
};

export const isPbi = (stakeholder: Pick<SupportStakeholderFormModel, 'parameters'>): boolean =>
  valueOf(stakeholder, PBI_PARAMETER) === 'true';

export const pbiOf = (stakeholder: Pick<SupportStakeholderFormModel, 'parameters'>): Pbi => ({
  source: valueOf(stakeholder, PBI_SOURCE_PARAMETER) as PbiSourceName | undefined,
  role: valueOf(stakeholder, PBI_ROLE_PARAMETER) ?? '',
  motivation: valueOf(stakeholder, PBI_MOTIVATION_PARAMETER) ?? '',
  assessment: (valueOf(stakeholder, PBI_ASSESSMENT_PARAMETER) as PbiAssessmentName | undefined) ?? '',
  comment: valueOf(stakeholder, PBI_ASSESSMENT_COMMENT_PARAMETER) ?? '',
  knowledgeTests: knowledgeTestsOf(stakeholder),
  engagements: valuesOf(stakeholder, PBI_ENGAGEMENT_PARAMETER),
});

/** A stakeholder that exists only because of the marking leaves the errand with it. */
export const existsOnlyAsPbi = (stakeholder: Pick<SupportStakeholderFormModel, 'parameters'>): boolean =>
  isPbi(stakeholder) && !!pbiOf(stakeholder).source;

const otherParameters = (stakeholder: Pick<SupportStakeholderFormModel, 'parameters'>): Parameter[] =>
  (stakeholder.parameters ?? []).filter(
    (parameter) => !PBI_PARAMETERS.has(parameter.key) && !KNOWLEDGE_TEST_KEY.test(parameter.key)
  );

const settledParameter = (key: string, value: string | undefined): Parameter[] =>
  value?.trim() ? [{ key, values: [value.trim()] }] : [];

const writtenParameter = (key: string, value: string | undefined): Parameter[] =>
  value?.trim() ? [{ key, values: [value] }] : [];

const knowledgeTestParameters = (tests: PbiKnowledgeTest[] | undefined): Parameter[] => {
  const written = tests ?? [];
  if (written.length === 0) return [];

  return [
    { key: PBI_KNOWLEDGE_TEST_COUNT_PARAMETER, values: [String(written.length)] },
    ...written.flatMap((test, index) => [
      ...writtenParameter(knowledgeTestKey(index + 1, 'TYPE'), test.type),
      ...settledParameter(knowledgeTestKey(index + 1, 'STATUS'), test.status),
      ...settledParameter(knowledgeTestKey(index + 1, 'DATE'), test.testedAt),
      ...writtenParameter(knowledgeTestKey(index + 1, 'COMMENT'), test.comment),
    ]),
  ];
};

const pbiParameters = (pbi: Partial<Pbi>): Parameter[] => [
  { key: PBI_PARAMETER, values: ['true'] },
  ...(pbi.source ? [{ key: PBI_SOURCE_PARAMETER, values: [pbi.source] }] : []),
  ...settledParameter(PBI_ROLE_PARAMETER, pbi.role),
  ...writtenParameter(PBI_MOTIVATION_PARAMETER, pbi.motivation),
  ...(pbi.assessment ? [{ key: PBI_ASSESSMENT_PARAMETER, values: [pbi.assessment] }] : []),
  ...writtenParameter(PBI_ASSESSMENT_COMMENT_PARAMETER, pbi.comment),
  ...knowledgeTestParameters(pbi.knowledgeTests),
  ...(pbi.engagements?.length ? [{ key: PBI_ENGAGEMENT_PARAMETER, values: [...pbi.engagements] }] : []),
];

/** The same stakeholder, now marked. Any verdict already on them is kept; the source and role are what was given. */
export const withPbi = <T extends Pick<SupportStakeholderFormModel, 'parameters'>>(
  stakeholder: T,
  marking: { source?: PbiSourceName; role?: string }
): T => ({
  ...stakeholder,
  parameters: [...otherParameters(stakeholder), ...pbiParameters({ ...pbiOf(stakeholder), ...marking })],
});

/** The same stakeholder with every PBI parameter gone, the rest untouched. */
export const withoutPbi = <T extends Pick<SupportStakeholderFormModel, 'parameters'>>(stakeholder: T): T => ({
  ...stakeholder,
  parameters: otherParameters(stakeholder),
});

/** The same stakeholder with the motivation written beside the marking. Every verdict is left as it was. */
export const withMotivation = <T extends Pick<SupportStakeholderFormModel, 'parameters'>>(
  stakeholder: T,
  motivation: string
): T => ({
  ...stakeholder,
  parameters: [...otherParameters(stakeholder), ...pbiParameters({ ...pbiOf(stakeholder), motivation })],
});

/** The same stakeholder with the companies chosen for the underlay written beside the marking. */
export const withEngagements = <T extends Pick<SupportStakeholderFormModel, 'parameters'>>(
  stakeholder: T,
  organizationNumbers: string[]
): T => ({
  ...stakeholder,
  parameters: [
    ...otherParameters(stakeholder),
    ...pbiParameters({ ...pbiOf(stakeholder), engagements: organizationNumbers }),
  ],
});

/** The same stakeholder with a verdict written beside the marking. Source and role are left as they were. */
export const withAssessment = <T extends Pick<SupportStakeholderFormModel, 'parameters'>>(
  stakeholder: T,
  verdict: { assessment: PbiAssessmentName | ''; comment: string }
): T => ({
  ...stakeholder,
  parameters: [...otherParameters(stakeholder), ...pbiParameters({ ...pbiOf(stakeholder), ...verdict })],
});

/** The same stakeholder with the knowledge tests written beside the marking. The verdict is examined apart and left alone. */
export const withKnowledgeTests = <T extends Pick<SupportStakeholderFormModel, 'parameters'>>(
  stakeholder: T,
  knowledgeTests: PbiKnowledgeTest[]
): T => ({
  ...stakeholder,
  parameters: [...otherParameters(stakeholder), ...pbiParameters({ ...pbiOf(stakeholder), knowledgeTests })],
});

/** A comment cannot stand without a verdict: the service stores it beside the verdict. */
export const pbiProblem = (stakeholder: Pick<SupportStakeholderFormModel, 'parameters'>): string | undefined => {
  if (!isPbi(stakeholder)) return undefined;
  const { assessment, comment } = pbiOf(stakeholder);
  return comment.trim() && !assessment ? 'common:personal_suitability.validation.assessment_required' : undefined;
};

export const pbiProblemAmong = (stakeholders: Pick<SupportStakeholderFormModel, 'parameters'>[] | undefined) =>
  (stakeholders ?? []).map(pbiProblem).find(Boolean);

/**
 * Just the digits. Citizen and LegalEntity disagree on dashes, and the personal number Citizen puts on a
 * stakeholder arrives as a number rather than a string, so nothing here assumes it is one.
 */
export const normalizeIdentity = (code: unknown): string => String(code ?? '').replace(/\D/g, '');

/** The last ten digits settle it, so a ten-digit code from one source still matches a twelve-digit one from the other. */
export const sameIdentity = (a: unknown, b: unknown): boolean => {
  const left = normalizeIdentity(a);
  const right = normalizeIdentity(b);
  return left.length >= 10 && right.length >= 10 && left.slice(-10) === right.slice(-10);
};

export const hyphenatedIdentity = (code: unknown): string => {
  const digits = normalizeIdentity(code);
  return digits.length === 12 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : String(code ?? '');
};

const PERSON_IDENTITY_TYPES = new Set(['PERSONNUMMER', 'SAMORDNINGSNUMMER']);

export const engagementIsPerson = (engagement: LegalEntityEngagement): boolean =>
  PERSON_IDENTITY_TYPES.has(engagement.identity?.type ?? '') && !!engagement.identity?.code;

export const stakeholderForEngagement = <T extends Pick<SupportStakeholderFormModel, 'personNumber'>>(
  engagement: LegalEntityEngagement,
  stakeholders: T[]
): T | undefined =>
  stakeholders.find((stakeholder) => sameIdentity(stakeholder.personNumber, engagement.identity?.code));

export const engagementIsMarked = (
  engagement: LegalEntityEngagement,
  stakeholders: Pick<SupportStakeholderFormModel, 'personNumber' | 'parameters'>[]
): boolean => {
  const stakeholder = stakeholderForEngagement(engagement, stakeholders);
  return !!stakeholder && isPbi(stakeholder);
};

/**
 * An auditor has no influence over the business they audit, so a company the person only audits is kept out of
 * the engagements. The role code is not settled with the service owner, so the description decides for now.
 */
const AUDITOR_ROLE = /revisor|revision/i;

export const rolesAreOnlyAuditor = (roles: (string | null | undefined)[]): boolean => {
  const named = roles.filter((role): role is string => !!role?.trim());
  return named.length > 0 && named.every((role) => AUDITOR_ROLE.test(role));
};

export const pbiEngagements = (engagements: LegalEntityPersonEngagement[]): LegalEntityPersonEngagement[] =>
  engagements.filter(
    (engagement) =>
      !!engagement.organizationNumber && !rolesAreOnlyAuditor((engagement.roles ?? []).map((role) => role.description))
  );

/** An engagement as the table shows it: who it is, whether they are marked, and the stakeholder that carries the mark. */
export interface SupportPbiCandidate {
  engagement: LegalEntityEngagement;
  marked: boolean;
  stakeholder?: SupportStakeholderFormModel;
}

export const pbiCandidates = (
  engagements: LegalEntityEngagement[],
  stakeholders: SupportStakeholderFormModel[]
): SupportPbiCandidate[] =>
  engagements.map((engagement) => {
    const stakeholder = stakeholderForEngagement(engagement, stakeholders);
    return { engagement, marked: !!stakeholder && isPbi(stakeholder), stakeholder };
  });

/** The people marked on the errand, applicant first, then the contacts in the order they were added. */
export const pbiPeople = (
  customer: SupportStakeholderFormModel[] | undefined,
  contacts: SupportStakeholderFormModel[] | undefined
): SupportStakeholderFormModel[] => [...(customer ?? []), ...(contacts ?? [])].filter(isPbi);

export const stakeholderName = (stakeholder: Pick<SupportStakeholderFormModel, 'firstName' | 'lastName'>): string =>
  [stakeholder.firstName, stakeholder.lastName].filter(Boolean).join(' ');

/** The role line on a card: what the company data says if it names the person, otherwise what the handler typed. */
export const pbiRoles = (
  stakeholder: Pick<SupportStakeholderFormModel, 'personNumber' | 'parameters'>,
  engagements: LegalEntityEngagement[]
): string => {
  const engagement = engagements.find((candidate) => sameIdentity(candidate.identity?.code, stakeholder.personNumber));
  return engagement ? engagementRoles(engagement) : pbiOf(stakeholder).role;
};

export interface PbiPersonToAdd {
  partyId: string;
  firstName: string;
  lastName: string;
  personNumber: string;
  role?: string;
}

/** A new contact on the errand, there only because a handler named them a person of significant influence. */
export const newPbiContact = (person: PbiPersonToAdd, source: PbiSourceName): SupportStakeholderFormModel =>
  withPbi(
    {
      ...emptyContact,
      internalId: uuidv4(),
      stakeholderType: SupportStakeholderTypeEnum.PERSON,
      role: 'CONTACT',
      externalId: person.partyId,
      externalIdType: ExternalIdType.PRIVATE,
      firstName: person.firstName,
      lastName: person.lastName,
      personNumber: person.personNumber,
      emails: [],
      phoneNumbers: [],
      contactChannels: [],
      parameters: [],
    } as SupportStakeholderFormModel,
    { source, role: person.role }
  );
