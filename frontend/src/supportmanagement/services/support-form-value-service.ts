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

/** Whether a multi-choice field holds the constant. */
export const hasChosen = (value: FormValue, field: string, constant: string): boolean => {
  const chosen = value[field];
  return Array.isArray(chosen) && chosen.includes(constant);
};

export const dateRangeText = (value: FormValue, field: string): string | undefined => {
  const range = value[field];
  if (!isRecord(range)) return undefined;
  const from = text(range.startDate);
  const to = text(range.endDate);
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

export const timeRangeText = (value: FormValue, field: string): string | undefined => {
  const range = value[field];
  if (!isRecord(range)) return undefined;
  const from = clock(range.startTime);
  const to = clock(range.endTime);
  return from || to ? `${from ?? ''}–${to ?? ''}` : undefined;
};

export const AUDIENCE = 'serveringTillAllmanhetenEllerSlutetSallskap';
export const BOTH_AUDIENCES = 'BADE_TILL_ALLMANHETEN_OCH_TILL';
export const servesPublic = (value: FormValue): boolean =>
  value[AUDIENCE] === 'ENBART_TILL_ALLMANHETEN' || value[AUDIENCE] === BOTH_AUDIENCES;
export const servesPrivate = (value: FormValue): boolean =>
  value[AUDIENCE] === 'ENBART_TILL_SLUTET_SALLSKAP' || value[AUDIENCE] === BOTH_AUDIENCES;
