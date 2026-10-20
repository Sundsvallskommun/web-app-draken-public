import type { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';

import { FLOOR_PLAN_PURPOSES } from './support-decision-basis-service';
import type { DecisionPremises } from './support-decision-premises-service';
import type { SupportErrand, SupportStakeholderFormModel } from './support-errand-service';
import {
  childText,
  dateRangeText,
  type FormValue,
  hasChosen,
  servesPrivate,
  servesPublic,
  text,
  timeRangeText,
} from './support-form-value-service';

/**
 * What a decision carries to the process that issues the permit: one parameter per key the permit
 * template reads. Each permit's record below lists its keys in order with the expression that fills
 * each one. The process adds the conditions out of the decision's terms and the restaurant number it
 * resolved, and nothing else off the decision's root, so the outcome, the decider, the date and the
 * first day of validity are sent as parameters too.
 */

export interface DecisionParameterInput {
  errand: Pick<SupportErrand, 'errandNumber' | 'customer'>;
  /** The most specific type label of the errand (its resourceName), e.g. TASTING. */
  errandType?: string;
  /** The answers filed under the errand type's schema name; undefined when there are none. */
  form?: FormValue;
  /** The premises the decision concerns, once chosen. */
  premises?: DecisionPremises;
  /** The premises within which serving is allowed, as the handler wrote it. */
  servingArea?: string;
  /** The errand's attachments; the drawings of the serving area are referenced by file name. */
  attachments?: { fileName: string; purpose?: { name?: string } }[];
  /** The day the permit is issued, as the handler set it on the decision. */
  issuedOn?: string;
  /** The telephone to the premises as the handler has it, which starts as the application's answer. */
  premisesPhone?: string;
  /** The handler saving the decision. */
  user: { name: string };
  /** Today, YYYY-MM-DD; the backend stamps decidedAt on the same save. */
  today: string;
}

/** No longer sent; decisions saved while it was carry it where a value was missing. */
export const PLACEHOLDER = 'foobar';

/** A permit's parameters, keyed as its template reads them. */
type Parameters = Record<string, string | undefined>;

const join = (...parts: (string | undefined)[]): string | undefined => parts.filter(Boolean).join(', ') || undefined;

const postalAddress = (postalCode: string | undefined, city: string | undefined): string | undefined =>
  postalCode && city ? `${postalCode} ${city}` : undefined;

const drawingReference = (attachments: DecisionParameterInput['attachments']): string | undefined =>
  attachments
    ?.filter((attachment) => FLOOR_PLAN_PURPOSES.includes(attachment.purpose?.name ?? ''))
    .map((attachment) => attachment.fileName)
    .join(', ') || undefined;

const personName = (holder: SupportStakeholderFormModel | undefined): string | undefined =>
  [holder?.firstName, holder?.lastName].filter(Boolean).join(' ') || undefined;

const holderPhone = (holder: SupportStakeholderFormModel | undefined): string | undefined =>
  holder?.phoneNumbers
    ?.map((phoneNumber) => phoneNumber.value)
    .filter(Boolean)
    .join(', ') || undefined;

/** The address is the errand's own; the review step sees to it that the applicant has one. */
const permitHolderParameters = (holder: SupportStakeholderFormModel | undefined): Parameters => ({
  permitHolderName: holder?.organizationName || personName(holder),
  permitHolderOrgNumber: holder?.organizationNumber,
  permitHolderStreet: holder?.address,
  permitHolderPostalAddress: postalAddress(holder?.zipCode, holder?.city),
});

/** The telephone to the premises the application gave, which the handler's field starts from. */
export const applicationPremisesPhone = (form: FormValue | undefined): string =>
  (form && childText(form, 'kontaktuppgifterTillServeringsstallet', 'telefonnummer')) ?? '';

/**
 * The restaurant number is left out: the process resolves it and puts the one it assigned on the
 * certificate. The telephone is the handler's, since the application asks for it but does not insist.
 */
const premisesParameters = (
  form: FormValue | undefined,
  premises: DecisionPremises | undefined,
  premisesPhone: string | undefined
): Parameters => ({
  premisesName: form && text(form.serveringsstalletsNamn),
  premisesStreet: premises?.street,
  premisesPostalAddress: postalAddress(premises?.postalCode, premises?.city),
  premisesPhone: text(premisesPhone) ?? text(applicationPremisesPhone(form)),
});

const issuingParameters = ({
  errand,
  user,
  issuedOn,
}: Pick<DecisionParameterInput, 'errand' | 'user' | 'issuedOn'>): Parameters => ({
  caseNumber: errand.errandNumber,
  executionDate: issuedOn,
  // replacesDecision: undefined, // the replaced decision is not tracked
  issuedByNameAndTitle: join(user.name, 'handläggare'),
  issuedByUnit: 'Alkohol- och tobaksenheten',
});

// Permanent serving asks the period per audience; temporary and farm sales ask it once.
const SERVING_PERIOD_CHOICES = [
  'serveringsperiodForAllmanheten',
  'serveringsperiodForSlutetSallskap',
  'forsaljningsperiod',
];
const SERVING_PERIOD_DATES = [
  'periodServeringAllmanheten',
  'periodServeringSlutetSallskap',
  'angePeriodForForsaljning',
  'angeMellanVilkaDatumDetTillfalliga',
];
const servingPeriods = (form: FormValue): string[] =>
  SERVING_PERIOD_CHOICES.map((field) => text(form[field])).filter((period): period is string => !!period);
const servingPeriodDates = (form: FormValue): string | undefined =>
  SERVING_PERIOD_DATES.map((field) => dateRangeText(form, field))
    .filter(Boolean)
    .join('\n') || undefined;

// One line per serving time asked, labelled where the form asks more than one.
const SERVING_HOURS: [label: string, field: string][] = [
  ['Inomhus, allmänheten', 'serveringstiderInomhusAllmanheten'],
  ['Utomhus, allmänheten', 'serveringstiderUtomhusAllmanheten'],
  ['Inomhus, slutet sällskap', 'serveringstiderInomhusSlutetSallskap'],
  ['Utomhus, slutet sällskap', 'serveringstiderUtomhusSlutetSallskap'],
  ['', 'klockslagForServeringen'],
  ['', 'forsaljningstider'],
];
const servingHours = (form: FormValue): string | undefined =>
  SERVING_HOURS.map(([label, field]) => {
    const hours = timeRangeText(form, field);
    return hours && [label, hours].filter(Boolean).join(' ');
  })
    .filter(Boolean)
    .join('\n') || undefined;

export const servingPermitParameters = ({
  errand,
  errandType,
  form,
  premises,
  servingArea,
  attachments,
  issuedOn,
  premisesPhone,
  user,
  today,
}: DecisionParameterInput): Parameters => ({
  ...permitHolderParameters(errand.customer?.[0]),
  permitHolderPhone: holderPhone(errand.customer?.[0]),
  ...premisesParameters(form, premises, premisesPhone),
  servingToPublic: form && String(servesPublic(form)),
  servingToClosedCompany: form && String(servesPrivate(form)),
  scopeAllYear: form && String(servingPeriods(form).includes('ARET_RUNT')),
  scopeAnnualPeriod: form && String(servingPeriods(form).includes('ARLIGEN_UNDER_VISS_PERIOD')),
  scopeTasting: String(errandType === 'TASTING'),
  scopePeriodFromTo: form && servingPeriodDates(form),
  beverageSpirits: form && String(hasChosen(form, 'alkoholdrycker', 'SPRITDRYCKER')),
  beverageWine: form && String(hasChosen(form, 'alkoholdrycker', 'VIN')),
  beverageBeer: form && String(hasChosen(form, 'alkoholdrycker', 'STARKOL')),
  beverageOtherFermented: form && String(hasChosen(form, 'alkoholdrycker', 'CIDER_ELLER_ANDRA_JASTA_ALKOHOLDRYCKER')),
  servingAreaDescription: text(servingArea),
  servingAreaDrawingReference: drawingReference(attachments),
  servingAreaSeats: form && childText(form, 'sittplatserILokalen', 'antalSittplatserInomhus'),
  servingAreaMaxPersons: form && childText(form, 'maximaltAntalPersonerILokalen', 'antalPersoner'),
  servingHours: form && servingHours(form),
  ...issuingParameters({ errand, user, issuedOn }),
  decisionDateAndCaseNumber: join(today, errand.errandNumber),
});

export const tobaccoPermitParameters = ({
  errand,
  form,
  premises,
  issuedOn,
  premisesPhone,
  user,
}: DecisionParameterInput): Parameters => ({
  ...permitHolderParameters(errand.customer?.[0]),
  permitHolderCareOf: errand.customer?.[0]?.careOf,
  ...premisesParameters(form, premises, premisesPhone),
  premisesPropertyDesignation: undefined, // fastighetsbeteckning is not asked for anywhere yet
  salesRetail: undefined, // the form does not ask whether the sales are retail
  salesWholesale: undefined, // the form does not ask whether the sales are wholesale
  salesOnline: form && String(form.bedriverAvenDistansforsaljning === 'JA'),
  validityIndefinite: form && String(form.tidsperiodForForsaljningen === 'TILLSVIDARE'),
  validityTemporary: form && String(form.tidsperiodForForsaljningen === 'TIDSBEGRANSAD_FORSALJNING'),
  temporaryPeriod: form && dateRangeText(form, 'periodTidsbegransadForsaljning'),
  ...issuingParameters({ errand, user, issuedOn }),
  decisionOfficerAndCaseNumber: join(user.name, errand.errandNumber),
});

/** By the decision's `type` (see supportDecisionPermitType); any other permit gets the premises alone. */
const parametersFor = (permitType: string, input: DecisionParameterInput): Parameters => {
  if (permitType === 'SERVERINGSTILLSTAND') return servingPermitParameters(input);
  if (permitType === 'TOBAKSFORSALJNING') return tobaccoPermitParameters(input);
  return premisesParameters(input.form, input.premises, input.premisesPhone);
};

const CERTIFICATE_TEMPLATES: Record<string, string> = {
  SERVERINGSTILLSTAND: 'serving-permit-certificate',
  TOBAKSFORSALJNING: 'tobacco-permit-certificate',
};

export const certificateTemplate = (permitType: string): string | undefined => CERTIFICATE_TEMPLATES[permitType];

export interface CertificateDecision {
  decisionText: string;
  decisionMaker: string;
  validFrom: string;
  terms: string[];
}

/** The permit's record with the decision's own fields, named as the template reads them. */
const decisionParameters = (
  permitType: string,
  input: DecisionParameterInput,
  decision: CertificateDecision
): Parameters => ({
  ...parametersFor(permitType, input),
  decisionText: decision.decisionText,
  decisionMaker: decision.decisionMaker,
  decisionDate: input.today,
  validFrom: decision.validFrom,
  ...(permitType === 'TOBAKSFORSALJNING' ? { information: decision.terms.join('\n') || undefined } : {}),
});

const chosenRestaurantNumber = (premises: DecisionPremises | undefined): string =>
  premises?.choice.kind === 'EXISTING' ? premises.choice.restaurantNumber : '';

/**
 * What the permit template renders for the decision in hand, blank where nothing is known. The
 * conditions and the restaurant number are the process's to fill, and stand here as the handler
 * chose them so that the preview shows what the certificate will.
 */
export const toCertificateParameters = (
  permitType: string,
  input: DecisionParameterInput,
  decision: CertificateDecision
): Record<string, string> => {
  const parameters = {
    ...decisionParameters(permitType, input, decision),
    premisesRestaurantNumber: chosenRestaurantNumber(input.premises),
    ...(permitType === 'TOBAKSFORSALJNING' ? {} : { conditions: decision.terms.join('\n') }),
    replacesDecision: '',
  };
  return Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, value ?? '']));
};

