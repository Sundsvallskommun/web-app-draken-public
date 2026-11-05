import { FLOOR_PLAN_PURPOSES } from './support-decision-basis-service';
import type { DecisionPremises } from './support-decision-premises-service';
import {
  type DecisionScope,
  scopeFromForm,
  type ServingHoursSlot,
  servingHoursSlotOf,
  servingHoursSlotsFor,
  servingHoursText,
  toScopeJson,
} from './support-decision-scope-service';
import type { SupportDecision } from './support-decision-service';
import type { SupportErrand, SupportStakeholderFormModel } from './support-errand-service';
import {
  childText,
  type FormValue,
  isRecord,
  premisesValue,
  servesPrivate,
  servesPublic,
  text,
} from './support-form-value-service';
import {
  type JsonObject,
  jsonParameterObject,
  objectAt,
  stringAt,
  withoutBlanks,
} from './support-json-parameter-service';

/**
 * What a decision carries to the process that issues the permit: one JSON parameter shaped as the
 * permit is in PartyAssets (aot_alcohol_decision / aot_tobacco_decision, supersets of the PartyAsset
 * schemas), so the process can copy it over. The certificate template reads flat keys, so the JSON is
 * flattened for it (flattenDecisionJson); the process flattens it the same way for the real
 * certificate. The beverages and serving hours come from what the handler decided
 * (support-decision-scope-service), not from the form.
 */

export interface DecisionParameterInput {
  errand: Pick<SupportErrand, 'id' | 'errandNumber' | 'customer'>;
  /** The most specific type label of the errand (its resourceName), e.g. TASTING. */
  errandType?: string;
  /** The answers filed under the errand type's schema name; undefined when there are none. */
  form?: FormValue;
  /** The premises the decision concerns, once chosen. */
  premises?: DecisionPremises;
  /** The beverages and serving hours the handler decided (prefilled from the form). */
  scope?: DecisionScope;
  /** The premises within which serving is allowed, as the handler wrote it. */
  servingAreaDescription?: string;
  /** The errand's attachments; the drawings of the serving area are referenced by file name. */
  attachments?: { fileName: string; purpose?: { name?: string } }[];
  /** The day the permit is issued, as the handler set it on the decision. */
  executionDate?: string;
  /** The decision's own registry number (Beslutsdiarienummer). */
  externalCaseRegistrationNumber?: string;
  /** The telephone to the premises as the handler has it, which starts as the application's answer. */
  premisesPhoneNumber?: string;
  /** The handler saving the decision. */
  user: { name: string };
  /** Today, YYYY-MM-DD; the backend stamps decidedAt on the same save. */
  today: string;
}

export interface CertificateDecision {
  outcome?: string;
  decisionText: string;
  decisionMaker: string;
  validFrom: string;
  legalBasis?: string;
  justification?: string;
  /** The att-satser, one per line. */
  clauses?: string;
  terms: string[];
}

/** The template's keys, flat. */
type Parameters = Record<string, string | undefined>;

const SERVING_PERMIT = 'SERVERINGSTILLSTAND';
const TOBACCO_PERMITS = ['TOBAKSFORSALJNING', 'ECIGARETTFORSALJNING'];

const ALCOHOL_DECISION_SCHEMA = 'aot_alcohol_decision';
const TOBACCO_DECISION_SCHEMA = 'aot_tobacco_decision';

/** The decision keeps what the permit says in one JSON parameter, filed under the schema of its permit area. */
export const decisionSchemaName = (permitType: string): string =>
  TOBACCO_PERMITS.includes(permitType) ? TOBACCO_DECISION_SCHEMA : ALCOHOL_DECISION_SCHEMA;

// The values the schemas restrict. One that does not fit is left out, so the save is not refused for it
// and the checks before the decision name it as missing.
const SERVING_PERMIT_TYPES = [
  'PERMANENT_SERVING',
  'TEMPORARY_SERVING_PUBLIC',
  'TEMPORARY_SERVING_PRIVATE',
  'PERMANENT_CATERING',
  'FARM_SALES',
  'TASTING',
];
const OUTCOMES = ['APPROVAL', 'APPROVAL_WITH_CONDITIONS', 'REJECTED', 'INADMISSIBLE', 'DISMISSED'];

