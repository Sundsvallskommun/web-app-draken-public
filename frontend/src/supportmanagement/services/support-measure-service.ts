import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import type { SupportErrand } from './support-errand-service';

/** Control points are INTERNAL measures; the action points the permit holder gets to address are EXTERNAL ones. */
export const SupportMeasureType = {
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
} as const;

export type SupportMeasureTypeName = (typeof SupportMeasureType)[keyof typeof SupportMeasureType];

export const SupportMeasureResult = {
  COMPLETED: 'COMPLETED',
  NOT_COMPLETED: 'NOT_COMPLETED',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
} as const;

export type SupportMeasureResultName = (typeof SupportMeasureResult)[keyof typeof SupportMeasureResult];

/** The results a handler can set, in the order the protocol shows them. */
export const SUPPORT_MEASURE_RESULTS: { result: SupportMeasureResultName; translationKey: string }[] = [
  { result: SupportMeasureResult.COMPLETED, translationKey: 'common:inspection_protocol.result.approved' },
  { result: SupportMeasureResult.NOT_COMPLETED, translationKey: 'common:inspection_protocol.result.not_completed' },
  { result: SupportMeasureResult.NOT_APPLICABLE, translationKey: 'common:inspection_protocol.result.not_applicable' },
];

/** A measure as the handler edits it. `id` is missing until the row has been written; '' means no result. */
export interface SupportMeasureRow {
  id?: string;
  title: string;
  result: SupportMeasureResultName | '';
  description: string;
}

/** What a changed row is patched with; whatever is left out stays as it is. A result cannot be cleared. */
interface SupportMeasurePatch {
  title?: string;
  result?: SupportMeasureResultName;
  description?: string;
}

export interface SupportMeasureChanges {
  create: { type: SupportMeasureTypeName; title: string; result?: SupportMeasureResultName; description?: string }[];
  update: { id: string; patch: SupportMeasurePatch }[];
  remove: string[];
}

const INSPECTION_CATEGORY = 'INSPECTION';

/** An inspection errand is filed under the INSPECTION category and carries a protocol instead of an investigation. */
export const isSupportInspectionErrand = (errand: Pick<SupportErrand, 'labels'> | undefined): boolean =>
  !!errand?.labels?.some((label) => label.classification === 'CATEGORY' && label.resourceName === INSPECTION_CATEGORY);

/** The service lists measures by id; the handler wrote them in order, so they are shown by creation time. */
export const supportMeasuresOfType = (measures: Measure[] | undefined, type: SupportMeasureTypeName): Measure[] =>
  (measures ?? [])
    .filter((measure) => measure.type === type)
    .sort((a, b) => (a.created ?? '').localeCompare(b.created ?? ''));

const isMeasureResult = (value: string | null | undefined): value is SupportMeasureResultName =>
  SUPPORT_MEASURE_RESULTS.some((candidate) => candidate.result === value);

/** A result Draken does not know (written by something else) shows as none, and is kept until the handler picks one. */
export const supportMeasureRow = (measure: Measure): SupportMeasureRow => ({
  id: measure.id,
  title: measure.title ?? '',
  result: isMeasureResult(measure.result) ? measure.result : '',
  description: measure.description ?? '',
});

const patchOf = (before: SupportMeasureRow, row: SupportMeasureRow): SupportMeasurePatch => ({
  ...(row.title !== before.title && { title: row.title }),
  ...(row.result && row.result !== before.result && { result: row.result }),
  ...(row.description !== before.description && { description: row.description }),
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
      .map(({ title, result, description }) => ({
        type,
        title,
        ...(result && { result }),
        ...(description && { description }),
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