/**
 * What the permit template demands of the errand, by the party that can supply it. The keys are the
 * template's own, and they are read back out of the mapping above so that the two cannot drift apart.
 * The handler fills what stands on the errand; what the application carries can only be completed by
 * the applicant, which is a complement and not something the step should wait for.
 *
 * Only the serving permit is listed. The tobacco certificate reads placeholders that have no source
 * at all, and its application names its fields differently, so demanding them would stop every
 * tobacco errand without giving the handler anywhere to go. It joins once its template is settled.
 */
const PERMIT_INPUTS_OF_THE_HANDLER: Record<string, string[]> = {
  SERVERINGSTILLSTAND: ['permitHolderName', 'permitHolderStreet', 'permitHolderPostalAddress', 'permitHolderPhone'],
};

const PERMIT_INPUTS_OF_THE_APPLICANT: Record<string, string[]> = {
  SERVERINGSTILLSTAND: [
    'premisesName',
    'servingAreaSeats',
    'servingAreaMaxPersons',
    'servingHours',
    'servingAreaDrawingReference',
  ],
};

const PERMIT_INPUTS_OF_THE_DECISION: Record<string, string[]> = {
  SERVERINGSTILLSTAND: [
    'decisionText',
    'decisionMaker',
    'validFrom',
    'executionDate',
    'premisesStreet',
    'premisesPostalAddress',
    'premisesPhone',
    'servingAreaDescription',
  ],
};