/** What a saved decision says of the permit; undefined for a decision without it. */
export const savedDecisionJson = (decision: SupportDecision | undefined): JsonObject | undefined =>
  jsonParameterObject(decision?.jsonParameters, ALCOHOL_DECISION_SCHEMA) ??
  jsonParameterObject(decision?.jsonParameters, TOBACCO_DECISION_SCHEMA);

const matching =
  (pattern: RegExp) =>
  (value: string | undefined): string | undefined =>
    value && pattern.test(value) ? value : undefined;
const postalCode = matching(/^[0-9]{3} ?[0-9]{2}$/);
const organizationNumber = matching(/^([0-9]{2})?[0-9]{6}-?[0-9]{4}$/);
const restaurantNumber = matching(/^[0-9]{8}$/);
const isoDate = matching(/^\d{4}-\d{2}-\d{2}$/);
const oneOf = (values: string[]) => (value: string | undefined) => value && values.includes(value) ? value : undefined;

const count = (value: string | undefined): number | undefined => {
  const number = Number(value);
  return value && Number.isInteger(number) && number >= 0 ? number : undefined;
};

/** An annual period is the same days every year, so the year the form asks for is dropped. */
const monthDay = (date: string | undefined): string | undefined => isoDate(date)?.slice(5);

const join = (...parts: (string | undefined)[]): string | undefined => parts.filter(Boolean).join(', ') || undefined;

const addressOf = (street: string | undefined, zip: string | undefined, city: string | undefined, careOf?: string) => ({
  careOf: text(careOf),
  street: text(street),
  postalCode: postalCode(text(zip)),
  city: text(city),
});

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

/** The telephone to the premises the application gave, which the handler's field starts from. */
export const applicationPremisesPhone = (form: FormValue | undefined): string => {
  const contact = premisesValue(form, 'Contact');
  return (isRecord(contact) ? text(contact.phoneNumber) : undefined) ?? '';
};

/** The address is the errand's own; the review step sees to it that the applicant has one. */
const permitHolderOf = (holder: SupportStakeholderFormModel | undefined): JsonObject => ({
  name: holder?.organizationName || personName(holder),
  organizationNumber: organizationNumber(holder?.organizationNumber),
  address: addressOf(holder?.address, holder?.zipCode, holder?.city, holder?.careOf),
  phoneNumber: holderPhone(holder),
});

/** The telephone is the handler's, since the application asks for it but does not insist. */
const placeOf = ({ form, premises, premisesPhoneNumber }: DecisionParameterInput): JsonObject => ({
  name: text(premisesValue(form, 'Name')),
  address: premises && addressOf(premises.street, premises.postalCode, premises.city),
  phoneNumber: text(premisesPhoneNumber) ?? text(applicationPremisesPhone(form)),
});

/** The process reads the choice to resolve the restaurant number: an existing one, or a new one to create. */
const restaurantChoiceOf = (premises: DecisionPremises | undefined): JsonObject => ({
  restaurantNumber:
    premises?.choice.kind === 'EXISTING' ? restaurantNumber(premises.choice.restaurantNumber) : undefined,
  newRestaurantNumber: premises?.choice.kind === 'NEW' || undefined,
});

// Permanent serving asks the period per audience; farm sales asks it once; temporary permits give dates.
const PERIOD_FIELDS: [choice: string, dates: string, audience?: string][] = [
  ['publicServingPeriod', 'publicServingPeriodDates', 'PUBLIC'],
  ['closedCompanyServingPeriod', 'closedCompanyServingPeriodDates', 'CLOSED_COMPANY'],
  ['salesPeriod', 'salesPeriodDates'],
];

// The form keeps a default period for an audience it does not ask about, so that one is not a period.
const serves = (form: FormValue, audience: string | undefined): boolean =>
  audience === 'PUBLIC' ? servesPublic(form) : audience === 'CLOSED_COMPANY' ? servesPrivate(form) : true;

const servingPeriodsOf = (form: FormValue): JsonObject[] => {
  const periods: JsonObject[] = PERIOD_FIELDS.flatMap(([choice, dates, audience]) => {
    if (!serves(form, audience)) return [];
    const period = text(form[choice]);
    if (period === 'ALL_YEAR') return [{ audience, period }];
    if (period !== 'ANNUAL_PERIOD') return [];
    const range = objectAt(form[dates]);
    return [{ audience, period, from: monthDay(text(range.fromDate)), to: monthDay(text(range.toDate)) }];
  });
  const permitPeriod = form.permitPeriodDates;
  return isRecord(permitPeriod)
    ? [
        ...periods,
        {
          period: 'FIXED_PERIOD',
          fromDate: isoDate(text(permitPeriod.fromDate)),
          toDate: isoDate(text(permitPeriod.toDate)),
        },
      ]
    : periods;
};

