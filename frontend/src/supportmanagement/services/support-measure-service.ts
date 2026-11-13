import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import dayjs from 'dayjs';

import type { SupportErrand } from './support-errand-service';

/**
 * Control points are INTERNAL measures; the action points the permit holder gets to address are EXTERNAL ones;
 * an assessed area of the premises is an OBSERVATION.
 */
export const SupportMeasureType = {
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
  OBSERVATION: 'OBSERVATION',
} as const;

export type SupportMeasureTypeName = (typeof SupportMeasureType)[keyof typeof SupportMeasureType];

export const SupportMeasureResult = {
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
  NOT_COMPLETED: 'NOT_COMPLETED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

export type SupportMeasureResultName = (typeof SupportMeasureResult)[keyof typeof SupportMeasureResult];

/**
 * The results a control point can be given, in the order the protocol shows them. A partly addressed point is not
 * among them: the protocol prints a cross for two of these and "Ej aktuellt" for the third, and has no fourth box.
 */
export const SUPPORT_MEASURE_RESULTS: { result: SupportMeasureResultName; translationKey: string }[] = [
  { result: SupportMeasureResult.COMPLETED, translationKey: 'common:inspection_protocol.result.approved' },
  { result: SupportMeasureResult.NOT_COMPLETED, translationKey: 'common:inspection_protocol.result.not_completed' },
  { result: SupportMeasureResult.NOT_APPLICABLE, translationKey: 'common:inspection_protocol.result.not_applicable' },
];

/** What an action point can end up as. The permit holder may have addressed it in part, which a control point cannot. */
export const SUPPORT_ACTION_POINT_RESULTS: { result: SupportMeasureResultName; translationKey: string }[] = [
  { result: SupportMeasureResult.COMPLETED, translationKey: 'common:action_points.result.completed' },
  {
    result: SupportMeasureResult.PARTIALLY_COMPLETED,
    translationKey: 'common:action_points.result.partially_completed',
  },
  { result: SupportMeasureResult.NOT_COMPLETED, translationKey: 'common:action_points.result.not_completed' },
  { result: SupportMeasureResult.NOT_APPLICABLE, translationKey: 'common:action_points.result.not_applicable' },
];

/** A measure as the handler edits it. `id` is missing until the row has been written; '' means no result. */
export interface SupportMeasureRow {
  id?: string;
  title: string;
  result: SupportMeasureResultName | '';
  description: string;
  /** The observations of an area, as keys joined by '|'. */
  resultText: string;
  /** The deadline as a date field, YYYY-MM-DD. Extending it is writing a later date; it cannot be taken away. */
  dueAt: string;
  goal: string;
  /** The day the measure was last changed, where that is after it was written; blank for one untouched since. */
  changedAt: string;
}

/** What a changed row is patched with; whatever is left out stays as it is. A result cannot be cleared. */
interface SupportMeasurePatch {
  title?: string;
  result?: SupportMeasureResultName;
  description?: string;
  resultText?: string;
  dueAt?: string;
  goal?: string;
}

export interface SupportMeasureChanges {
  create: {
    type: SupportMeasureTypeName;
    title: string;
    result?: SupportMeasureResultName;
    description?: string;
    resultText?: string;
    dueAt?: string;
    goal?: string;
  }[];
  update: { id: string; patch: SupportMeasurePatch }[];
  remove: string[];
}

const INSPECTION_CATEGORY = 'INSPECTION';
const ACTION_ERRAND_TYPE = 'MEASURES';

/** An action errand is the MEASURES type of the inspection category, raised from an inspection that found faults. */
export const isSupportActionErrand = (errand: Pick<SupportErrand, 'labels'> | undefined): boolean =>
  !!errand?.labels?.some((label) => label.classification === 'TYPE' && label.resourceName === ACTION_ERRAND_TYPE);

/**
 * An inspection errand is filed under the INSPECTION category and carries a protocol instead of an investigation.
 * The action errand shares the category without being an inspection, and presents itself as what it is.
 */
export const isSupportInspectionErrand = (errand: Pick<SupportErrand, 'labels'> | undefined): boolean =>
  !!errand?.labels?.some(
    (label) => label.classification === 'CATEGORY' && label.resourceName === INSPECTION_CATEGORY
  ) && !isSupportActionErrand(errand);

/** The service lists measures by id; the handler wrote them in order, so they are shown by creation time. */
export const supportMeasuresOfType = (measures: Measure[] | undefined, type: SupportMeasureTypeName): Measure[] =>
  (measures ?? [])
    .filter((measure) => measure.type === type)
    .sort((a, b) => (a.created ?? '').localeCompare(b.created ?? ''));

/** pw-alkt builds the action errand from the active action points only, and refuses to create one without them. */
export const hasSupportActionPoints = (measures: Measure[] | undefined): boolean =>
  (measures ?? []).some((measure) => measure.type === SupportMeasureType.EXTERNAL && measure.status === 'ACTIVE');

const isMeasureResult = (value: string | null | undefined): value is SupportMeasureResultName =>
  Object.values(SupportMeasureResult).some((candidate) => candidate === value);

const asDateField = (value: string | undefined): string =>
  value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : '';

const asTimestamp = (value: string): string | undefined =>
  value && dayjs(value).isValid() ? dayjs(value).startOf('day').format() : undefined;

/**
 * When the measure was last changed, where that is later than when it was written. A change to a measure leaves
 * neither a revision nor a notification in the service, so a deadline that has been moved has nothing else to go by.
 */
const changedAfterItWasWritten = (measure: Measure): string => {
  if (!measure.modified || !measure.created) return '';
  return dayjs(measure.modified).isAfter(dayjs(measure.created)) ? asDateField(measure.modified) : '';
};

const RESULTS_THAT_SETTLE_A_MEASURE: (SupportMeasureResultName | '')[] = [
  SupportMeasureResult.COMPLETED,
  SupportMeasureResult.NOT_APPLICABLE,
];

/** A deadline in the past on a point that is still to be addressed. */
export const supportMeasureIsOverdue = (row: Pick<SupportMeasureRow, 'dueAt' | 'result'>): boolean =>
  !!row.dueAt &&
  !RESULTS_THAT_SETTLE_A_MEASURE.includes(row.result) &&
  dayjs(row.dueAt).isBefore(dayjs().startOf('day'));

/** A row for a measure that has not been written yet. */
export const emptySupportMeasureRow = (title = ''): SupportMeasureRow => ({
  title,
  result: '',
  description: '',
  resultText: '',
  dueAt: '',
  goal: '',
  changedAt: '',
});

/** A result Draken does not know (written by something else) shows as none, and is kept until the handler picks one. */
export const supportMeasureRow = (measure: Measure): SupportMeasureRow => ({
  id: measure.id,
  title: measure.title ?? '',
  result: isMeasureResult(measure.result) ? measure.result : '',
  description: measure.description ?? '',
  resultText: measure.resultText ?? '',
  dueAt: asDateField(measure.dueAt),
  goal: measure.goal ?? '',
  changedAt: changedAfterItWasWritten(measure),
});

const patchOf = (before: SupportMeasureRow, row: SupportMeasureRow): SupportMeasurePatch => ({
  ...(row.title !== before.title && { title: row.title }),
  ...(row.result && row.result !== before.result && { result: row.result }),
  ...(row.description !== before.description && { description: row.description }),
  ...(row.resultText !== before.resultText && { resultText: row.resultText }),
  ...(row.dueAt && row.dueAt !== before.dueAt && { dueAt: asTimestamp(row.dueAt) }),
  ...(row.goal !== before.goal && { goal: row.goal }),
});

/** Blank rows are dropped; a saved row that was blanked or removed is deleted; a saved row is patched with what differs. */
export const supportMeasureChanges = (
  type: SupportMeasureTypeName,
  rows: SupportMeasureRow[],
  saved: SupportMeasureRow[]
): SupportMeasureChanges => {
  const kept = rows.map((row) => ({ ...row, title: row.title.trim() })).filter((row) => row.title !== '');
  const savedById = new Map(saved.map((row) => [row.id, row]));
  const keptIds = new Set(kept.map((row) => row.id));
  return {
    create: kept
      .filter((row) => !row.id)
      .map(({ title, result, description, resultText, dueAt, goal }) => ({
        type,
        title,
        ...(result && { result }),
        ...(description && { description }),
        ...(resultText && { resultText }),
        ...(dueAt && { dueAt: asTimestamp(dueAt) }),
        ...(goal && { goal }),
      })),
    update: kept.flatMap((row) => {
      const before = row.id ? savedById.get(row.id) : undefined;
      const patch = before ? patchOf(before, row) : {};
      return row.id && Object.keys(patch).length > 0 ? [{ id: row.id, patch }] : [];
    }),
    remove: saved.map((row) => row.id).filter((id): id is string => !!id && !keptIds.has(id)),
  };
};

const measuresUrl = (errandId: string, municipalityId: string): string =>
  `supportmeasures/${municipalityId}/${errandId}`;

export const getSupportMeasures = (errandId: string, municipalityId: string): Promise<Measure[]> =>
  apiService.get<Measure[]>(measuresUrl(errandId, municipalityId)).then((res) => res.data ?? []);

type SupportMeasureInput = SupportMeasureChanges['create'][number];

const createSupportMeasure = (errandId: string, municipalityId: string, input: SupportMeasureInput): Promise<Measure> =>
  apiService.post<Measure, SupportMeasureInput>(measuresUrl(errandId, municipalityId), input).then((res) => res.data);

const updateSupportMeasure = (
  errandId: string,
  municipalityId: string,
  measureId: string,
  patch: SupportMeasurePatch
): Promise<Measure> =>
  apiService
    .patch<Measure, SupportMeasurePatch>(`${measuresUrl(errandId, municipalityId)}/${measureId}`, patch)
    .then((res) => res.data);

const deleteSupportMeasure = (errandId: string, municipalityId: string, measureId: string): Promise<void> =>
  apiService.deleteRequest<void>(`${measuresUrl(errandId, municipalityId)}/${measureId}`).then(() => undefined);

/** Writes one change at a time, list by list; whoever called reads the measures again afterwards. */
export const saveSupportMeasures = async (
  errandId: string,
  municipalityId: string,
  changes: SupportMeasureChanges[]
): Promise<void> => {
  for (const list of changes) {
    for (const row of list.create) {
      await createSupportMeasure(errandId, municipalityId, row);
    }
    for (const { id, patch } of list.update) {
      await updateSupportMeasure(errandId, municipalityId, id, patch);
    }
    for (const id of list.remove) {
      await deleteSupportMeasure(errandId, municipalityId, id);
    }
  }
};

/** The file is stored on the errand and linked to the measure; the measure comes back with its attachments. */
export const uploadSupportMeasureAttachment = (
  errandId: string,
  municipalityId: string,
  measureId: string,
  file: File
): Promise<Measure> => {
  const form = new FormData();
  form.append('files', file);
  return apiService
    .post<Measure, FormData>(`${measuresUrl(errandId, municipalityId)}/${measureId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
};

/** Unlinks the attachment from the measure; the file stays on the errand. */
export const unlinkSupportMeasureAttachment = (
  errandId: string,
  municipalityId: string,
  measureId: string,
  attachmentId: string
): Promise<void> =>
  apiService
    .deleteRequest<void>(`${measuresUrl(errandId, municipalityId)}/${measureId}/attachments/${attachmentId}`)
    .then(() => undefined);
