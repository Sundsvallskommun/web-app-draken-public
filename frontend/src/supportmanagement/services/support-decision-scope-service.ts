import type { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';

import { type FormValue, servesPrivate, servesPublic, timeRangeClocks } from './support-form-value-service';

/**
 * What the handler decides on top of the application: the beverages and the serving hours the
 * permit grants. The application (errand.jsonParameters) is never written; the decided values live
 * as parameters on the decision under the group DECIDED, prefilled from the application. A key the
 * decision carries wins over the application even when its values are empty, so a handler can clear
 * a field; a key it lacks (no decision yet, or one saved before these existed) falls back to the
 * application. Support Management rejects blank values, so a time range is written with both ends
 * or with none.
 */

export const DECIDED_GROUP = 'DECIDED';

/** The beverage constants of the schemas' `alkoholdrycker`, in the schemas' order. */
export const BEVERAGES = ['STARKOL', 'VIN', 'SPRITDRYCKER', 'CIDER_ELLER_ANDRA_JASTA_ALKOHOLDRYCKER'] as const;

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
  key: string;
  /** Translation key of the field label; also the parameter's display name. */
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
    key: 'decidedServingHoursIndoorPublic',
    labelKey: label('indoor_public'),
    errandTypes: [PERMANENT],
    field: { [PERMANENT]: 'serveringstiderInomhusAllmanheten' },
    when: servesPublic,
  },
  {
    slot: 'outdoorPublic',
    key: 'decidedServingHoursOutdoorPublic',
    labelKey: label('outdoor_public'),
    errandTypes: [PERMANENT],
    field: { [PERMANENT]: 'serveringstiderUtomhusAllmanheten' },
    when: servesPublic,
  },
  {
    slot: 'indoorPrivate',
    key: 'decidedServingHoursIndoorPrivate',
    labelKey: label('indoor_private'),
    errandTypes: [PERMANENT],
    field: { [PERMANENT]: 'serveringstiderInomhusSlutetSallskap' },
    when: servesPrivate,
  },
  {
    slot: 'outdoorPrivate',
    key: 'decidedServingHoursOutdoorPrivate',
    labelKey: label('outdoor_private'),
    errandTypes: [PERMANENT],
    field: { [PERMANENT]: 'serveringstiderUtomhusSlutetSallskap' },
    when: servesPrivate,
  },
  {
    slot: 'single',
    key: 'decidedServingHours',
    labelKey: label('single'),
    errandTypes: SINGLE_SLOT_TYPES,
    field: {
      TEMPORARY_SERVING_PUBLIC: 'klockslagForServeringen',
      TEMPORARY_SERVING_PRIVATE: 'klockslagForServeringen',
      FARM_SALES: 'forsaljningstider',
    },
  },
];

export const BEVERAGES_KEY = 'decidedBeverages';
export const BEVERAGES_LABEL_KEY = 'common:decision.scope.beverages.label';

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
  beverages: Array.isArray(form?.alkoholdrycker) ? form.alkoholdrycker.map(String) : [],
  servingHours: Object.fromEntries(
    slots.map((spec) => [
      spec.slot,
      form ? timeRangeFromForm(form, errandType && spec.field[errandType]) : EMPTY_TIME_RANGE,
    ])
  ),
});

const savedValues = (parameters: Parameter[] | undefined, key: string): string[] | undefined => {
  const parameter = parameters?.find((candidate) => candidate.key === key);
  return parameter ? parameter.values ?? [] : undefined;
};

/** What a saved decision carries, key by key; a key it lacks is left undefined. */
export const scopeFromDecision = (
  parameters: Parameter[] | undefined,
  slots: SlotSpec[]
): { beverages?: string[]; servingHours: Partial<Record<ServingHoursSlot, TimeRange>> } => ({
  beverages: savedValues(parameters, BEVERAGES_KEY),
  servingHours: Object.fromEntries(
    slots.flatMap((spec) => {
      const values = savedValues(parameters, spec.key);
      return values ? [[spec.slot, { from: values[0] ?? '', to: values[1] ?? '' }]] : [];
    })
  ),
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
      saved.servingHours[spec.slot] ?? defaults.servingHours[spec.slot] ?? EMPTY_TIME_RANGE,
    ])
  ),
});

/** A range with one end only cannot be saved and is not a decision. */
export const isHalfFilled = (range: TimeRange | undefined): boolean => !!range && !!range.from !== !!range.to;

export const hasInvalidServingHours = (scope: DecisionScope): boolean =>
  Object.values(scope.servingHours).some(isHalfFilled);

export const servingHoursText = (range: TimeRange | undefined): string | undefined =>
  range?.from && range.to ? `${range.from}–${range.to}` : undefined;

/** What the decision carries for the handler's choices; every shown slot is written, empty as []. */
export const toScopeParameters = (
  scope: DecisionScope,
  slots: SlotSpec[],
  permitType: string,
  displayName: (labelKey: string) => string
): Parameter[] => [
  ...(decidesBeverages(permitType)
    ? [
        {
          key: BEVERAGES_KEY,
          displayName: displayName(BEVERAGES_LABEL_KEY),
          group: DECIDED_GROUP,
          values: scope.beverages,
        },
      ]
    : []),
  ...slots.map((spec) => {
    const range = scope.servingHours[spec.slot];
    return {
      key: spec.key,
      displayName: displayName(spec.labelKey),
      group: DECIDED_GROUP,
      values: range?.from && range.to ? [range.from, range.to] : [],
    };
  }),
];
