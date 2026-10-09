import type { RJSFSchema } from '@rjsf/utils';

import { jsonParameterForSchema, schemaNameForErrand } from './support-errand-schema-service';
import type { SupportErrand } from './support-errand-service';
import {
  AUDIENCE,
  BOTH_AUDIENCES,
  dateRangeText,
  type FormValue,
  isRecord,
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

type BasisSectionId =
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

const multiChoice =
  (field: string): Reader =>
  (value, schema) => {
    const chosen = value[field];
    if (!Array.isArray(chosen) || chosen.length === 0) return undefined;
    const items = propertySchema(schema, field)?.items;
    const options = isRecord(items) ? items.oneOf : undefined;
    return cell(chosen.map((constant) => optionTitle(options, String(constant))).join(', '));
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
  const details = value.kontaktuppgifterTillServeringsstallet;
  const parts = isRecord(details) ? [details.telefonnummer, details.ePostadress, details.hemsida] : [];
  // Tobacco keeps the website at the root; it is only asked with distance sales.
  return cell([...parts, value.hemsida].map(text).filter(Boolean).join(', ') || undefined);
};

/** With one audience the plain labels suffice; with both, each group says whose hours they are. */
const audienceLabel = (plainKey: string, audienceKey: string) => (value: FormValue) =>
  value[AUDIENCE] === BOTH_AUDIENCES ? audienceKey : plainKey;

const label = (section: BasisSectionId, row: string) => `common:decision.basis.${section}.${row}`;

const asksRootProperty: Asks = (schema, value, field) => (schema ? !!propertySchema(schema, field) : field in value);

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
  const seats = propertySchema(schema, 'sittplatserILokalen');
  if (seats) return isRecord(seats.properties) && 'antalSittplatserUteservering' in seats.properties;
  const filed = value.sittplatserILokalen;
  return isRecord(filed) && 'antalSittplatserUteservering' in filed;
};

