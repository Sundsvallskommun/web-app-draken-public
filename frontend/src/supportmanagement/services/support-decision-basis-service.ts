import type { RJSFSchema } from '@rjsf/utils';

import { jsonParameterForSchema, schemaNameForErrand } from './support-errand-schema-service';
import type { SupportErrand } from './support-errand-service';
import {
  AUDIENCE,
  BOTH_AUDIENCES,
  dateRangeText,
  type FormValue,
  isRecord,
  PREMISES_PREFIXES,
  type PremisesField,
  premisesValue,
  servesPrivate,
  servesPublic,
  text,
  timeRangeText,
} from './support-form-value-service';

/**
 * The decision basis reads the AoT form answers (errand.jsonParameters) by key. The keys are a
 * contract with the schemas Katla serves — kept in sync in katla-aot, see
 * docs/beslutsflik-draken-mapping.md there. Row labels come from here, option texts and table
 * headers from the schema version the answers were filed against. A key the schema does not have
 * is a question the errand type never asks, so its row is left out; a key the schema has but the
 * answers lack was hidden by a condition and shows as a dash.
 */

export type { FormValue } from './support-form-value-service';

export interface DecisionBasisForm {
  /** The exact schema version the answers were filed against. */
  schemaId: string;
  value: FormValue;
}

export type BasisCell =
  | { kind: 'text'; text: string }
  | { kind: 'html'; html: string }
  | { kind: 'table'; columns: string[]; rows: string[][] }
  /** The citizen chose to upload instead of writing; the attachment carries this purpose. */
  | { kind: 'attachment'; purpose: string };

export interface BasisRow {
  key: string;
  /** Translation key for the label, or the question title from the schema when there is none. */
  labelKey?: string;
  labelText?: string;
  cell?: BasisCell;
}

export type BasisSectionId =
  | 'operation'
  | 'serving_hours'
  | 'serving_premises'
  | 'serving'
  | 'production'
  | 'event'
  | 'financing'
  | 'premises';

/** The attachment purposes of the drawings of the serving area; a schema lists the ones it asks for. */
export const FLOOR_PLAN_PURPOSES = ['FLOOR_PLAN', 'KITCHEN_FLOOR_PLAN'];

export interface BasisSection {
  id: BasisSectionId;
  rows: BasisRow[];
}

