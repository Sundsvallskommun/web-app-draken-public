import { engagementRoles } from '@common/services/legal-entity-service';

import type { SupportErrand } from './support-errand-service';
import type { SupportPbiCandidate } from './support-pbi-service';
import { supportStatementCounterparty, supportStatementCounterpartyKey } from './support-statement-counterparties';

export const SupportReferralPersons = {
  NONE: 'NONE',
  LISTED: 'LISTED',
  ONE_EACH: 'ONE_EACH',
} as const;

export type SupportReferralPersonsName = (typeof SupportReferralPersons)[keyof typeof SupportReferralPersons];

const PermitKind = {
  SERVING: 'SERVING',
  SUPERVISION: 'SUPERVISION',
  TOBACCO: 'TOBACCO',
} as const;

type PermitKindName = (typeof PermitKind)[keyof typeof PermitKind];

const PERMIT_KIND_OF_PROCESS: Record<string, PermitKindName> = {
  'alcohol-serving': PermitKind.SERVING,
  'alcohol-serving-change': PermitKind.SERVING,
  'alcohol-serving-addition': PermitKind.SERVING,
  'catering-occasion': PermitKind.SERVING,
  supervision: PermitKind.SUPERVISION,
  'tobacco-sales': PermitKind.TOBACCO,
  'tobacco-sales-change': PermitKind.TOBACCO,
  'tobacco-sales-closure': PermitKind.TOBACCO,
  'e-cigarette-sales': PermitKind.TOBACCO,
};

export interface SupportStatementTemplate {
  identifier: string;
  name: string;
  persons: SupportReferralPersonsName;
}

interface SupportReferralTemplate extends SupportStatementTemplate {
  counterpartyKey?: string;
  permitKinds?: PermitKindName[];
}

const GENERAL_TEMPLATE = 'referral-general';

const SUPPORT_REFERRAL_TEMPLATES: SupportReferralTemplate[] = [
  {
    identifier: 'referral-police',
    name: 'Remiss Polismyndigheten',
    counterpartyKey: 'POLICE',
    persons: SupportReferralPersons.LISTED,
  },
  {
    identifier: 'criminal-record-request',
    name: 'Beställning belastningsregistret',
    counterpartyKey: 'POLICE',
    persons: SupportReferralPersons.ONE_EACH,
  },
  {
    identifier: 'referral-enforcement-authority',
    name: 'Remiss Kronofogden',
    counterpartyKey: 'ENFORCEMENT_AUTHORITY',
    persons: SupportReferralPersons.NONE,
  },
  {
    identifier: 'referral-rescue-service',
    name: 'Remiss räddningstjänsten',
    counterpartyKey: 'RESCUE_SERVICE',
    persons: SupportReferralPersons.NONE,
  },
  {
    identifier: 'tax-agency-request-serving',
    name: 'Begäran Skatteverket, serveringstillstånd',
    counterpartyKey: 'TAX_AGENCY',
    permitKinds: [PermitKind.SERVING],
    persons: SupportReferralPersons.LISTED,
  },
  {
    identifier: 'tax-agency-request-serving-inspection',
    name: 'Begäran Skatteverket, inre tillsyn',
    counterpartyKey: 'TAX_AGENCY',
    permitKinds: [PermitKind.SUPERVISION],
    persons: SupportReferralPersons.LISTED,
  },
  {
    identifier: 'tax-agency-request-tobacco-company',
    name: 'Begäran Skatteverket, tobakstillstånd bolag',
    counterpartyKey: 'TAX_AGENCY',
    permitKinds: [PermitKind.TOBACCO],
    persons: SupportReferralPersons.NONE,
  },
  {
    identifier: 'tax-agency-request-tobacco-pbi',
    name: 'Begäran Skatteverket, tobakstillstånd PBI',
    counterpartyKey: 'TAX_AGENCY',
    permitKinds: [PermitKind.TOBACCO],
    persons: SupportReferralPersons.ONE_EACH,
  },
  { identifier: GENERAL_TEMPLATE, name: 'Remiss, allmän', persons: SupportReferralPersons.NONE },
];

const permitKindOfErrand = (errand: SupportErrand | undefined): PermitKindName | undefined => {
  const processKey = errand?.process?.processKey;
  return processKey ? PERMIT_KIND_OF_PROCESS[processKey] : undefined;
};

const servesTheErrand = (template: SupportReferralTemplate, kind: PermitKindName | undefined): boolean =>
  !template.permitKinds || !kind || template.permitKinds.includes(kind);

