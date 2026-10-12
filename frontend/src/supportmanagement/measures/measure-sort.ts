import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';

/** How the list is ordered: as the measures were registered, or by who registered them. */
export type MeasureSort = 'created' | 'person';

export const measureSortOptions: readonly { value: MeasureSort; label: string }[] = [
  { value: 'created', label: 'Datum' },
  { value: 'person', label: 'Person' },
];

/** A measure without a registration time is placed after those that have one. */
const createdAt = (measure: Pick<Measure, 'created'>): number => {
  const time = measure.created ? Date.parse(measure.created) : Number.NaN;
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

/** Chronologically, oldest first. Measures registered at the same time, or without one, keep the order they came in. */
export const sortMeasuresByCreated = <T extends Pick<Measure, 'created'>>(measures: readonly T[]): T[] =>
  measures
    .map((measure, index) => ({ measure, index }))
    .sort((left, right) => {
      const [leftTime, rightTime] = [createdAt(left.measure), createdAt(right.measure)];
      return leftTime === rightTime ? left.index - right.index : leftTime - rightTime;
    })
    .map(({ measure }) => measure);

export interface MeasureGroup<T> {
  /** The account the measures were registered by, lower-cased; empty where none is recorded. */
  readonly key: string;
  /** What the person is called; undefined where nobody is recorded. */
  readonly person: string | undefined;
  readonly measures: T[];
}

/**
 * The measures of each person together, so it shows who did what: people by name, each person's measures
 * chronologically, and those nobody is recorded for last.
 */
export const groupMeasuresByPerson = <T extends Pick<Measure, 'created' | 'addedByUser'>>(
  measures: readonly T[],
  personName: (account: string | undefined) => string | undefined
): MeasureGroup<T>[] => {
  const groups = new Map<string, MeasureGroup<T>>();
  for (const measure of sortMeasuresByCreated(measures)) {
    const key = measure.addedByUser?.trim().toLowerCase() ?? '';
    const group = groups.get(key) ?? { key, person: key ? personName(measure.addedByUser) : undefined, measures: [] };
    group.measures.push(measure);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => {
    if (!left.person || !right.person) return Number(!left.person) - Number(!right.person);
    return left.person.localeCompare(right.person, 'sv');
  });
};