export const getDecisionBasisForm = (
  errand: Pick<SupportErrand, 'labels' | 'classification' | 'jsonParameters'> | undefined,
  namespace: string | undefined
): DecisionBasisForm | undefined => {
  const parameter = jsonParameterForSchema(errand, schemaNameForErrand(errand, namespace));
  const value = parameter?.value;
  if (!parameter?.schemaId || !value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return { schemaId: parameter.schemaId, value: value as FormValue };
};

type Reader = (value: FormValue, schema: RJSFSchema | null) => BasisCell | undefined;

/** Whether the row is asked; `uploaded` holds the purposes of the attachments the errand has. */
type Asks = (schema: RJSFSchema | null, value: FormValue, field: string, uploaded: string[]) => boolean;

interface RowSpec {
  key: string;
  /** The root property that decides whether the errand type asks the question. */
  field: string;
  labelKey?: string | ((value: FormValue) => string);
  read: Reader;
  /** Whether the answers call for the row at all; the errand type asking is not enough. */
  when?: (value: FormValue) => boolean;
  /** Overrides the root-property check for a question that lives deeper in the schema. */
  asks?: Asks;
}

const propertySchema = (schema: RJSFSchema | null, field: string): RJSFSchema | undefined => {
  const property = schema?.properties?.[field];
  return isRecord(property) ? (property as RJSFSchema) : undefined;
};

const optionTitle = (options: unknown, constant: string): string => {
  const option = Array.isArray(options)
    ? options.find((candidate) => isRecord(candidate) && candidate.const === constant)
    : undefined;
  return text(isRecord(option) ? option.title : undefined) ?? constant;
};

const cell = (value: string | undefined): BasisCell | undefined => (value ? { kind: 'text', text: value } : undefined);

const plain =
  (field: string): Reader =>
  (value) =>
    cell(text(value[field]));

const html =
  (field: string): Reader =>
  (value) => {
    const content = text(value[field]);
    return content ? { kind: 'html', html: content } : undefined;
  };

const child =
  (field: string, name: string): Reader =>
  (value) => {
    const object = value[field];
    return cell(isRecord(object) ? text(object[name]) : undefined);
  };

const choiceText = (value: FormValue, schema: RJSFSchema | null, field: string): string | undefined => {
  const chosen = text(value[field]);
  return chosen ? optionTitle(propertySchema(schema, field)?.oneOf, chosen) : undefined;
};

const choice =
  (field: string): Reader =>
  (value, schema) =>
    cell(choiceText(value, schema, field));

export const formChoiceLabel = (value: FormValue, schema: RJSFSchema | null, field: string): string | undefined =>
  choiceText(value, schema, field);

export const formMultiChoiceLabels = (value: FormValue, schema: RJSFSchema | null, field: string): string[] => {
  const chosen = value[field];
  if (!Array.isArray(chosen)) return [];
  const items = propertySchema(schema, field)?.items;
  const options = isRecord(items) ? items.oneOf : undefined;
  return chosen.map((constant) => optionTitle(options, String(constant)));
};

const multiChoice =
  (field: string): Reader =>
  (value, schema) => {
    const labels = formMultiChoiceLabels(value, schema, field);
    return labels.length === 0 ? undefined : cell(labels.join(', '));
  };

const dateRange =
  (field: string): Reader =>
  (value) =>
    cell(dateRangeText(value, field));

const timeRange =
  (field: string): Reader =>
  (value) =>
    cell(timeRangeText(value, field));

/** A period choice ("året runt" / "viss period") with the dates when a period was given. */
const periodWithDates =
  (choiceField: string, rangeField: string): Reader =>
  (value, schema) => {
    const chosen = choiceText(value, schema, choiceField);
    const dates = dateRangeText(value, rangeField);
    return cell([chosen, dates].filter(Boolean).join(', ') || undefined);
  };

const table =
  (field: string): Reader =>
  (value, schema) => {
    const rows = value[field];
    if (!Array.isArray(rows) || rows.length === 0) return undefined;
    const items = propertySchema(schema, field)?.items;
    const properties = isRecord(items) && isRecord(items.properties) ? items.properties : undefined;
    // Without the schema the first row decides the columns, so the table still shows what was filed.
    const columnSource = properties ?? (isRecord(rows[0]) ? rows[0] : {});
    const columns = Object.keys(columnSource);
    if (columns.length === 0) return undefined;
    return {
      kind: 'table',
      columns: columns.map(
        (column) => text(isRecord(properties?.[column]) ? properties[column].title : undefined) ?? column
      ),
      rows: rows.map((row) => columns.map((column) => (isRecord(row) ? text(row[column]) ?? '' : ''))),
    };
  };

/** A question answered either in writing or with an upload, the choice telling which. */
const writtenOrAttached =
  (choiceField: string, writtenConstant: string, textField: string, purpose: string): Reader =>
  (value, schema) => {
    const chosen = text(value[choiceField]);
    if (!chosen) return undefined;
    return chosen === writtenConstant ? html(textField)(value, schema) : { kind: 'attachment', purpose };
  };

/** An upload the schema asks for on its own, not as the answer to a question. */
const attached =
  (purpose: string): Reader =>
  () => ({ kind: 'attachment', purpose });

const contact: Reader = (value) => {
  const details = premisesValue(value, 'Contact');
  const parts = isRecord(details) ? [details.phoneNumber, details.emailAddress, details.website] : [];
  // Tobacco keeps the website at the root; it is only asked with distance sales.
  return cell([...parts, value.distanceSellingWebsite].map(text).filter(Boolean).join(', ') || undefined);
};

/** With one audience the plain labels suffice; with both, each group says whose hours they are. */
const audienceLabel = (plainKey: string, audienceKey: string) => (value: FormValue) =>
  value[AUDIENCE] === BOTH_AUDIENCES ? audienceKey : plainKey;

const label = (section: BasisSectionId, row: string) => `common:decision.basis.${section}.${row}`;

const asksRootProperty: Asks = (schema, value, field) => (schema ? !!propertySchema(schema, field) : field in value);

/** The row's field is the premises suffix; the schema asks it under either prefix. */
const asksPremises: Asks = (schema, value, field, uploaded) =>
  PREMISES_PREFIXES.some((prefix) => asksRootProperty(schema, value, `${prefix}${field}`, uploaded));

/**
 * The schema's `x-attachments` name the uploads it asks for by purpose; the row's field is the purpose.
 * A handler may also give an attachment the purpose by hand, and then it is shown as well.
 */
const asksAttachment: Asks = (schema, _value, purpose, uploaded) => {
  if (uploaded.includes(purpose)) return true;
  const attachments = schema?.['x-attachments'];
  return (
    Array.isArray(attachments) && attachments.some((attachment) => isRecord(attachment) && attachment.key === purpose)
  );
};

/** Only the schemas that ask about an outdoor area have the child under the seats object. */
const asksOutdoorSeats: Asks = (schema, value) => {
  const seats = propertySchema(schema, 'seating');
  if (seats) return isRecord(seats.properties) && 'seatsOutdoor' in seats.properties;
  const filed = value.seating;
  return isRecord(filed) && 'seatsOutdoor' in filed;
};

const SECTIONS: { id: BasisSectionId; rows: RowSpec[] }[] = [
  {
    id: 'operation',
    rows: [
      {
        key: 'focus',
        field: 'businessOrientationTypes',
        labelKey: label('operation', 'focus'),
        read: multiChoice('businessOrientationTypes'),
      },
      {
        key: 'hotel-service',
        field: 'additionalScopes',
        labelKey: label('operation', 'hotel_service'),
        read: multiChoice('additionalScopes'),
      },
      {
        key: 'description',
        field: 'businessDescriptionChoice',
        labelKey: label('operation', 'description'),
        read: writtenOrAttached('businessDescriptionChoice', 'DESCRIBE', 'businessDescription', 'BUSINESS_DESCRIPTION'),
      },
      {
        key: 'focus-description',
        field: 'businessOrientationDescription',
        labelKey: label('operation', 'focus_description'),
        read: html('businessOrientationDescription'),
      },
      { key: 'serving-to', field: AUDIENCE, labelKey: label('operation', 'serving_to'), read: choice(AUDIENCE) },
      {
        key: 'fair',
        field: 'arrangesTradeFair',
        labelKey: label('operation', 'fair'),
        read: choice('arrangesTradeFair'),
      },
      {
        key: 'order',
        field: 'orderAndSobriety',
        labelKey: label('operation', 'order'),
        read: html('orderAndSobriety'),
      },
      {
        key: 'food-sales',
        field: 'hasPermanentFoodSales',
        labelKey: label('operation', 'food_sales'),
        read: choice('hasPermanentFoodSales'),
      },
      {
        key: 'brews-on-site',
        field: 'producesLowAlcoholBeerOnPremises',
        labelKey: label('operation', 'brews_on_site'),
        read: choice('producesLowAlcoholBeerOnPremises'),
      },
      {
        key: 'food-registered',
        field: 'isFoodRegistered',
        labelKey: label('operation', 'food_registered'),
        read: choice('isFoodRegistered'),
      },
      {
        key: 'self-monitoring',
        field: 'selfMonitoringProgram',
        labelKey: label('operation', 'self_monitoring'),
        read: choice('selfMonitoringProgram'),
      },
      {
        key: 'distance-sales',
        field: 'includesDistanceSelling',
        labelKey: label('operation', 'distance_sales'),
        read: choice('includesDistanceSelling'),
      },
      {
        key: 'supplier-agreement',
        field: 'hasSupplierAgreement',
        labelKey: label('operation', 'supplier_agreement'),
        read: choice('hasSupplierAgreement'),
      },
      {
        key: 'hazardous-products',
        field: 'includesParticularlyDangerousProducts',
        labelKey: label('operation', 'hazardous_products'),
        read: choice('includesParticularlyDangerousProducts'),
      },
    ],
  },
  {
    id: 'premises',
    rows: [
      {
        key: 'name',
        field: 'Name' satisfies PremisesField,
        labelKey: label('premises', 'name'),
        read: (value) => cell(text(premisesValue(value, 'Name'))),
        asks: asksPremises,
      },
      {
        key: 'contact',
        field: 'Contact' satisfies PremisesField,
        labelKey: label('premises', 'contact'),
        read: contact,
        asks: asksPremises,
      },
      {
        key: 'responsible',
        field: 'responsibleServingStaff',
        labelKey: label('premises', 'responsible'),
        read: table('responsibleServingStaff'),
      },
      {
        key: 'right-of-disposal',
        field: 'premisesRightOfUseDocuments',
        labelKey: label('premises', 'right_of_disposal'),
        read: multiChoice('premisesRightOfUseDocuments'),
      },
      {
        key: 'cooperation-agreement',
        field: 'hasCooperationAgreement',
        labelKey: label('premises', 'cooperation_agreement'),
        read: choice('hasCooperationAgreement'),
      },
      {
        key: 'visitor-arrangement',
        field: 'visitorArrangementsChoice',
        labelKey: label('premises', 'visitor_arrangement'),
        read: writtenOrAttached(
          'visitorArrangementsChoice',
          'DESCRIBE',
          'visitorArrangementsDescription',
          'VISITOR_ARRANGEMENT_DESCRIPTION'
        ),
      },
      {
        key: 'sales-site',
        field: 'salesAreaDescription',
        labelKey: label('premises', 'sales_site'),
        read: html('salesAreaDescription'),
      },
    ],
  },
  {
    id: 'serving_premises',
    rows: [
      {
        key: 'drawing',
        field: 'FLOOR_PLAN',
        labelKey: label('serving_premises', 'drawing'),
        read: attached('FLOOR_PLAN'),
        asks: asksAttachment,
      },
      {
        key: 'kitchen-drawing',
        field: 'KITCHEN_FLOOR_PLAN',
        labelKey: label('serving_premises', 'kitchen_drawing'),
        read: attached('KITCHEN_FLOOR_PLAN'),
        asks: asksAttachment,
      },
      {
        key: 'seats',
        field: 'seating',
        labelKey: label('serving_premises', 'seats'),
        read: child('seating', 'seatsIndoor'),
      },
      {
        key: 'outdoor-seats',
        field: 'seating',
        labelKey: label('serving_premises', 'outdoor_seats'),
        read: child('seating', 'seatsOutdoor'),
        asks: asksOutdoorSeats,
      },
      {
        key: 'max-persons',
        field: 'maxPersonsInPremises',
        labelKey: label('serving_premises', 'max_persons'),
        read: child('maxPersonsInPremises', 'maxPersons'),
      },
    ],
  },
  {
    id: 'serving_hours',
    rows: [
      // Permanent serving asks per audience; the groups follow what the applicant chose.
      {
        key: 'period-public',
        field: 'publicServingPeriod',
        labelKey: audienceLabel(label('serving_hours', 'period'), label('serving_hours', 'period_public')),
        read: periodWithDates('publicServingPeriod', 'publicServingPeriodDates'),
        when: servesPublic,
      },
      {
        key: 'indoor-public',
        field: 'publicServingHoursIndoor',
        labelKey: audienceLabel(label('serving_hours', 'indoor'), label('serving_hours', 'indoor_public')),
        read: timeRange('publicServingHoursIndoor'),
        when: servesPublic,
      },
      {
        key: 'outdoor-public',
        field: 'publicServingHoursOutdoor',
        labelKey: audienceLabel(label('serving_hours', 'outdoor'), label('serving_hours', 'outdoor_public')),
        read: timeRange('publicServingHoursOutdoor'),
        when: servesPublic,
      },
      {
        key: 'period-private',
        field: 'closedCompanyServingPeriod',
        labelKey: audienceLabel(label('serving_hours', 'period'), label('serving_hours', 'period_private')),
        read: periodWithDates('closedCompanyServingPeriod', 'closedCompanyServingPeriodDates'),
        when: servesPrivate,
      },
      {
        key: 'indoor-private',
        field: 'closedCompanyServingHoursIndoor',
        labelKey: audienceLabel(label('serving_hours', 'indoor'), label('serving_hours', 'indoor_private')),
        read: timeRange('closedCompanyServingHoursIndoor'),
        when: servesPrivate,
      },
      {
        key: 'outdoor-private',
        field: 'closedCompanyServingHoursOutdoor',
        labelKey: audienceLabel(label('serving_hours', 'outdoor'), label('serving_hours', 'outdoor_private')),
        read: timeRange('closedCompanyServingHoursOutdoor'),
        when: servesPrivate,
      },
      // Temporary permits: the permit's dates and one serving time.
      {
        key: 'period',
        field: 'permitPeriodDates',
        labelKey: label('serving_hours', 'period'),
        read: dateRange('permitPeriodDates'),
      },
      {
        key: 'dates-note',
        field: 'permitPeriodNotes',
        labelKey: label('serving_hours', 'dates_note'),
        read: plain('permitPeriodNotes'),
      },
      {
        key: 'time',
        field: 'dailyServingHours',
        labelKey: label('serving_hours', 'time'),
        read: timeRange('dailyServingHours'),
      },
      // Farm sales.
      {
        key: 'sales-period',
        field: 'salesPeriod',
        labelKey: label('serving_hours', 'period'),
        read: periodWithDates('salesPeriod', 'salesPeriodDates'),
      },
      {
        key: 'sales-time',
        field: 'salesHours',
        labelKey: label('serving_hours', 'sales_time'),
        read: timeRange('salesHours'),
      },
      // Tobacco: open-ended from a date, or a limited period.
      {
        key: 'tobacco-period',
        field: 'salesPeriod',
        labelKey: label('serving_hours', 'period'),
        read: (value, schema) =>
          cell(
            [
              choiceText(value, schema, 'salesPeriod'),
              text(value.salesStartDate),
              dateRangeText(value, 'salesPeriodDates'),
            ]
              .filter(Boolean)
              .join(', ') || undefined
          ),
      },
    ],
  },
  {
    id: 'serving',
    rows: [
      {
        key: 'drinks',
        field: 'beverages',
        labelKey: label('serving', 'drinks'),
        read: multiChoice('beverages'),
      },
      { key: 'food', field: 'servesFood', labelKey: label('serving', 'food'), read: choice('servesFood') },
      {
        key: 'menu',
        field: 'menuChoice',
        labelKey: label('serving', 'menu'),
        read: writtenOrAttached('menuChoice', 'DESCRIBE', 'menuDescription', 'MENU'),
      },
      {
        key: 'drinks-menu',
        field: 'drinksMenuChoice',
        labelKey: label('serving', 'drinks_menu'),
        read: writtenOrAttached('drinksMenuChoice', 'DESCRIBE', 'drinksMenuDescription', 'DRINKS_MENU'),
      },
    ],
  },
  {
    id: 'production',
    rows: [
      {
        key: 'beer',
        field: 'strongBeerLiters',
        labelKey: label('production', 'beer'),
        read: plain('strongBeerLiters'),
      },
      { key: 'wine', field: 'wineLiters', labelKey: label('production', 'wine'), read: plain('wineLiters') },
      {
        key: 'spirits',
        field: 'spiritsLiters',
        labelKey: label('production', 'spirits'),
        read: plain('spiritsLiters'),
      },
      {
        key: 'cider',
        field: 'otherFermentedBeveragesLiters',
        labelKey: label('production', 'cider'),
        read: plain('otherFermentedBeveragesLiters'),
      },
      {
        key: 'started',
        field: 'productionStartDate',
        labelKey: label('production', 'started'),
        read: plain('productionStartDate'),
      },
      {
        key: 'dependency',
        field: 'dependsOnOtherProducer',
        labelKey: label('production', 'dependency'),
        read: choice('dependsOnOtherProducer'),
      },
      {
        key: 'dependency-description',
        field: 'dependencyDescription',
        labelKey: label('production', 'dependency_description'),
        read: html('dependencyDescription'),
      },
      {
        key: 'description',
        field: 'productionDescriptionChoice',
        labelKey: label('production', 'description'),
        read: writtenOrAttached(
          'productionDescriptionChoice',
          'DESCRIBE',
          'productionDescription',
          'PRODUCTION_DESCRIPTION'
        ),
      },
    ],
  },
  {
    id: 'event',
    rows: [
      {
        key: 'type',
        field: 'eventType',
        labelKey: label('event', 'type'),
        read: plain('eventType'),
      },
      {
        key: 'guests',
        field: 'expectedGuests',
        labelKey: label('event', 'guests'),
        read: child('expectedGuests', 'count'),
      },
      {
        key: 'guest-kind',
        field: 'guestTypes',
        labelKey: label('event', 'guest_kind'),
        read: multiChoice('guestTypes'),
      },
      {
        key: 'invitation',
        field: 'guestInvitationMethod',
        labelKey: label('event', 'invitation'),
        read: html('guestInvitationMethod'),
      },
      {
        key: 'police-permit',
        field: 'hasAppliedForPolicePermit',
        labelKey: label('event', 'police_permit'),
        read: choice('hasAppliedForPolicePermit'),
      },
    ],
  },
  {
    id: 'financing',
    rows: [
      {
        key: 'sources',
        field: 'financing',
        labelKey: label('financing', 'sources'),
        read: multiChoice('financing'),
      },
      { key: 'own-funds', field: 'ownFunds', labelKey: label('financing', 'own_funds'), read: table('ownFunds') },
      { key: 'bank-loan', field: 'bankLoans', labelKey: label('financing', 'bank_loan'), read: table('bankLoans') },
      {
        key: 'private-loan',
        field: 'privateLoans',
        labelKey: label('financing', 'private_loan'),
        read: table('privateLoans'),
      },
      {
        key: 'other',
        field: 'otherFinancing',
        labelKey: label('financing', 'other'),
        read: table('otherFinancing'),
      },
      {
        key: 'notes',
        field: 'financingNotes',
        labelKey: label('financing', 'notes'),
        read: html('financingNotes'),
      },
    ],
  },
];

/** The section ids in display order, so a section can be placed even when the form gives it no rows. */
export const BASIS_SECTION_IDS: BasisSectionId[] = SECTIONS.map((section) => section.id);

/**
 * The sections of the decision basis read from the form, in display order. Without the schema
 * (not loaded, or no longer published) the answers are still shown, with their constants as they are.
 */
export const buildDecisionBasisSections = (
  value: FormValue,
  schema: RJSFSchema | null,
  uploadedPurposes: string[] = []
): BasisSection[] =>
  SECTIONS.map(({ id, rows }) => ({
    id,
    rows: rows
      .filter(
        (row) =>
          (row.asks ?? asksRootProperty)(schema, value, row.field, uploadedPurposes) && (!row.when || row.when(value))
      )
      .map((row) => ({
        key: row.key,
        labelKey: typeof row.labelKey === 'function' ? row.labelKey(value) : row.labelKey,
        labelText: row.labelKey ? undefined : text(propertySchema(schema, row.field)?.title) ?? row.field,
        cell: row.read(value, schema),
      })),
  }));
