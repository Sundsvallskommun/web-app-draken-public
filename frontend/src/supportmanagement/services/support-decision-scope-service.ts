import { type FormValue, isRecord, servesPrivate, servesPublic, timeRangeClocks } from './support-form-value-service';
import { type JsonObject, stringAt } from './support-json-parameter-service';

/**
 * What the handler decides on top of the application: the beverages and the serving hours the
 * permit grants. The application (errand.jsonParameters) is never written; the decided values live
 * in the decision's JSON as `beverages` and `servingHours`, prefilled from the application. A list
 * the decision carries wins over the application even when it is empty, so a handler can clear a
 * field; a decision without the list falls back to the application. A time range is written with
 * both ends or not at all.
 */

/**
 * The beverage constants of the schemas' `beverages`, in the schemas' order. A preparation is not a
 * beverage in the law, but it is granted in the same list, so it rides along as the last constant.
 */
export const BEVERAGES = [
  'STRONG_BEER',
  'WINE',
  'SPIRITS',
  'OTHER_FERMENTED_BEVERAGES',
  'ALCOHOLIC_BEVERAGE_LIKE_PREPARATIONS',
] as const;

export type ServingHoursSlot = 'indoorPublic' | 'outdoorPublic' | 'indoorPrivate' | 'outdoorPrivate' | 'single';

/** HH:mm, or '' while unset. */
export interface TimeRange {
  from: string;
  to: string;
}

export interface DecisionScope {
  beverages: string[];
  servingHours: Partial<Record<ServingHoursSlot, TimeRange>>;
}

export interface SlotSpec {
  slot: ServingHoursSlot;
  /** Translation key of the field label. */
  labelKey: string;
  /** The errand types (most specific label resourceName) that get the slot. */
  errandTypes: string[];
  /** The application field the slot is prefilled from, by errand type. */
  field: Record<string, string>;
  /** Whether the application calls for the slot; without an application every slot of the type shows. */
  when?: (form: FormValue) => boolean;
}

const PERMANENT = 'PERMANENT_SERVING';
const SINGLE_SLOT_TYPES = ['TEMPORARY_SERVING_PUBLIC', 'TEMPORARY_SERVING_PRIVATE', 'FARM_SALES'];

const label = (name: string) => `common:decision.scope.serving_hours.${name}`;

/** The slots the decision can carry, in display order. Only here do decision keys meet schema keys. */
export const SERVING_HOURS_SLOTS: SlotSpec[] = [
  {
    slot: 'indoorPublic',
    labelKey: label('indoor_public'),
    errandTypes: [PERMANENT],
    field: { [PERMANENT]: 'publicServingHoursIndoor' },
    when: servesPublic,
  },
  {
    slot: 'outdoorPublic',
    labelKey: label('outdoor_public'),
    errandTypes: [PERMANENT],
    field: { [PERMANENT]: 'publicServingHoursOutdoor' },
    when: servesPublic,
  },
  {
    slot: 'indoorPrivate',
    labelKey: label('indoor_private'),
    errandTypes: [PERMANENT],
    field: { [PERMANENT]: 'closedCompanyServingHoursIndoor' },
    when: servesPrivate,
  },
  {
    slot: 'outdoorPrivate',
    labelKey: label('outdoor_private'),
    errandTypes: [PERMANENT],
    field: { [PERMANENT]: 'closedCompanyServingHoursOutdoor' },
    when: servesPrivate,
  },
  {
    slot: 'single',
    labelKey: label('single'),
    errandTypes: SINGLE_SLOT_TYPES,
    field: {
      TEMPORARY_SERVING_PUBLIC: 'dailyServingHours',
      TEMPORARY_SERVING_PRIVATE: 'dailyServingHours',
      FARM_SALES: 'salesHours',
    },
  },
];

export const BEVERAGES_LABEL_KEY = 'common:decision.scope.beverages.label';

/** Where on the premises and for whom each slot's hours apply, as the permit's servingHours say it. */
const SLOT_PLACES: Record<ServingHoursSlot, { audience?: string; location?: string }> = {
  indoorPublic: { audience: 'PUBLIC', location: 'INDOOR' },
  outdoorPublic: { audience: 'PUBLIC', location: 'OUTDOOR' },
  indoorPrivate: { audience: 'CLOSED_COMPANY', location: 'INDOOR' },
  outdoorPrivate: { audience: 'CLOSED_COMPANY', location: 'OUTDOOR' },
  single: {},
};