export const supportStatementTemplates = (
  counterpartyName: string | undefined,
  errand?: SupportErrand
): SupportStatementTemplate[] => {
  const key = supportStatementCounterpartyKey(counterpartyName);
  const kind = permitKindOfErrand(errand);

  return SUPPORT_REFERRAL_TEMPLATES.filter(
    (template) => (template.counterpartyKey === key && servesTheErrand(template, kind)) || !template.counterpartyKey
  ).map(({ identifier, name, persons }) => ({ identifier, name, persons }));
};

export const supportStatementTemplateNamed = (identifier: string): SupportStatementTemplate | undefined =>
  SUPPORT_REFERRAL_TEMPLATES.find((template) => template.identifier === identifier);

export const supportStatementTemplateOfQuestion = (question: string): SupportStatementTemplate | undefined =>
  SUPPORT_REFERRAL_TEMPLATES.find((template) => template.name === question.trim());

export const supportStatementTemplatePersons = (identifier: string): SupportReferralPersonsName =>
  supportStatementTemplateNamed(identifier)?.persons ?? SupportReferralPersons.NONE;

export interface SupportReferralPerson {
  partyId: string;
  name: string;
  firstName: string;
  lastName: string;
  personalNumber: string;
  roles: string;
  marked: boolean;
}

const hyphenated = (identityCode: string): string =>
  /^\d{12}$/.test(identityCode) ? `${identityCode.slice(0, 8)}-${identityCode.slice(8)}` : identityCode;

