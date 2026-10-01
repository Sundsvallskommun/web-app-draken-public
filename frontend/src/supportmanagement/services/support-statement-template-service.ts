import type { SupportErrand } from './support-errand-service';
import { supportStatementCounterpartyKey } from './support-statement-counterparties';

const TEMPLATE_BY_COUNTERPARTY: Record<string, string> = {
  POLICE: 'referral-police',
  ENFORCEMENT_AUTHORITY: 'referral-enforcement-authority',
  RESCUE_SERVICE: 'referral-rescue-service',
};

const GENERAL_TEMPLATE = 'referral-general';

const TEMPLATE_NAMES: Record<string, string> = {
  'referral-police': 'Remiss Polismyndigheten',
  'referral-enforcement-authority': 'Remiss Kronofogden',
  'referral-rescue-service': 'Remiss räddningstjänsten',
  [GENERAL_TEMPLATE]: 'Remiss, allmän',
};

export interface SupportStatementTemplate {
  identifier: string;
  name: string;
}

export const supportStatementTemplates = (counterpartyName: string | undefined): SupportStatementTemplate[] => {
  const key = supportStatementCounterpartyKey(counterpartyName);
  const ofAuthority = key ? TEMPLATE_BY_COUNTERPARTY[key] : undefined;

  return [...(ofAuthority ? [ofAuthority] : []), GENERAL_TEMPLATE].map((identifier) => ({
    identifier,
    name: TEMPLATE_NAMES[identifier] ?? identifier,
  }));
};

interface SupportStatementPremises {
  name: string;
  street: string;
  postalAddress: string;
}

const supportStatementPremises = (errand: SupportErrand | undefined): SupportStatementPremises => {
  const document = (errand?.jsonParameters ?? []).map((parameter) => parameter.value).find(Boolean) as
    | Record<string, unknown>
    | undefined;
  const owner = errand?.stakeholders?.find((stakeholder) => stakeholder.role === 'PRIMARY');

  const atTheCompany = document?.besoksadressSammaSomForetaget === 'JA';
  const address = (document?.besoksadress ?? document?.serveringsstalletsBesoksadress) as
    | Record<string, string>
    | undefined;

  const street = atTheCompany ? owner?.address ?? '' : address?.gatuadress ?? '';
  const postalCode = atTheCompany ? owner?.zipCode ?? '' : address?.postnummer ?? '';
  const city = atTheCompany ? owner?.city ?? '' : address?.postort ?? '';

  return {
    name: (document?.serveringsstalletsNamn as string) ?? owner?.organizationName ?? '',
    street,
    postalAddress: [postalCode, city].filter(Boolean).join(' '),
  };
};

export interface SupportStatementTemplateFacts {
  errand: SupportErrand | undefined;
  handlerName: string;
  counterpartyName: string;
  dueAt: string;
}

export const supportStatementTemplateParameters = (facts: SupportStatementTemplateFacts): Record<string, unknown> => {
  const premises = supportStatementPremises(facts.errand);
  const owner = facts.errand?.stakeholders?.find((stakeholder) => stakeholder.role === 'PRIMARY');

  return {
    caseNumber: facts.errand?.errandNumber ?? '',
    documentDate: new Date().toISOString().slice(0, 10),
    handlerName: facts.handlerName,
    premisesName: premises.name,
    premisesStreet: premises.street,
    premisesPostalAddress: premises.postalAddress,
    applicantName: owner?.organizationName ?? '',
    applicantOrgNumber: owner?.externalId ?? '',
    replyDeadline: facts.dueAt,
    recipientName: facts.counterpartyName,
    recipientStreet: '',
    recipientPostalAddress: '',
    persons: [],
  };
};

const CONTENT_SECTION = /<div class="content">([\s\S]*)<\/div>/;

export interface SupportStatementDocument {
  frame: string;
  content: string;
}

export const supportStatementDocumentOf = (html: string): SupportStatementDocument => {
  const content = CONTENT_SECTION.exec(html)?.[1];
  return content ? { frame: html, content } : { frame: '', content: html };
};

export const supportStatementDocumentWith = (document: SupportStatementDocument, content: string): string =>
  document.frame ? document.frame.replace(CONTENT_SECTION, `<div class="content">${content}</div>`) : content;
