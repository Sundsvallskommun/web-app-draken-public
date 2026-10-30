import { getRjsfSchema } from '@common/components/json/utils/schema-utils';
import type { Investigation, Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import { formatOrgNr, OrgNumberFormat } from '@common/services/helper-service';
import {
  engagementRoles,
  getCompanyProfileByPartyId,
  getLegalEntityEngagements,
  getLegalEntityPersonEngagements,
  type LegalEntityPersonEngagement,
} from '@common/services/legal-entity-service';
import { sanitized, sanitizedInline } from '@common/services/sanitizer-service';
import { renderTemplatePdfPreview } from '@common/services/template-render-service';
import type { Admin } from '@common/services/user-service';
import type { RJSFSchema } from '@rjsf/utils';
import dayjs from 'dayjs';
import type { LegalEntityEngagement, LegalEntityProfile } from 'src/data-contracts/backend/data-contracts';

import type { SupportAttachment } from './support-attachment-service';
import {
  FLOOR_PLAN_PURPOSES,
  formChoiceLabel,
  formMultiChoiceLabels,
  getDecisionBasisForm,
} from './support-decision-basis-service';
import type { SupportErrand, SupportStakeholderFormModel } from './support-errand-service';
import {
  supportFinancingNotesOf,
  type SupportFinancingSource,
  supportFinancingSourcesOf,
} from './support-financial-suitability-service';
import {
  AUDIENCE,
  dateRangeText,
  type FormValue,
  isRecord,
  premisesValue,
  text,
  timeRangeText,
} from './support-form-value-service';
import { supportApplicationCompleteAt } from './support-investigation-processing-service';
import { sectionKeyOf } from './support-investigation-sections';
import type { SupportMetadata } from './support-metadata-service';
import {
  engagementIsPerson,
  hyphenatedIdentity,
  isPbi,
  knowledgeTestTypeName,
  normalizeIdentity,
  PBI_ASSESSMENTS,
  PBI_KNOWLEDGE_TEST_STATUSES,
  type PbiKnowledgeTest,
  PbiKnowledgeTestStatus,
  pbiOf,
  rolesAreOnlyAuditor,
  sameIdentity,
  stakeholderName,
} from './support-pbi-service';
import { getPremisesAddress } from './support-premises-address-service';
import {
  SUPPORT_PREMISES_RIGHT_OF_DISPOSALS,
  supportPremisesCapacityOf,
  supportPremisesExamination,
  supportPremisesFireSafety,
} from './support-premises-examination-service';
import { getSupportStatements } from './support-statement-service';

/**
 * The underlay the handler shares with the board: the investigation template in Templating rendered
 * from what the errand, the application and the investigation hold. The keys below are the template's
 * own, nested as its example call nests them, and nothing else reaches it.
 *
 * The identifier is the one the serving template was uploaded under. A template the preview cannot
 * find answers 404, and the preview names the identifier it asked for.
 */
export const INVESTIGATION_BASIS_TEMPLATE_IDENTIFIER = 'serving-permit-decision-basis';

const ISSUER = {
  issuedByUnit: 'Alkohol- och tobaksenheten',
  issuedByAuthority: 'Individ- och arbetsmarknadsförvaltningen, Sundsvalls kommun',
};

const HANDLER_TITLE = 'handläggare';

interface InvestigationBasisKnowledgeTest {
  statusLabel: string;
  testType: string;
  testedAt: string;
  comment: string;
}

interface InvestigationBasisPerson {
  name: string;
  personalNumber: string;
  roles: string;
  motivation: string;
  /** The verdict on the person's suitability, and what the handler noted about it. */
  assessmentLabel: string;
  assessmentComment: string;
  /** The first test, which is what today's template prints. */
  knowledgeTest: InvestigationBasisKnowledgeTest;
  /** Every test the person has, for a template that prints more than one. */
  knowledgeTests: InvestigationBasisKnowledgeTest[];
}

interface InvestigationBasisOfficer {
  name: string;
  personalNumber: string;
  roles: string;
}

interface InvestigationBasisCompanyLink {
  name: string;
  /** The number under the name the template reads it by; both spellings are sent while the template settles. */
  orgNumber: string;
  organizationNumber: string;
}

interface InvestigationBasisStatement {
  counterparty: string;
  sentAt: string;
  respondedAt: string;
  outcomeLabel: string;
  responseText: string;
}

interface InvestigationBasisStaff {
  name: string;
  dateOfBirth: string;
  fromDate: string;
  /** No longer asked, but the template still prints it. */
  personalNumber: string;
}

export interface InvestigationBasisParameters {
  documentDate: string;
  caseNumber: string;
  caseType: string;
  handlerName: string;
  handlerTitle: string;
  issuedByUnit: string;
  issuedByAuthority: string;
  communication: string;
  childPerspectiveHtml: string;
  proposal: { points: string[] };
  applicant: { name: string; orgNumber: string; street: string; postalAddress: string };
  company: {
    form: string;
    shareCapital: string;
    totalShares: string;
    owners: never[];
    ownershipHtml: string;
    signatory: string;
    otherOfficers: InvestigationBasisOfficer[];
    associatedCompanies: InvestigationBasisCompanyLink[];
  };
  application: {
    receivedAt: string;
    completeAt: string;
    servingTo: string;
    beverages: string;
    period: string;
    servingHours: string[];
    orientation: string;
    orientationHtml: string;
    businessDescriptionHtml: string;
    orderAndSobrietyHtml: string;
    rightOfDisposal: string;
    knowledgeBasis: string;
    responsibleStaff: InvestigationBasisStaff[];
    staffingHtml: string;
    servesFood: string;
    menuFiles: string[];
    drinksMenuFiles: string[];
    foodAndBeveragesHtml: string;
    financing: { sources: SupportFinancingSource[]; notesHtml: string };
  };
  premises: {
    name: string;
    street: string;
    postalAddress: string;
    seatsIndoor: string;
    seatsOutdoor: string;
    maxPersons: string;
    inspectedAt: string;
    rightOfDisposalLabel: string;
    rightOfDisposalNote: string;
    leaseHtml: string;
    servingAreaDescription: string;
    floorPlanFiles: string[];
    /** No longer collected, but the template still iterates it. */
    previousPermits: never[];
    fireSafety: string;
    fireSafetyHtml: string;
  };
  personsOfInfluence: InvestigationBasisPerson[];
  statements: InvestigationBasisStatement[];
  investigation: {
    recommendationLabel: string;
    financialAssessmentHtml: string;
    premisesRemarksHtml: string;
    conclusionHtml: string;
    recommendationMotivationHtml: string;
  };
}

export interface InvestigationBasisInput {
  errand: SupportErrand | undefined;
  namespace: string | undefined;
  /** The answers the application was filed with, and the schema version they were filed against. */
  form: FormValue | undefined;
  schema: RJSFSchema | null;
  investigation: Investigation | undefined;
  statements: Statement[];
  attachments: SupportAttachment[];
  companyProfile: LegalEntityProfile | undefined;
  /** The people the company data names, which is where a person of influence gets their personal number. */
  companyEngagements: LegalEntityEngagement[];
  /** Every company read for the people of influence; it names the companies they chose. */
  personEngagements: LegalEntityPersonEngagement[];
  metadata: SupportMetadata | undefined;
  handlerName: string;
  today: string;
  translate: (key: string) => string;
}

const asDate = (value: string | undefined): string =>
  value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : '';

const htmlOf = (value: string | undefined): string => (value?.trim() ? sanitized(value) : '');

/**
 * `communication` is the one text the template prints without markup, so its tags are taken off here
 * rather than printed as they stand. A block tag ends a line, since the text is written in an editor.
 */
const plainTextOf = (value: string | undefined): string =>
  sanitizedInline((value ?? '').replace(/<\/(p|div|li|h[1-6]|blockquote)>|<br\s*\/?>/gi, '\n'))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

const linesOf = (value: string | undefined): string[] =>
  plainTextOf(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const sectionTexts = (investigation: Investigation | undefined): Record<string, string> =>
  Object.fromEntries(
    (investigation?.sections ?? []).map((section) => [sectionKeyOf(section), htmlOf(section.text ?? '')])
  );

const labelOfClassification = (errand: SupportErrand | undefined, classification: string) =>
  (errand?.labels ?? []).find((label) => label.classification === classification);

const caseTypeOf = (errand: SupportErrand | undefined): string =>
  (labelOfClassification(errand, 'SUBTYPE') ?? labelOfClassification(errand, 'TYPE'))?.displayName?.toLocaleLowerCase(
    'sv-SE'
  ) ?? '';

const outcomeLabelOf = (outcome: string | null | undefined, metadata: SupportMetadata | undefined): string => {
  if (!outcome) return '';
  const named = (metadata?.decisionOutcomes ?? []).find((candidate) => candidate.name === outcome);
  return named?.displayName ?? outcome;
};

const statementOutcomeLabelOf = (outcome: string | null | undefined, metadata: SupportMetadata | undefined): string => {
  if (!outcome) return '';
  const named = (metadata?.statementOutcomes ?? []).find((candidate) => candidate.name === outcome);
  return named?.displayName ?? outcome;
};

const fileNames = (attachments: SupportAttachment[], purposes: string[]): string[] =>
  attachments
    .filter((attachment) => purposes.includes(attachment.purpose?.name ?? ''))
    .map((attachment) => attachment.fileName ?? '')
    .filter(Boolean);

const applicantOf = (errand: SupportErrand | undefined): SupportStakeholderFormModel | undefined =>
  errand?.customer?.[0];

const postalAddressOf = (postalCode: string | undefined, city: string | undefined): string =>
  [postalCode, city].filter(Boolean).join(' ');

const applicantParameters = (errand: SupportErrand | undefined): InvestigationBasisParameters['applicant'] => {
  const applicant = applicantOf(errand);
  return {
    name: applicant?.organizationName || stakeholderName(applicant ?? {}),
    orgNumber: applicant?.organizationNumber ?? '',
    street: applicant?.address ?? '',
    postalAddress: postalAddressOf(applicant?.zipCode, applicant?.city),
  };
};

const stakeholdersOf = (errand: SupportErrand | undefined): SupportStakeholderFormModel[] => [
  ...(errand?.customer ?? []),
  ...(errand?.contacts ?? []),
];

const knowledgeTestStatusLabel = (status: string, translate: (key: string) => string): string => {
  const named = PBI_KNOWLEDGE_TEST_STATUSES.find((candidate) => candidate.status === status);
  return named ? translate(named.translationKey) : status;
};

const EMPTY_KNOWLEDGE_TEST: InvestigationBasisKnowledgeTest = {
  statusLabel: '',
  testType: '',
  testedAt: '',
  comment: '',
};

const knowledgeTestOf = (
  test: PbiKnowledgeTest,
  translate: (key: string) => string
): InvestigationBasisKnowledgeTest => ({
  statusLabel: knowledgeTestStatusLabel(test.status, translate),
  testType: test.type ? knowledgeTestTypeName(test.type, translate) : '',
  testedAt: test.testedAt,
  comment: test.comment,
});

const personOfInfluence = (
  name: string,
  personalNumber: string,
  roles: string,
  stakeholder: SupportStakeholderFormModel,
  translate: (key: string) => string
): InvestigationBasisPerson => {
  const pbi = pbiOf(stakeholder);
  const tests = pbi.knowledgeTests.map((test) => knowledgeTestOf(test, translate));
  return {
    name,
    personalNumber,
    roles,
    motivation: plainTextOf(pbi.motivation),
    assessmentLabel: assessmentLabelOf(pbi.assessment, translate),
    assessmentComment: plainTextOf(pbi.comment),
    knowledgeTest: tests[0] ?? EMPTY_KNOWLEDGE_TEST,
    knowledgeTests: tests,
  };
};

const assessmentLabelOf = (assessment: string, translate: (key: string) => string): string => {
  const named = PBI_ASSESSMENTS.find((candidate) => candidate.assessment === assessment);
  return named ? translate(named.translationKey) : '';
};

/**
 * The phrase the template prints after "Enligt ansökan:". The application does not ask the question,
 * so the tests the handler registered settle it; without an approved one nothing is claimed, and the
 * template leaves the line out. Each test of each person is printed from `knowledgeTests` itself.
 */
const knowledgeBasisOf = (errand: SupportErrand | undefined): string =>
  stakeholdersOf(errand)
    .filter(isPbi)
    .some((stakeholder) =>
      pbiOf(stakeholder).knowledgeTests.some((test) => test.status === PbiKnowledgeTestStatus.APPROVED)
    )
    ? 'har godkänt kunskapsprov'
    : '';

const sameName = (a: string, b: string): boolean =>
  !!a.trim() && a.trim().toLocaleLowerCase('sv-SE') === b.trim().toLocaleLowerCase('sv-SE');

/**
 * The stakeholder the company data names. The errand does not keep a personal number, so a person
 * marked in an earlier session is found by name; the identity settles it where the errand has one.
 */
const stakeholderNamed = (
  engagement: LegalEntityEngagement,
  stakeholders: SupportStakeholderFormModel[]
): SupportStakeholderFormModel | undefined =>
  stakeholders.find((stakeholder) => sameIdentity(engagement.identity?.code, stakeholder.personNumber)) ??
  stakeholders.find((stakeholder) => sameName(engagement.name ?? '', stakeholderName(stakeholder)));

interface CompanyPerson {
  engagement: LegalEntityEngagement;
  stakeholder?: SupportStakeholderFormModel;
}

const companyPeople = (
  errand: SupportErrand | undefined,
  companyEngagements: LegalEntityEngagement[]
): CompanyPerson[] => {
  const stakeholders = stakeholdersOf(errand);
  return companyEngagements
    .filter((engagement) => engagementIsPerson(engagement) && !!engagement.name)
    .map((engagement) => ({ engagement, stakeholder: stakeholderNamed(engagement, stakeholders) }));
};

/**
 * The marked people, the ones the company data names first, since that is where their personal
 * number comes from. A person marked by hand carries no number, the errand not keeping one.
 */
const personsOfInfluence = (
  errand: SupportErrand | undefined,
  companyEngagements: LegalEntityEngagement[],
  translate: (key: string) => string
): InvestigationBasisPerson[] => {
  const marked = companyPeople(errand, companyEngagements).filter(
    ({ stakeholder }) => !!stakeholder && isPbi(stakeholder)
  );

  const named = marked.map(({ engagement, stakeholder }) =>
    personOfInfluence(
      engagement.name ?? '',
      hyphenatedIdentity(engagement.identity?.code),
      engagementRoles(engagement) || pbiOf(stakeholder!).role,
      stakeholder!,
      translate
    )
  );

  const alreadyNamed = marked.map(({ stakeholder }) => stakeholder?.internalId);
  const byHand = stakeholdersOf(errand)
    .filter((stakeholder) => isPbi(stakeholder) && !alreadyNamed.includes(stakeholder.internalId))
    .map((stakeholder) =>
      personOfInfluence(
        stakeholderName(stakeholder),
        hyphenatedIdentity(stakeholder.personNumber),
        pbiOf(stakeholder).role,
        stakeholder,
        translate
      )
    );

  return [...named, ...byHand];
};

/** The people the company data names who are not marked. An auditor is left out, as in the examination. */
const otherOfficers = (
  errand: SupportErrand | undefined,
  companyEngagements: LegalEntityEngagement[]
): InvestigationBasisOfficer[] =>
  companyPeople(errand, companyEngagements)
    .filter(
      ({ engagement, stakeholder }) =>
        !(stakeholder && isPbi(stakeholder)) &&
        !rolesAreOnlyAuditor((engagement.relations ?? []).map((relation) => relation.description))
    )
    .map(({ engagement }) => ({
      name: engagement.name ?? '',
      personalNumber: hyphenatedIdentity(engagement.identity?.code),
      roles: engagementRoles(engagement),
    }));

/**
 * The companies the handler ticked for the people of influence, each named once. The applicant's own
 * company is not one of them: the underlay names the companies the representatives are engaged in
 * besides the one applying.
 */
const associatedCompanies = (
  errand: SupportErrand | undefined,
  personEngagements: LegalEntityPersonEngagement[]
): InvestigationBasisCompanyLink[] => {
  const applying = normalizeIdentity(applicantOf(errand)?.organizationNumber);
  const chosen = stakeholdersOf(errand)
    .filter(isPbi)
    .flatMap((stakeholder) => pbiOf(stakeholder).engagements)
    .filter((organizationNumber) => normalizeIdentity(organizationNumber) !== applying);

  return Array.from(new Set(chosen)).map((organizationNumber) => {
    const written = formatOrgNr(organizationNumber, OrgNumberFormat.DASH) || organizationNumber;
    return {
      name: personEngagements.find((engagement) => engagement.organizationNumber === organizationNumber)?.name ?? '',
      orgNumber: written,
      organizationNumber: written,
    };
  });
};

// One line per serving time the form asks for, labelled where it asks for more than one.
const SERVING_HOURS: [label: string, field: string][] = [
  ['Inomhus, allmänheten', 'publicServingHoursIndoor'],
  ['Utomhus, allmänheten', 'publicServingHoursOutdoor'],
  ['Inomhus, slutet sällskap', 'closedCompanyServingHoursIndoor'],
  ['Utomhus, slutet sällskap', 'closedCompanyServingHoursOutdoor'],
  ['', 'dailyServingHours'],
  ['', 'salesHours'],
];

const servingHours = (form: FormValue | undefined): string[] =>
  form
    ? SERVING_HOURS.map(([label, field]) => {
        const hours = timeRangeText(form, field);
        return hours ? [label, hours].filter(Boolean).join(' ') : '';
      }).filter(Boolean)
    : [];

// The period is asked per audience for a permanent permit, and once for a temporary one or farm sales.
const SERVING_PERIODS: [choice: string, dates: string][] = [
  ['publicServingPeriod', 'publicServingPeriodDates'],
  ['closedCompanyServingPeriod', 'closedCompanyServingPeriodDates'],
  ['salesPeriod', 'salesPeriodDates'],
];

const servingPeriod = (form: FormValue | undefined, schema: RJSFSchema | null): string => {
  if (!form) return '';
  const periods = SERVING_PERIODS.map(([choice, dates]) =>
    [formChoiceLabel(form, schema, choice), dateRangeText(form, dates)].filter(Boolean).join(', ')
  );
  return [...periods, dateRangeText(form, 'permitPeriodDates')].filter(Boolean).join('. ');
};

const servingTo = (form: FormValue | undefined, schema: RJSFSchema | null): string =>
  (form && formChoiceLabel(form, schema, AUDIENCE)) ?? '';

const responsibleStaff = (form: FormValue | undefined): InvestigationBasisStaff[] => {
  const rows = form?.responsibleServingStaff;
  if (!Array.isArray(rows)) return [];

  return rows.filter(isRecord).map((row) => ({
    name: [text(row.firstName), text(row.lastName)].filter(Boolean).join(' '),
    dateOfBirth: text(row.dateOfBirth) ?? '',
    fromDate: text(row.fromDate) ?? '',
    personalNumber: '',
  }));
};

const rightOfDisposalLabel = (rightOfDisposal: string, translate: (key: string) => string): string => {
  const named = SUPPORT_PREMISES_RIGHT_OF_DISPOSALS.find((candidate) => candidate.value === rightOfDisposal);
  return named ? translate(named.translationKey) : '';
};

const fireSafetyLine = (statements: Statement[], metadata: SupportMetadata | undefined): string => {
  const answered = supportPremisesFireSafety(statements, metadata);
  return answered ? [answered.counterparty, answered.outcome].filter(Boolean).join(': ') : '';
};

/**
 * The underlay reports the referral round: who was asked, what they answered and when. The template
 * prints "svar saknas, skickad ..." for one still out, so a referral is a row once it has gone out.
 */
const isAsked = (statement: Statement): boolean =>
  !!statement.sentAt || !!statement.outcome || !!statement.respondedAt || !!statement.responseText?.trim();

const basisStatements = (
  statements: Statement[],
  metadata: SupportMetadata | undefined
): InvestigationBasisStatement[] =>
  statements.filter(isAsked).map((statement) => ({
    counterparty: statement.counterpartyName ?? '',
    sentAt: asDate(statement.sentAt),
    respondedAt: asDate(statement.respondedAt),
    outcomeLabel: statementOutcomeLabelOf(statement.outcome, metadata),
    responseText: plainTextOf(statement.responseText),
  }));

/**
 * The points of the proposal are the motivation of the recommendation, one per line, so the handler
 * writes them as a list. Without a motivation the proposed decision stands as the only point.
 */
const proposalPoints = (investigation: Investigation | undefined, metadata: SupportMetadata | undefined): string[] => {
  const points = linesOf(investigation?.recommendationMotivation);
  if (points.length > 0) return points;
  const recommendation = outcomeLabelOf(investigation?.recommendation, metadata);
  return recommendation ? [recommendation] : [];
};

const premisesName = (form: FormValue | undefined, errand: SupportErrand | undefined): string =>
  text(premisesValue(form, 'Name')) ?? applicantOf(errand)?.organizationName ?? '';

/** What the underlay says where the handler has written no examination at all. */
const MISSING_INFORMATION = 'Information saknas';

/**
 * The examinations the handler writes. The template prints each of them on its own and leaves the
 * heading out when it is empty, so an examination nobody wrote would pass unnoticed.
 *
 * Nothing else is filled in: everywhere else the template weaves the value into a sentence and has
 * its own word for a gap ("uppgift saknas", "Räddningstjänsten har ännu inte yttrat sig."), and a
 * note put in its place would read as "Lokalinspektion genomfördes Information saknas."
 */
const WRITTEN_EXAMINATIONS = [
  'communication',
  'childPerspectiveHtml',
  'company.ownershipHtml',
  'application.staffingHtml',
  'application.foodAndBeveragesHtml',
  'premises.leaseHtml',
  'premises.fireSafetyHtml',
  'investigation.premisesRemarksHtml',
  'investigation.financialAssessmentHtml',
];

const noteMissing = (value: unknown, path: string): unknown => {
  if (typeof value === 'string') {
    return value === '' && WRITTEN_EXAMINATIONS.includes(path) ? MISSING_INFORMATION : value;
  }
  if (Array.isArray(value) || !isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [key, noteMissing(inner, path ? `${path}.${key}` : key)])
  );
};

const noteWhatIsMissing = (parameters: InvestigationBasisParameters): InvestigationBasisParameters =>
  noteMissing(parameters, '') as InvestigationBasisParameters;

/**
 * Everything the underlay prints. Nothing is demanded of the handler: the document is an underlay,
 * not the decision, so a field no one has filled in is sent with a note that it is missing.
 */
export const investigationBasisParameters = (input: InvestigationBasisInput): InvestigationBasisParameters => {
  const { errand, form, schema, investigation, metadata, translate } = input;
  const texts = sectionTexts(investigation);
  const address = getPremisesAddress(errand, input.namespace);
  const capacity = supportPremisesCapacityOf(form);
  const examination = supportPremisesExamination(errand?.parameters);
  const people = personsOfInfluence(errand, input.companyEngagements, translate);

  return noteWhatIsMissing({
    documentDate: input.today,
    caseNumber: errand?.errandNumber ?? '',
    caseType: caseTypeOf(errand),
    handlerName: input.handlerName,
    handlerTitle: HANDLER_TITLE,
    ...ISSUER,
    communication: plainTextOf(texts.communication),
    childPerspectiveHtml: texts.child_perspective ?? '',
    proposal: { points: proposalPoints(investigation, metadata) },
    applicant: applicantParameters(errand),
    company: {
      form: input.companyProfile?.form ?? '',
      shareCapital: '',
      totalShares: '',
      owners: [],
      ownershipHtml: texts.ownership ?? '',
      signatory: '',
      otherOfficers: otherOfficers(errand, input.companyEngagements),
      associatedCompanies: associatedCompanies(errand, input.personEngagements),
    },
    application: {
      receivedAt: asDate(errand?.created),
      completeAt: supportApplicationCompleteAt(errand?.parameters),
      servingTo: servingTo(form, schema),
      beverages: form ? formMultiChoiceLabels(form, schema, 'beverages').join(', ') : '',
      period: servingPeriod(form, schema),
      servingHours: servingHours(form),
      orientation: form ? formMultiChoiceLabels(form, schema, 'businessOrientationTypes').join(', ') : '',
      orientationHtml: htmlOf(text(form?.businessOrientationDescription)),
      businessDescriptionHtml: htmlOf(text(form?.businessDescription)),
      orderAndSobrietyHtml: htmlOf(text(form?.orderAndSobriety)),
      rightOfDisposal: form ? formMultiChoiceLabels(form, schema, 'premisesRightOfUseDocuments').join(', ') : '',
      knowledgeBasis: knowledgeBasisOf(errand),
      responsibleStaff: responsibleStaff(form),
      staffingHtml: texts.staffing ?? '',
      servesFood: (form && formChoiceLabel(form, schema, 'servesFood')) ?? '',
      menuFiles: fileNames(input.attachments, ['MENU']),
      drinksMenuFiles: fileNames(input.attachments, ['DRINKS_MENU']),
      foodAndBeveragesHtml: texts.food_and_beverages ?? '',
      financing: {
        sources: supportFinancingSourcesOf(form),
        notesHtml: htmlOf(supportFinancingNotesOf(form)),
      },
    },
    premises: {
      name: premisesName(form, errand),
      street: address?.street ?? '',
      postalAddress: postalAddressOf(address?.postalCode, address?.city),
      seatsIndoor: capacity.indoorSeats ?? '',
      seatsOutdoor: capacity.outdoorSeats ?? '',
      maxPersons: capacity.maxPersons ?? '',
      inspectedAt: examination.inspectedAt,
      rightOfDisposalLabel: rightOfDisposalLabel(examination.rightOfDisposal, translate),
      rightOfDisposalNote: examination.rightOfDisposalNote,
      leaseHtml: texts.lease ?? '',
      servingAreaDescription: examination.servingArea,
      floorPlanFiles: fileNames(input.attachments, FLOOR_PLAN_PURPOSES),
      previousPermits: [],
      fireSafety: fireSafetyLine(input.statements, metadata),
      fireSafetyHtml: texts.fire_safety ?? '',
    },
    personsOfInfluence: people,
    statements: basisStatements(input.statements, metadata),
    investigation: {
      recommendationLabel: outcomeLabelOf(investigation?.recommendation, metadata),
      financialAssessmentHtml: texts.financial_suitability ?? '',
      premisesRemarksHtml: texts.premises ?? '',
      conclusionHtml: htmlOf(investigation?.conclusion),
      recommendationMotivationHtml: htmlOf(investigation?.recommendationMotivation),
    },
  });
};

const asTemplateParameters = (parameters: InvestigationBasisParameters): { [key: string]: string | Object } =>
  parameters as unknown as { [key: string]: string | Object };

/** Watermarked, since the underlay the handler looks at is not the document the decision is taken on. */
export const renderInvestigationBasisPreview = (parameters: InvestigationBasisParameters): Promise<string> =>
  renderTemplatePdfPreview(INVESTIGATION_BASIS_TEMPLATE_IDENTIFIER, asTemplateParameters(parameters));

export const investigationBasisHandlerName = (admin: Admin | undefined): string =>
  [admin?.firstName, admin?.lastName].filter(Boolean).join(' ') || admin?.displayName || '';

export interface InvestigationBasisFacts {
  errand: SupportErrand | undefined;
  municipalityId: string;
  metadata: SupportMetadata | undefined;
  attachments: SupportAttachment[];
  investigation: Investigation | undefined;
  handlerName: string;
  today: string;
  translate: (key: string) => string;
}

export const collectInvestigationBasisParameters = async (
  facts: InvestigationBasisFacts
): Promise<InvestigationBasisParameters> => {
  const { errand, municipalityId, metadata } = facts;
  const namespace = metadata?.namespace;
  const form = getDecisionBasisForm(errand, namespace);
  const partyIdsOfInfluence = stakeholdersOf(errand)
    .filter(isPbi)
    .map((stakeholder) => stakeholder.externalId)
    .filter((partyId): partyId is string => !!partyId);
  const companyPartyId = errand?.customer?.[0]?.externalId;

  const [statements, companyProfile, companyEngagements, personEngagements, schema] = await Promise.all([
    getSupportStatements(errand?.id ?? '', municipalityId).catch(() => []),
    companyPartyId ? getCompanyProfileByPartyId(companyPartyId).catch(() => undefined) : undefined,
    companyPartyId ? getLegalEntityEngagements(companyPartyId).catch(() => []) : [],
    Promise.all(partyIdsOfInfluence.map((partyId) => getLegalEntityPersonEngagements(partyId).catch(() => []))).then(
      (read) => read.flat()
    ),
    form?.schemaId ? getRjsfSchema(municipalityId, form.schemaId).catch(() => null) : null,
  ]);

  return investigationBasisParameters({
    errand,
    namespace,
    form: form?.value,
    schema,
    investigation: facts.investigation,
    statements,
    attachments: facts.attachments,
    companyProfile,
    companyEngagements,
    personEngagements,
    metadata,
    handlerName: facts.handlerName,
    today: facts.today,
    translate: facts.translate,
  });
};