const splitName = (name: string): { firstName: string; lastName: string } => {
  const parts = name.trim().split(/\s+/);
  return parts.length < 2
    ? { firstName: name.trim(), lastName: '' }
    : { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
};

export const supportReferralPeople = (candidates: SupportPbiCandidate[]): SupportReferralPerson[] =>
  candidates
    .filter((candidate) => candidate.partyId && candidate.name)
    .map((candidate) => ({
      partyId: candidate.partyId as string,
      name: candidate.name as string,
      ...splitName(candidate.name as string),
      personalNumber: hyphenated(candidate.identity?.code ?? ''),
      roles: engagementRoles(candidate),
      marked: !!candidate.marked,
    }));

interface SupportStatementPremises {
  name: string;
  street: string;
  postalAddress: string;
}

const textOf = (value: unknown, key: string): string => {
  if (typeof value === 'string') return value;
  const field = (value as Record<string, unknown> | undefined)?.[key];
  return typeof field === 'string' ? field : '';
};

const organizationNumberOf = (owner: { parameters?: { key?: string; values?: string[] }[] } | undefined): string =>
  owner?.parameters?.find((parameter) => parameter.key === 'organizationNumber')?.values?.[0] ?? '';

const supportStatementPremises = (errand: SupportErrand | undefined): SupportStatementPremises => {
  const document = (errand?.jsonParameters ?? []).map((parameter) => parameter.value).find(Boolean) as
    | Record<string, unknown>
    | undefined;
  const owner = errand?.stakeholders?.find((stakeholder) => stakeholder.role === 'PRIMARY');

  const atTheCompany =
    document?.besoksadressSammaSomForetaget === 'JA' || document?.besoksadressSammaSomArendeagare === 'JA';
  const address = (document?.besoksadress ?? document?.serveringsstalletsBesoksadress) as
    | Record<string, string>
    | undefined;

  const street = atTheCompany ? owner?.address ?? '' : address?.gatuadress ?? '';
  const postalCode = atTheCompany ? owner?.zipCode ?? '' : address?.postnummer ?? '';
  const city = atTheCompany ? owner?.city ?? '' : address?.postort ?? '';

  return {
    name: textOf(document?.serveringsstalletsNamn, 'namn') || owner?.organizationName || '',
    street,
    postalAddress: [postalCode, city].filter(Boolean).join(' '),
  };
};

const labelOfClassification = (errand: SupportErrand | undefined, classification: string) =>
  (errand?.labels ?? []).find((label) => label.classification === classification);

const caseTypeOfErrand = (errand: SupportErrand | undefined): string => {
  const label = labelOfClassification(errand, 'SUBTYPE') ?? labelOfClassification(errand, 'TYPE');
  return label?.displayName?.toLocaleLowerCase('sv-SE') ?? '';
};

const REQUESTER = {
  requesterAuthority: 'Sundsvalls kommun, Individ- och arbetsmarknadsförvaltningen, Alkohol- och tobaksenheten',
  requesterAddress: 'Sundsvalls kommun',
  requesterPostalCode: '851 85',
  requesterCity: 'Sundsvall',
};

export interface SupportStatementTemplateFacts {
  identifier: string;
  errand: SupportErrand | undefined;
  handlerName: string;
  handlerEmail: string;
  counterpartyName: string;
  dueAt: string;
  people?: SupportReferralPerson[];
  person?: SupportReferralPerson;
}

const listedPeople = (people: SupportReferralPerson[] | undefined) =>
  (people ?? []).map((person) => ({
    personalNumber: person.personalNumber,
    name: person.name,
    roles: person.roles,
  }));

const listedRepresentatives = (people: SupportReferralPerson[] | undefined) =>
  (people ?? []).map((person) => ({ personalNumber: person.personalNumber, name: person.name }));

export const supportStatementTemplateParameters = (facts: SupportStatementTemplateFacts): Record<string, unknown> => {
  const premises = supportStatementPremises(facts.errand);
  const owner = facts.errand?.stakeholders?.find((stakeholder) => stakeholder.role === 'PRIMARY');
  const counterparty = supportStatementCounterparty(facts.counterpartyName);
  const applicantName = owner?.organizationName ?? '';
  const applicantOrgNumber = organizationNumberOf(owner);
  const caseNumber = facts.errand?.errandNumber ?? '';
  const documentDate = new Date().toISOString().slice(0, 10);
  const premisesFields = {
    premisesName: premises.name,
    premisesStreet: premises.street,
    premisesPostalAddress: premises.postalAddress,
  };

  if (facts.identifier === 'criminal-record-request') {
    return {
      ...REQUESTER,
      handlerName: facts.handlerName,
      handlerEmail: facts.handlerEmail,
      caseNumber,
      personalNumber: facts.person?.personalNumber ?? '',
      firstName: facts.person?.firstName ?? '',
      lastName: facts.person?.lastName ?? '',
    };
  }

  if (facts.identifier === 'tax-agency-request-tobacco-company') {
    return { handlerName: facts.handlerName, applicantName, applicantOrgNumber };
  }

  if (facts.identifier === 'tax-agency-request-tobacco-pbi') {
    return {
      handlerName: facts.handlerName,
      applicantName,
      applicantOrgNumber,
      pbiName: facts.person?.name ?? '',
      pbiPersonalNumber: facts.person?.personalNumber ?? '',
    };
  }

  if (facts.identifier === 'tax-agency-request-serving-inspection') {
    return {
      handlerName: facts.handlerName,
      handlerEmail: facts.handlerEmail,
      documentDate,
      ...premisesFields,
      permitHolderName: applicantName,
      permitHolderOrgNumber: applicantOrgNumber,
      representatives: listedRepresentatives(facts.people),
    };
  }

  if (facts.identifier === 'tax-agency-request-serving') {
    return {
      handlerName: facts.handlerName,
      handlerEmail: facts.handlerEmail,
      documentDate,
      caseType: caseTypeOfErrand(facts.errand),
      ...premisesFields,
      applicantName,
      applicantOrgNumber,
      representatives: listedRepresentatives(facts.people),
    };
  }

  if (facts.identifier === 'referral-police') {
    return {
      caseNumber,
      documentDate,
      handlerName: facts.handlerName,
      ...premisesFields,
      persons: listedPeople(facts.people),
    };
  }

  return {
    caseNumber,
    documentDate,
    handlerName: facts.handlerName,
    ...premisesFields,
    applicantName,
    applicantOrgNumber,
    replyDeadline: facts.dueAt,
    recipientName: facts.counterpartyName,
    recipientStreet: counterparty?.street ?? '',
    recipientPostalAddress: counterparty?.postalAddress ?? '',
  };
};

export const supportStatementTemplateProblem = (
  identifier: string,
  dueAt: string,
  people: SupportReferralPerson[]
): string | undefined => {
  if (!identifier) return 'common:statements.validation.template';

  const persons = supportStatementTemplatePersons(identifier);
  if (persons !== SupportReferralPersons.NONE && people.length === 0) {
    return 'common:statements.validation.people';
  }
  if (persons !== SupportReferralPersons.NONE && people.some((person) => !person.personalNumber)) {
    return 'common:statements.validation.people_without_identity';
  }
  if (supportStatementTemplateAsksForADeadline(identifier) && !dueAt) {
    return 'common:statements.validation.due_at';
  }
  return undefined;
};

export const supportStatementTemplateAsksForADeadline = (identifier: string): boolean =>
  identifier.startsWith('referral-') && identifier !== 'referral-police';