const SLOTS = Object.keys(SLOT_PLACES) as ServingHoursSlot[];

/** The slot a servingHours entry of the decision stands for. */
export const servingHoursSlotOf = (entry: JsonObject): ServingHoursSlot | undefined =>
  SLOTS.find((slot) => SLOT_PLACES[slot].audience === entry.audience && SLOT_PLACES[slot].location === entry.location);

const EMPTY_TIME_RANGE: TimeRange = { from: '', to: '' };

const SERVING_PERMIT = 'SERVERINGSTILLSTAND';

/** Beverages are decided on every serving permit, whatever the application asked. */
export const decidesBeverages = (permitType: string): boolean => permitType === SERVING_PERMIT;

/** The slots an errand type gets, narrowed to the audiences applied for when there is an application. */
export const servingHoursSlotsFor = (errandType: string | undefined, form: FormValue | undefined): SlotSpec[] =>
  SERVING_HOURS_SLOTS.filter(
    (spec) => !!errandType && spec.errandTypes.includes(errandType) && (!form || !spec.when || spec.when(form))
  );

const timeRangeFromForm = (form: FormValue, field: string | undefined): TimeRange => {
  const clocks = field ? timeRangeClocks(form, field) : undefined;
  return { from: clocks?.from ?? '', to: clocks?.to ?? '' };
};

/** What the application asked for, as the starting point of the decision. */
export const scopeFromForm = (
  form: FormValue | undefined,
  errandType: string | undefined,
  slots: SlotSpec[]
): DecisionScope => ({
  beverages: Array.isArray(form?.beverages) ? form.beverages.map(String) : [],
  servingHours: Object.fromEntries(
    slots.map((spec) => [
      spec.slot,
      form ? timeRangeFromForm(form, errandType && spec.field[errandType]) : EMPTY_TIME_RANGE,
    ])
  ),
});

/** What a saved decision's JSON carries; a list it lacks is left undefined, and a slot it lacks has no hours. */
export const scopeFromDecision = (
  json: JsonObject | undefined
): { beverages?: string[]; servingHours?: Partial<Record<ServingHoursSlot, TimeRange>> } => ({
  beverages: Array.isArray(json?.beverages)
    ? json.beverages.filter((beverage): beverage is string => typeof beverage === 'string')
    : undefined,
  servingHours: Array.isArray(json?.servingHours)
    ? Object.fromEntries(
        json.servingHours.filter(isRecord).flatMap((entry) => {
          const slot = servingHoursSlotOf(entry);
          return slot ? [[slot, { from: stringAt(entry.from) ?? '', to: stringAt(entry.to) ?? '' }]] : [];
        })
      )
    : undefined,
});

/** The saved value where the decision has one, the application's elsewhere. */
export const resolveScope = (
  saved: ReturnType<typeof scopeFromDecision>,
  defaults: DecisionScope,
  slots: SlotSpec[]
): DecisionScope => ({
  beverages: saved.beverages ?? defaults.beverages,
  servingHours: Object.fromEntries(
    slots.map((spec) => [
      spec.slot,
      (saved.servingHours ? saved.servingHours[spec.slot] : defaults.servingHours[spec.slot]) ?? EMPTY_TIME_RANGE,
    ])
  ),
});

/** A range with one end only cannot be saved and is not a decision. */
export const isHalfFilled = (range: TimeRange | undefined): boolean => !!range && !!range.from !== !!range.to;

export const hasInvalidServingHours = (scope: DecisionScope): boolean =>
  Object.values(scope.servingHours).some(isHalfFilled);

export const servingHoursText = (range: TimeRange | undefined): string | undefined =>
  range?.from && range.to ? `${range.from}–${range.to}` : undefined;

const CLOCK_TIME = /^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$/;

/** What the decision's JSON carries for the handler's choices; a shown slot without both ends is left out. */
export const toScopeJson = (
  scope: DecisionScope,
  permitType: string
): { beverages?: string[]; servingHours?: JsonObject[] } => ({
  beverages: decidesBeverages(permitType) ? scope.beverages : undefined,
  servingHours:
    Object.keys(scope.servingHours).length > 0
      ? SLOTS.flatMap((slot) => {
          const range = scope.servingHours[slot];
          return range && CLOCK_TIME.test(range.from) && CLOCK_TIME.test(range.to)
            ? [{ ...SLOT_PLACES[slot], from: range.from, to: range.to }]
            : [];
        })
      : undefined,
});
