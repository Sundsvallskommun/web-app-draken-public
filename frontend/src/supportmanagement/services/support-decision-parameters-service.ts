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
 * each one. What the decision holds on its root is not repeated as a parameter: the templates'
 * decisionText (outcome), decisionMaker (decidedByRole), decisionDate (decidedAt), validFrom and
 * conditions / information (terms).
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
  /** The handler saving the decision. */
  user: { name: string };
  /** Today, YYYY-MM-DD; the backend stamps decidedAt on the same save. */
  today: string;
}

/** Sent for a key the mapping cannot fill; the process does not yet say which keys it needs. */
export const PLACEHOLDER = 'foobar';

/** A permit's parameters, keyed as its template reads them. */
type Parameters = Record<string, string | undefined>;

const join = (...parts: (string | undefined)[]): string | undefined => parts.filter(Boolean).join(', ') || undefined;

/** "852 30 Sundsvall" — the postal code as it came, so the premises read back as they were sent. */
const postalAddress = (postalCode: string | undefined, city: string | undefined): string | undefined =>
  [postalCode, city].filter(Boolean).join(' ') || undefined;

/** The inverse of postalAddress: a Swedish postal code, then the city. */
export const splitPostalAddress = (
  postalAddress: string | undefined
): { postalCode: string; city: string } | undefined => {
  const match = postalAddress?.trim().match(/^(\d{3} ?\d{2})\s+(\S.*)$/);
  return match ? { postalCode: match[1], city: match[2] } : undefined;
};

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

const permitHolderParameters = (holder: SupportStakeholderFormModel | undefined): Parameters => ({
  permitHolderName: holder?.organizationName || personName(holder),
  permitHolderOrgNumber: holder?.organizationNumber,
  permitHolderStreet: holder?.address,
  permitHolderPostalAddress: postalAddress(holder?.zipCode, holder?.city),
});

/** The chosen number, or that a new one is to be created; neither until the choice is made. */
const premisesParameters = (form: FormValue | undefined, premises: DecisionPremises | undefined): Parameters => ({
  premisesName: form && text(form.serveringsstalletsNamn),
  premisesStreet: premises?.street,
  premisesPostalAddress: postalAddress(premises?.postalCode, premises?.city),
  premisesPhone: form && childText(form, 'kontaktuppgifterTillServeringsstallet', 'telefonnummer'),
  ...(premises?.choice.kind === 'EXISTING' && { premisesRestaurantNumber: premises.choice.restaurantNumber }),
  ...(premises?.choice.kind === 'NEW' && { newRestaurantNumber: 'true' }),
});

const issuingParameters = ({ errand, user }: Pick<DecisionParameterInput, 'errand' | 'user'>): Parameters => ({
  caseNumber: errand.errandNumber,
  // FIXME What date to use?
  executionDate: undefined, // nothing on the tab asks for it
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
  user,
  today,
}: DecisionParameterInput): Parameters => ({
  ...permitHolderParameters(errand.customer?.[0]),
  permitHolderPhone: holderPhone(errand.customer?.[0]),
  ...premisesParameters(form, premises),
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
  ...issuingParameters({ errand, user }),
  decisionDateAndCaseNumber: join(today, errand.errandNumber),
});

export const tobaccoPermitParameters = ({ errand, form, premises, user }: DecisionParameterInput): Parameters => ({
  ...permitHolderParameters(errand.customer?.[0]),
  permitHolderCareOf: errand.customer?.[0]?.careOf,
  ...premisesParameters(form, premises),
  premisesPropertyDesignation: undefined, // fastighetsbeteckning is not asked for anywhere yet
  salesRetail: undefined, // the form does not ask whether the sales are retail
  salesWholesale: undefined, // the form does not ask whether the sales are wholesale
  salesOnline: form && String(form.bedriverAvenDistansforsaljning === 'JA'),
  validityIndefinite: form && String(form.tidsperiodForForsaljningen === 'TILLSVIDARE'),
  validityTemporary: form && String(form.tidsperiodForForsaljningen === 'TIDSBEGRANSAD_FORSALJNING'),
  temporaryPeriod: form && dateRangeText(form, 'periodTidsbegransadForsaljning'),
  ...issuingParameters({ errand, user }),
  decisionOfficerAndCaseNumber: join(user.name, errand.errandNumber),
});

/** By the decision's `type` (see supportDecisionPermitType); any other permit gets the premises alone. */
const parametersFor = (permitType: string, input: DecisionParameterInput): Parameters => {
  if (permitType === 'SERVERINGSTILLSTAND') return servingPermitParameters(input);
  if (permitType === 'TOBAKSFORSALJNING') return tobaccoPermitParameters(input);
  return premisesParameters(input.form, input.premises);
};

/** Every key of the permit's record, in its order; a key without a value carries the placeholder. */
export const toDecisionParameters = (permitType: string, input: DecisionParameterInput): Parameter[] =>
  Object.entries(parametersFor(permitType, input)).map(([key, value]) => ({ key, values: [value || PLACEHOLDER] }));

/** What a saved decision carries under the key; undefined when nothing but the placeholder was sent. */
export const decisionParameterValue = (parameters: Parameter[] | undefined, key: string): string | undefined => {
  const sent = parameters?.find((parameter) => parameter.key === key)?.values?.[0];
  return sent && sent !== PLACEHOLDER ? sent : undefined;
};

/** The choice a saved decision carries: an existing number, or that a new one was asked for. */
const savedChoice = (
  restaurantNumber: string | undefined,
  newRestaurantNumber: string | undefined
): DecisionPremises['choice'] | undefined => {
  if (restaurantNumber) return { kind: 'EXISTING', restaurantNumber };
  return newRestaurantNumber === 'true' ? { kind: 'NEW' } : undefined;
};

/** The premises a saved decision concerns; undefined without a complete address and a choice. */
export const premisesFromDecisionParameters = (parameters: Parameter[] | undefined): DecisionPremises | undefined => {
  const value = (key: string) => decisionParameterValue(parameters, key);
  const street = value('premisesStreet');
  const postal = splitPostalAddress(value('premisesPostalAddress'));
  const choice = savedChoice(value('premisesRestaurantNumber'), value('newRestaurantNumber'));
  if (!street || !postal || !choice) return undefined;

  return { street, ...postal, choice };
};