const SECTIONS: { id: BasisSectionId; rows: RowSpec[] }[] = [
  {
    id: 'operation',
    rows: [
      {
        key: 'focus',
        field: 'verksamhetensInriktning',
        labelKey: label('operation', 'focus'),
        read: multiChoice('verksamhetensInriktning'),
      },
      {
        key: 'hotel-service',
        field: 'harNi',
        labelKey: label('operation', 'hotel_service'),
        read: multiChoice('harNi'),
      },
      {
        key: 'description',
        field: 'verksamhetsbeskrivningsval',
        labelKey: label('operation', 'description'),
        read: writtenOrAttached(
          'verksamhetsbeskrivningsval',
          'JAG_VILL_SKRIVA_VERKSAMHETSBESKRIVNINGEN_I',
          'verksamhetsbeskrivning',
          'BUSINESS_DESCRIPTION'
        ),
      },
      {
        key: 'focus-description',
        field: 'beskrivVerksamhetensInriktning',
        labelKey: label('operation', 'focus_description'),
        read: html('beskrivVerksamhetensInriktning'),
      },
      { key: 'serving-to', field: AUDIENCE, labelKey: label('operation', 'serving_to'), read: choice(AUDIENCE) },
      { key: 'fair', field: 'arrangeraMassa', labelKey: label('operation', 'fair'), read: choice('arrangeraMassa') },
      {
        key: 'order',
        field: 'ordningOchNykterhet',
        labelKey: label('operation', 'order'),
        read: html('ordningOchNykterhet'),
      },
      {
        key: 'food-sales',
        field: 'stadigvarandeForsaljningAvLivsmedel',
        labelKey: label('operation', 'food_sales'),
        read: choice('stadigvarandeForsaljningAvLivsmedel'),
      },
      {
        key: 'brews-on-site',
        field: 'tillverkarFolkolPaForsaljningsstallet',
        labelKey: label('operation', 'brews_on_site'),
        read: choice('tillverkarFolkolPaForsaljningsstallet'),
      },
      {
        key: 'food-registered',
        field: 'livsmedelsregistrerad',
        labelKey: label('operation', 'food_registered'),
        read: choice('livsmedelsregistrerad'),
      },
      {
        key: 'self-monitoring',
        field: 'egenkontrollprogramFolkol',
        labelKey: label('operation', 'self_monitoring'),
        read: choice('egenkontrollprogramFolkol'),
      },
      {
        key: 'distance-sales',
        field: 'bedriverAvenDistansforsaljning',
        labelKey: label('operation', 'distance_sales'),
        read: choice('bedriverAvenDistansforsaljning'),
      },
      {
        key: 'supplier-agreement',
        field: 'avtalMedTillverkareEllerPartihandlare',
        labelKey: label('operation', 'supplier_agreement'),
        read: choice('avtalMedTillverkareEllerPartihandlare'),
      },
      {
        key: 'hazardous-products',
        field: 'omfattarSarskiltFarligaProdukter',
        labelKey: label('operation', 'hazardous_products'),
        read: choice('omfattarSarskiltFarligaProdukter'),
      },
    ],
  },
  {
    id: 'premises',
    rows: [
      {
        key: 'name',
        field: 'serveringsstalletsNamn',
        labelKey: label('premises', 'name'),
        read: plain('serveringsstalletsNamn'),
      },
      {
        key: 'contact',
        field: 'kontaktuppgifterTillServeringsstallet',
        labelKey: label('premises', 'contact'),
        read: contact,
      },
      {
        key: 'responsible',
        field: 'serveringsansvarigPersonal',
        labelKey: label('premises', 'responsible'),
        read: table('serveringsansvarigPersonal'),
      },
      {
        key: 'right-of-disposal',
        field: 'forfoganderattLokal',
        labelKey: label('premises', 'right_of_disposal'),
        read: multiChoice('forfoganderattLokal'),
      },
      {
        key: 'cooperation-agreement',
        field: 'harSamarbetsavtal',
        labelKey: label('premises', 'cooperation_agreement'),
        read: choice('harSamarbetsavtal'),
      },
      {
        key: 'visitor-arrangement',
        field: 'besoksarrangemang',
        labelKey: label('premises', 'visitor_arrangement'),
        read: writtenOrAttached(
          'besoksarrangemang',
          'JAG_VILL_BESKRIVA_BESOKSARRANGEMANGET',
          'beskrivBesoksarrangemanget',
          'VISITOR_ARRANGEMENT_DESCRIPTION'
        ),
      },
      {
        key: 'sales-site',
        field: 'beskrivForsaljningsplats',
        labelKey: label('premises', 'sales_site'),
        read: html('beskrivForsaljningsplats'),
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
        field: 'sittplatserILokalen',
        labelKey: label('serving_premises', 'seats'),
        read: child('sittplatserILokalen', 'antalSittplatserInomhus'),
      },
      {
        key: 'outdoor-seats',
        field: 'sittplatserILokalen',
        labelKey: label('serving_premises', 'outdoor_seats'),
        read: child('sittplatserILokalen', 'antalSittplatserUteservering'),
        asks: asksOutdoorSeats,
      },
      {
        key: 'max-persons',
        field: 'maximaltAntalPersonerILokalen',
        labelKey: label('serving_premises', 'max_persons'),
        read: child('maximaltAntalPersonerILokalen', 'antalPersoner'),
      },
    ],
  },
  {
    id: 'serving_hours',
    rows: [
      // Permanent serving asks per audience; the groups follow what the applicant chose.
      {
        key: 'period-public',
        field: 'serveringsperiodForAllmanheten',
        labelKey: audienceLabel(label('serving_hours', 'period'), label('serving_hours', 'period_public')),
        read: periodWithDates('serveringsperiodForAllmanheten', 'periodServeringAllmanheten'),
        when: servesPublic,
      },
      {
        key: 'indoor-public',
        field: 'serveringstiderInomhusAllmanheten',
        labelKey: audienceLabel(label('serving_hours', 'indoor'), label('serving_hours', 'indoor_public')),
        read: timeRange('serveringstiderInomhusAllmanheten'),
        when: servesPublic,
      },
      {
        key: 'outdoor-public',
        field: 'serveringstiderUtomhusAllmanheten',
        labelKey: audienceLabel(label('serving_hours', 'outdoor'), label('serving_hours', 'outdoor_public')),
        read: timeRange('serveringstiderUtomhusAllmanheten'),
        when: servesPublic,
      },
      {
        key: 'period-private',
        field: 'serveringsperiodForSlutetSallskap',
        labelKey: audienceLabel(label('serving_hours', 'period'), label('serving_hours', 'period_private')),
        read: periodWithDates('serveringsperiodForSlutetSallskap', 'periodServeringSlutetSallskap'),
        when: servesPrivate,
      },
      {
        key: 'indoor-private',
        field: 'serveringstiderInomhusSlutetSallskap',
        labelKey: audienceLabel(label('serving_hours', 'indoor'), label('serving_hours', 'indoor_private')),
        read: timeRange('serveringstiderInomhusSlutetSallskap'),
        when: servesPrivate,
      },
      {
        key: 'outdoor-private',
        field: 'serveringstiderUtomhusSlutetSallskap',
        labelKey: audienceLabel(label('serving_hours', 'outdoor'), label('serving_hours', 'outdoor_private')),
        read: timeRange('serveringstiderUtomhusSlutetSallskap'),
        when: servesPrivate,
      },
      // Temporary permits: the permit's dates and one serving time.
      {
        key: 'period',
        field: 'angeMellanVilkaDatumDetTillfalliga',
        labelKey: label('serving_hours', 'period'),
        read: dateRange('angeMellanVilkaDatumDetTillfalliga'),
      },
      {
        key: 'dates-note',
        field: 'ovrigaUppgifterGallandeDatum',
        labelKey: label('serving_hours', 'dates_note'),
        read: plain('ovrigaUppgifterGallandeDatum'),
      },
      {
        key: 'time',
        field: 'klockslagForServeringen',
        labelKey: label('serving_hours', 'time'),
        read: timeRange('klockslagForServeringen'),
      },
      // Farm sales.
      {
        key: 'sales-period',
        field: 'forsaljningsperiod',
        labelKey: label('serving_hours', 'period'),
        read: periodWithDates('forsaljningsperiod', 'angePeriodForForsaljning'),
      },
      {
        key: 'sales-time',
        field: 'forsaljningstider',
        labelKey: label('serving_hours', 'sales_time'),
        read: timeRange('forsaljningstider'),
      },
      // Tobacco: open-ended from a date, or a limited period.
      {
        key: 'tobacco-period',
        field: 'tidsperiodForForsaljningen',
        labelKey: label('serving_hours', 'period'),
        read: (value, schema) =>
          cell(
            [
              choiceText(value, schema, 'tidsperiodForForsaljningen'),
              text(value.startdatumForsaljning),
              dateRangeText(value, 'periodTidsbegransadForsaljning'),
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
        field: 'alkoholdrycker',
        labelKey: label('serving', 'drinks'),
        read: multiChoice('alkoholdrycker'),
      },
      { key: 'food', field: 'serverasMat', labelKey: label('serving', 'food'), read: choice('serverasMat') },
      {
        key: 'menu',
        field: 'menyval',
        labelKey: label('serving', 'menu'),
        read: writtenOrAttached('menyval', 'JAG_VILL_BESKRIVA', 'menyBeskrivning', 'MENU'),
      },
      {
        key: 'drinks-menu',
        field: 'dryckesmenyval',
        labelKey: label('serving', 'drinks_menu'),
        read: writtenOrAttached('dryckesmenyval', 'JAG_VILL_BESKRIVA', 'dryckesmeny', 'DRINKS_MENU'),
      },
    ],
  },
  {
    id: 'production',
    rows: [
      { key: 'beer', field: 'literStarkol', labelKey: label('production', 'beer'), read: plain('literStarkol') },
      { key: 'wine', field: 'literVin', labelKey: label('production', 'wine'), read: plain('literVin') },
      {
        key: 'spirits',
        field: 'literSpritdrycker',
        labelKey: label('production', 'spirits'),
        read: plain('literSpritdrycker'),
      },
      { key: 'cider', field: 'literCider', labelKey: label('production', 'cider'), read: plain('literCider') },
      {
        key: 'started',
        field: 'produktionenStartade',
        labelKey: label('production', 'started'),
        read: plain('produktionenStartade'),
      },
      {
        key: 'dependency',
        field: 'beroendeTillAnnanTillverkare',
        labelKey: label('production', 'dependency'),
        read: choice('beroendeTillAnnanTillverkare'),
      },
      {
        key: 'dependency-description',
        field: 'beskrivBeroende',
        labelKey: label('production', 'dependency_description'),
        read: html('beskrivBeroende'),
      },
      {
        key: 'description',
        field: 'produktionsbeskrivningsval',
        labelKey: label('production', 'description'),
        read: writtenOrAttached(
          'produktionsbeskrivningsval',
          'JAG_VILL_BESKRIVA',
          'produktionsbeskrivning',
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
        field: 'vadArDetForTypAvTillstallning',
        labelKey: label('event', 'type'),
        read: plain('vadArDetForTypAvTillstallning'),
      },
      {
        key: 'guests',
        field: 'beraknatAntalGaster',
        labelKey: label('event', 'guests'),
        read: child('beraknatAntalGaster', 'antal'),
      },
      { key: 'guest-kind', field: 'gaster', labelKey: label('event', 'guest_kind'), read: multiChoice('gaster') },
      {
        key: 'invitation',
        field: 'hurHarGasternaBjuditsIn',
        labelKey: label('event', 'invitation'),
        read: html('hurHarGasternaBjuditsIn'),
      },
      {
        key: 'police-permit',
        field: 'finnsPolistillstand',
        labelKey: label('event', 'police_permit'),
        read: choice('finnsPolistillstand'),
      },
    ],
  },
  {
    id: 'financing',
    rows: [
      {
        key: 'sources',
        field: 'finansiering',
        labelKey: label('financing', 'sources'),
        read: multiChoice('finansiering'),
      },
      { key: 'own-funds', field: 'egnaMedel', labelKey: label('financing', 'own_funds'), read: table('egnaMedel') },
      { key: 'bank-loan', field: 'banklan', labelKey: label('financing', 'bank_loan'), read: table('banklan') },
      {
        key: 'private-loan',
        field: 'privatlan',
        labelKey: label('financing', 'private_loan'),
        read: table('privatlan'),
      },
      {
        key: 'other',
        field: 'annanFinansiering',
        labelKey: label('financing', 'other'),
        read: table('annanFinansiering'),
      },
      {
        key: 'notes',
        field: 'ovrigaUpplysningarFinansiering',
        labelKey: label('financing', 'notes'),
        read: html('ovrigaUpplysningarFinansiering'),
      },
    ],
  },
];

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