export const missingDecisionInputs = (permitType: string, parameters: Parameter[] | undefined): string[] =>
  (PERMIT_INPUTS_OF_THE_DECISION[permitType] ?? []).filter((key) => !decisionParameterValue(parameters, key));

export interface MissingPermitInputs {
  /** Template keys the handler fills on the errand itself. */
  fromTheErrand: string[];
  /** Template keys the application and its attachments carry. */
  fromTheApplication: string[];
}

/** Empty lists for a permit that issues no certificate, since nothing is printed. */
export const missingPermitInputs = (
  permitType: string,
  errand: DecisionParameterInput['errand'],
  form: FormValue | undefined,
  attachments: DecisionParameterInput['attachments']
): MissingPermitInputs => {
  const parameters = parametersFor(permitType, { errand, form, attachments, user: { name: '' }, today: '' });
  const unfilled = (keys: string[]) => keys.filter((key) => !parameters[key]);

  return {
    fromTheErrand: unfilled(PERMIT_INPUTS_OF_THE_HANDLER[permitType] ?? []),
    fromTheApplication: unfilled(PERMIT_INPUTS_OF_THE_APPLICANT[permitType] ?? []),
  };
};

/** Sent with the decision. A key without a value is left out, so a strict template names it instead of printing a stand-in. */
export const toDecisionParameters = (
  permitType: string,
  input: DecisionParameterInput,
  decision: CertificateDecision
): Parameter[] =>
  Object.entries(decisionParameters(permitType, input, decision))
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([key, value]) => ({ key, values: [value] }));

/** What a saved decision carries under the key; undefined when nothing but the placeholder was sent. */
export const decisionParameterValue = (parameters: Parameter[] | undefined, key: string): string | undefined => {
  const sent = parameters?.find((parameter) => parameter.key === key)?.values?.[0];
  return sent && sent !== PLACEHOLDER ? sent : undefined;
};