const servingOf = ({
  errandType,
  form,
  scope,
  servingAreaDescription,
  attachments,
}: DecisionParameterInput): JsonObject => ({
  servingPermitType: oneOf(SERVING_PERMIT_TYPES)(errandType),
  servingTo: form && [servesPublic(form) && 'PUBLIC', servesPrivate(form) && 'CLOSED_COMPANY'].filter(Boolean),
  servingPeriods: form && servingPeriodsOf(form),
  tasting: errandType === 'TASTING' || undefined,
  ...(scope && toScopeJson(scope, SERVING_PERMIT)),
  servingArea: {
    description: text(servingAreaDescription),
    drawingReference: drawingReference(attachments),
    seatsIndoor: count(form && childText(form, 'seating', 'seatsIndoor')),
    seatsOutdoor: count(form && childText(form, 'seating', 'seatsOutdoor')),
    maxPersons: count(form && childText(form, 'maxPersonsInPremises', 'maxPersons')),
  },
});

const salesPeriodOf = (form: FormValue): JsonObject | undefined => {
  const period = text(form.salesPeriod);
  if (period === 'INDEFINITE') return { period, from: isoDate(text(form.salesStartDate)) };
  if (period !== 'TEMPORARY') return undefined;
  const range = objectAt(form.salesPeriodDates);
  return { period, from: isoDate(text(range.fromDate)), to: isoDate(text(range.toDate)) };
};

const tobaccoOf = ({ form }: DecisionParameterInput): JsonObject =>
  form
    ? {
        salesTypes: form.includesDistanceSelling === 'YES' ? ['DISTANCE_SELLING'] : [],
        salesPeriod: salesPeriodOf(form),
      }
    : {};

const ISSUING_UNIT = 'Alkohol- och tobaksenheten';

/** The decision as the certificate states it; the decision's root carries the same for Support Management. */
const decisionOf = (
  { user, executionDate, today }: DecisionParameterInput,
  decision: CertificateDecision
): JsonObject => ({
  outcome: oneOf(OUTCOMES)(decision.outcome),
  decisionText: text(decision.decisionText),
  justification: text(decision.justification),
  clauses: text(decision.clauses),
  decisionMaker: text(decision.decisionMaker),
  decisionDate: isoDate(today),
  executionDate: isoDate(executionDate),
  validFrom: isoDate(decision.validFrom),
  legalBasis: text(decision.legalBasis),
  issuedBy: { name: text(user.name), title: 'handläggare', unit: ISSUING_UNIT },
});

/** What the decision is saved with; a value that is not there is left out, as the schemas want. */
export const toDecisionJson = (
  permitType: string,
  input: DecisionParameterInput,
  decision: CertificateDecision
): JsonObject => {
  const common = {
    errandId: input.errand.id,
    externalCaseRegistrationNumber: text(input.externalCaseRegistrationNumber),
    permitHolder: permitHolderOf(input.errand.customer?.[0]),
    decision: decisionOf(input, decision),
  };

  if (TOBACCO_PERMITS.includes(permitType)) {
    return withoutBlanks({
      ...common,
      pointOfSale: placeOf(input),
      ...tobaccoOf(input),
      information: decision.terms.join('\n'),
    });
  }

  return withoutBlanks({
    ...common,
    premises: { ...placeOf(input), ...restaurantChoiceOf(input.premises) },
    ...(permitType === SERVING_PERMIT ? servingOf(input) : {}),
    conditions: decision.terms,
  });
};

const strings = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : undefined;

const records = (value: unknown): JsonObject[] | undefined =>
  Array.isArray(value) ? value.filter(isRecord) : undefined;

const box = (list: string[] | undefined, value: string): string | undefined => list && String(list.includes(value));

const postalAddressOf = (address: JsonObject): string | undefined => {
  const zip = stringAt(address.postalCode);
  const city = stringAt(address.city);
  return zip && city ? `${zip} ${city}` : undefined;
};

const rangeText = (from: string | undefined, to: string | undefined): string | undefined =>
  from || to ? `${from ?? ''} – ${to ?? ''}` : undefined;

