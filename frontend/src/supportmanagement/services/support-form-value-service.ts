import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/**
 * Primitives for reading the AoT form answers (errand.jsonParameters value) by key. Shared by what
 * shows the answers (the decision basis) and what sends them on (the decision parameters), so the
 * two agree on how a key is read without depending on each other.
 */

export type FormValue = Record<string, unknown>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const text = (value: unknown): string | undefined => {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

/** The text of a property under an object-valued field. */
export const childText = (value: FormValue, field: string, name: string): string | undefined => {
  const object = value[field];
  return isRecord(object) ? text(object[name]) : undefined;
};

export const dateRangeText = (value: FormValue, field: string): string | undefined => {
  const range = value[field];
  if (!isRecord(range)) return undefined;
  const from = text(range.fromDate);
  const to = text(range.toDate);
  return from || to ? `${from ?? ''} – ${to ?? ''}` : undefined;
};

/**
 * Katla stores `format: time` answers as HH:mm:ssZ and other times as typed; the decision shows
 * HH:mm. The offset is the filer's browser offset put on a wall-clock time, so it is left unparsed:
 * with a `Z` token dayjs would convert to the viewer's zone and an answer filed in summer would show
 * an hour early in winter.
 */
const clock = (value: unknown): string | undefined => {
  const time = dayjs(text(value), ['HH:mm:ss', 'HH:mm']);
  return time.isValid() ? time.format('HH:mm') : undefined;
};

/** The HH:mm ends of a time-range field; undefined when neither end was answered. */
export const timeRangeClocks = (value: FormValue, field: string): { from?: string; to?: string } | undefined => {
  const range = value[field];
  if (!isRecord(range)) return undefined;
  const from = clock(range.from);
  const to = clock(range.to);
  return from || to ? { from, to } : undefined;
};

export const timeRangeText = (value: FormValue, field: string): string | undefined => {
  const range = timeRangeClocks(value, field);
  return range && `${range.from ?? ''}–${range.to ?? ''}`;
};

export const AUDIENCE = 'servingAudience';
export const BOTH_AUDIENCES = 'PUBLIC_AND_CLOSED_COMPANY';
export const servesPublic = (value: FormValue): boolean =>
  value[AUDIENCE] === 'PUBLIC' || value[AUDIENCE] === BOTH_AUDIENCES;
export const servesPrivate = (value: FormValue): boolean =>
  value[AUDIENCE] === 'CLOSED_COMPANY' || value[AUDIENCE] === BOTH_AUDIENCES;

/** Alcohol schemas name the premises `premises*`, tobacco schemas `pointOfSale*`. */
export const PREMISES_PREFIXES = ['premises', 'pointOfSale'] as const;

export type PremisesField = 'Name' | 'Address' | 'Contact' | 'AddressSameAsCompany';

export const premisesValue = (value: FormValue | undefined, field: PremisesField): unknown =>
  value && PREMISES_PREFIXES.map((prefix) => value[`${prefix}${field}`]).find((answer) => answer !== undefined);
