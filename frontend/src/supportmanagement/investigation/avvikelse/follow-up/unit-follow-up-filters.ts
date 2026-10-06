import type { FollowUpErrandRow, FollowUpMeasureRow, FollowUpOption, FollowUpRows } from './unit-follow-up-rows';

/**
 * The follow-up's filters. Every list is a set of chosen values, empty meaning "all"; a risk value is one
 * value or empty. The period is not here: it decides what the BFF reads, while these narrow what is shown.
 */
export interface UnitFollowUpFilters {
  readonly reportTypes: readonly string[];
  readonly unitQuery: string;
  readonly categories: readonly string[];
  readonly subcategories: readonly string[];
  readonly causeAreas: readonly string[];
  readonly legalBases: readonly string[];
  readonly ivoNotification: readonly string[];
  readonly policeReport: readonly string[];
  readonly statuses: readonly string[];
  readonly riskValueHsl: string;
  readonly riskValueSolLss: string;
  readonly measureTypes: readonly string[];
  readonly measureStatuses: readonly string[];
  readonly effects: readonly string[];
}

export const EMPTY_UNIT_FOLLOW_UP_FILTERS: UnitFollowUpFilters = Object.freeze({
  reportTypes: [],
  unitQuery: '',
  categories: [],
  subcategories: [],
  causeAreas: [],
  legalBases: [],
  ivoNotification: [],
  policeReport: [],
  statuses: [],
  riskValueHsl: '',
  riskValueSolLss: '',
  measureTypes: [],
  measureStatuses: [],
  effects: [],
});

export const hasActiveFollowUpFilters = (filters: UnitFollowUpFilters): boolean =>
  Object.values(filters).some((value) => (Array.isArray(value) ? value.length > 0 : value !== ''));

const anyChosen = (chosen: readonly string[], options: readonly (FollowUpOption | undefined)[]): boolean =>
  chosen.length === 0 || options.some((option) => option !== undefined && chosen.includes(option.value));

const riskMatches = (chosen: string, value: number | undefined): boolean => chosen === '' || value === Number(chosen);

export const matchesFollowUpErrandFilters = (row: FollowUpErrandRow, filters: UnitFollowUpFilters): boolean =>
  anyChosen(filters.reportTypes, [row.reportType]) &&
  (filters.unitQuery.trim() === '' ||
    row.unit.toLocaleLowerCase('sv').includes(filters.unitQuery.trim().toLocaleLowerCase('sv'))) &&
  anyChosen(filters.categories, row.categories) &&
  anyChosen(filters.subcategories, row.subcategories) &&
  anyChosen(filters.causeAreas, row.causeAreas) &&
  anyChosen(filters.legalBases, row.legalBases) &&
  anyChosen(filters.ivoNotification, [row.ivoNotification]) &&
  anyChosen(filters.policeReport, [row.policeReport]) &&
  anyChosen(filters.statuses, [row.status]) &&
  riskMatches(filters.riskValueHsl, row.riskValueHsl) &&
  riskMatches(filters.riskValueSolLss, row.riskValueSolLss);

/** A measure is shown when its errand passes the errand filters and the measure passes its own. */
export const matchesFollowUpMeasureFilters = (row: FollowUpMeasureRow, filters: UnitFollowUpFilters): boolean =>
  matchesFollowUpErrandFilters(row.errand, filters) &&
  anyChosen(filters.measureTypes, [row.type]) &&
  anyChosen(filters.measureStatuses, [row.status]) &&
  anyChosen(filters.effects, [row.effect]);

/** The distinct options among the values, by name. */
export const distinctFollowUpOptions = (values: readonly (FollowUpOption | undefined)[]): FollowUpOption[] =>
  [
    ...new Map(
      values.filter((value): value is FollowUpOption => value !== undefined).map((value) => [value.value, value])
    ).values(),
  ].sort((left, right) => left.label.localeCompare(right.label, 'sv'));

export interface FollowUpFilterOptions {
  readonly reportTypes: FollowUpOption[];
  readonly categories: FollowUpOption[];
  readonly subcategories: FollowUpOption[];
  readonly causeAreas: FollowUpOption[];
  readonly legalBases: FollowUpOption[];
  readonly statuses: FollowUpOption[];
  readonly measureTypes: FollowUpOption[];
}

/**
 * What each filter offers: the values the read errands and measures carry. Cause areas also offer every
 * area the schema names, so an area nobody has reported yet can still be looked for.
 */
export const followUpFilterOptions = (
  rows: FollowUpRows,
  causeAreaTitles: ReadonlyMap<string, string>
): FollowUpFilterOptions => ({
  reportTypes: distinctFollowUpOptions(rows.errands.map((row) => row.reportType)),
  categories: distinctFollowUpOptions(rows.errands.flatMap((row) => row.categories)),
  subcategories: distinctFollowUpOptions(rows.errands.flatMap((row) => row.subcategories)),
  causeAreas: distinctFollowUpOptions([
    ...[...causeAreaTitles].map(([value, label]) => ({ value, label })),
    ...rows.errands.flatMap((row) => row.causeAreas),
  ]),
  legalBases: distinctFollowUpOptions(rows.errands.flatMap((row) => row.legalBases)),
  statuses: distinctFollowUpOptions(rows.errands.map((row) => row.status)),
  measureTypes: distinctFollowUpOptions(rows.measures.map((row) => row.type)),
});