const periodText = (period: JsonObject): string | undefined => {
  if (period.period === 'ANNUAL_PERIOD') return rangeText(stringAt(period.from), stringAt(period.to));
  if (period.period === 'FIXED_PERIOD') return rangeText(stringAt(period.fromDate), stringAt(period.toDate));
  return undefined;
};

// One line per decided serving time, labelled where the permit has more than one.
const SERVING_HOURS_LABELS: Record<ServingHoursSlot, string> = {
  indoorPublic: 'Inomhus, allmänheten',
  outdoorPublic: 'Utomhus, allmänheten',
  indoorPrivate: 'Inomhus, slutet sällskap',
  outdoorPrivate: 'Utomhus, slutet sällskap',
  single: '',
};

const servingHoursLines = (entries: JsonObject[] | undefined): string | undefined =>
  entries
    ?.map((entry) => {
      const slot = servingHoursSlotOf(entry);
      const hours = servingHoursText({ from: stringAt(entry.from) ?? '', to: stringAt(entry.to) ?? '' });
      return hours && [slot && SERVING_HOURS_LABELS[slot], hours].filter(Boolean).join(' ');
    })
    .filter(Boolean)
    .join('\n') || undefined;

const numberText = (value: unknown): string | undefined => (typeof value === 'number' ? String(value) : undefined);

/**
 * The decision's JSON as the certificate templates read it, flat. The process flattens it the same way
 * for the certificate it issues; the case number it prints is the errand's.
 */
export const flattenDecisionJson = (json: JsonObject | undefined, errandNumber?: string): Parameters => {
  const holder = objectAt(json?.permitHolder);
  const holderAddress = objectAt(holder.address);
  const place = objectAt(json?.premises ?? json?.pointOfSale);
  const placeAddress = objectAt(place.address);
  const area = objectAt(json?.servingArea);
  const decision = objectAt(json?.decision);
  const issuedBy = objectAt(decision.issuedBy);
  const periods = records(json?.servingPeriods);
  const salesPeriod = isRecord(json?.salesPeriod) ? json.salesPeriod : undefined;
  const beverages = strings(json?.beverages);
  const salesTypes = strings(json?.salesTypes);
  const decisionCaseNumber = stringAt(json?.externalCaseRegistrationNumber) ?? errandNumber;
  const decisionDate = stringAt(decision.decisionDate);
  const issuer = stringAt(issuedBy.name);

  return {
    permitHolderName: stringAt(holder.name),
    permitHolderOrgNumber: stringAt(holder.organizationNumber),
    permitHolderCareOf: stringAt(holderAddress.careOf),
    permitHolderStreet: stringAt(holderAddress.street),
    permitHolderPostalAddress: postalAddressOf(holderAddress),
    permitHolderPhone: stringAt(holder.phoneNumber),
    premisesName: stringAt(place.name),
    premisesStreet: stringAt(placeAddress.street),
    premisesPostalAddress: postalAddressOf(placeAddress),
    premisesPhone: stringAt(place.phoneNumber),
    premisesRestaurantNumber: stringAt(place.restaurantNumber),
    premisesPropertyDesignation: stringAt(place.propertyDesignation),
    servingToPublic: box(strings(json?.servingTo), 'PUBLIC'),
    servingToClosedCompany: box(strings(json?.servingTo), 'CLOSED_COMPANY'),
    scopeAllYear: periods && String(periods.some((period) => period.period === 'ALL_YEAR')),
    scopeAnnualPeriod: periods && String(periods.some((period) => period.period === 'ANNUAL_PERIOD')),
    scopeTasting: String(json?.tasting === true),
    scopePeriodFromTo: periods?.map(periodText).filter(Boolean).join('\n') || undefined,
    beverageSpirits: box(beverages, 'SPIRITS'),
    beverageWine: box(beverages, 'WINE'),
    beverageBeer: box(beverages, 'STRONG_BEER'),
    beverageOtherFermented: box(beverages, 'OTHER_FERMENTED_BEVERAGES'),
    servingAreaDescription: stringAt(area.description),
    servingAreaDrawingReference: stringAt(area.drawingReference),
    servingAreaSeats: numberText(area.seatsIndoor),
    servingAreaMaxPersons: numberText(area.maxPersons),
    servingHours: servingHoursLines(records(json?.servingHours)),
    salesRetail: box(salesTypes, 'RETAIL'),
    salesWholesale: box(salesTypes, 'WHOLESALE'),
    salesOnline: box(salesTypes, 'DISTANCE_SELLING'),
    validityIndefinite: salesPeriod && String(salesPeriod.period === 'INDEFINITE'),
    validityTemporary: salesPeriod && String(salesPeriod.period === 'TEMPORARY'),
    temporaryPeriod:
      salesPeriod?.period === 'TEMPORARY' ? rangeText(stringAt(salesPeriod.from), stringAt(salesPeriod.to)) : undefined,
    information: stringAt(json?.information),
    conditions: strings(json?.conditions)?.join('\n') || undefined,
    caseNumber: errandNumber,
    decisionCaseNumber,
    executionDate: stringAt(decision.executionDate),
    issuedByNameAndTitle: join(issuer, stringAt(issuedBy.title)),
    issuedByUnit: stringAt(issuedBy.unit),
    decisionText: stringAt(decision.decisionText),
    decisionClauses: stringAt(decision.clauses),
    decisionMaker: stringAt(decision.decisionMaker),
    decisionDate,
    validFrom: stringAt(decision.validFrom),
    decisionDateAndCaseNumber: join(decisionDate, decisionCaseNumber),
    decisionOfficerAndCaseNumber: join(issuer, decisionCaseNumber),
    replacesDecision: stringAt(decision.replacesDecision),
  };
};

const CERTIFICATE_TEMPLATES: Record<string, string> = {
  SERVERINGSTILLSTAND: 'serving-permit-certificate',
  TOBAKSFORSALJNING: 'tobacco-permit-certificate',
};

export const certificateTemplate = (permitType: string): string | undefined => CERTIFICATE_TEMPLATES[permitType];

/** What the permit template renders for the decision in hand, blank where nothing is known. */
export const toCertificateParameters = (
  permitType: string,
  input: DecisionParameterInput,
  decision: CertificateDecision
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(flattenDecisionJson(toDecisionJson(permitType, input, decision), input.errand.errandNumber)).map(
      ([key, value]) => [key, value ?? '']
    )
  );

/**
 * What the permit template demands of the errand, by the party that can supply it. The keys are the
 * template's own, read out of the flattened decision, so the two cannot drift apart. The handler fills
 * what stands on the errand; what the application carries can only be completed by the applicant,
 * which is a complement and not something the step should wait for.
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
  TOBAKSFORSALJNING: ['decisionText', 'validFrom', 'executionDate', 'information'],
};

/** An inspection or action errand's decision can be sent without att-satser. */
export const decisionRequiresClauses = (permitType: string): boolean => permitType !== 'TILLSYN';

/** The keys the decision's saved JSON leaves without a value. */
export const missingDecisionInputs = (permitType: string, json: JsonObject | undefined): string[] => {
  const flat = flattenDecisionJson(json);
  return [
    ...(PERMIT_INPUTS_OF_THE_DECISION[permitType] ?? []),
    ...(decisionRequiresClauses(permitType) ? ['decisionClauses'] : []),
  ].filter((key) => !flat[key]);
};

export interface MissingPermitInputs {
  /** Template keys the handler fills on the errand itself. */
  fromTheErrand: string[];
  /** Template keys the application and its attachments carry. */
  fromTheApplication: string[];
}

const NO_DECISION: CertificateDecision = { decisionText: '', decisionMaker: '', validFrom: '', terms: [] };

/** Empty lists for a permit that issues no certificate, since nothing is printed. */
export const missingPermitInputs = (
  permitType: string,
  errandType: string | undefined,
  errand: DecisionParameterInput['errand'],
  form: FormValue | undefined,
  attachments: DecisionParameterInput['attachments']
): MissingPermitInputs => {
  // Before the decision the hours are the application's, which is where the decision will start from.
  const scope = scopeFromForm(form, errandType, servingHoursSlotsFor(errandType, form));
  const flat = flattenDecisionJson(
    toDecisionJson(
      permitType,
      { errand, errandType, form, scope, attachments, user: { name: '' }, today: '' },
      NO_DECISION
    )
  );
  const unfilled = (keys: string[]) => keys.filter((key) => !flat[key]);

  return {
    fromTheErrand: unfilled(PERMIT_INPUTS_OF_THE_HANDLER[permitType] ?? []),
    fromTheApplication: unfilled(PERMIT_INPUTS_OF_THE_APPLICANT[permitType] ?? []),
  };
};
