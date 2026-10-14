import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import type { SupportErrand } from './support-errand-service';

interface SupportMeasureInput {
  type: string;
  title: string;
  description?: string;
  result?: string;
}

/** The fields a measure can be updated with; whatever is left out stays as it is. */
export interface SupportMeasurePatch {
  title?: string;
  description?: string;
  result?: string | null;
}

/** A row in the list. `id` is missing until the row has been saved; the protocol also carries its result and note. */
export interface SupportMeasureRow {
  id?: string;
  title: string;
  result?: string;
  description?: string;
}

export interface SupportMeasureChanges {
  create: Omit<SupportMeasureRow, 'id'>[];
  update: { id: string; title: string }[];
  remove: string[];
}

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

/** What the protocol edits on a measure: the result and the note. '' means no result. */
export interface SupportMeasureProtocolFields {
  result: SupportMeasureResultName | '';
  description: string;
}

const measuresUrl = (errandId: string, municipalityId: string): string =>
  `supportmeasures/${municipalityId}/${errandId}`;

export const getSupportMeasures = (errandId: string, municipalityId: string): Promise<Measure[]> =>
  apiService.get<Measure[]>(measuresUrl(errandId, municipalityId)).then((res) => res.data ?? []);

const createSupportMeasure = (errandId: string, municipalityId: string, input: SupportMeasureInput): Promise<Measure> =>
  apiService.post<Measure, SupportMeasureInput>(measuresUrl(errandId, municipalityId), input).then((res) => res.data);

export const updateSupportMeasure = (
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

/** Control points are INTERNAL measures; the action points the owner gets to address are EXTERNAL ones. */
export const SupportMeasureType = {
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL',
} as const;

export type SupportMeasureTypeName = (typeof SupportMeasureType)[keyof typeof SupportMeasureType];

const INSPECTION_CATEGORY = 'INSPECTION';

/** An inspection errand is filed under the INSPECTION category and carries a protocol instead of an investigation. */
export const isSupportInspectionErrand = (errand: Pick<SupportErrand, 'labels'> | undefined): boolean =>
  !!errand?.labels?.some((label) => label.classification === 'CATEGORY' && label.resourceName === INSPECTION_CATEGORY);

/** The service lists measures by id; the handler wrote them in order, so they are shown by creation time. */
export const supportMeasuresOfType = (measures: Measure[] | undefined, type: SupportMeasureTypeName): Measure[] =>
  (measures ?? [])
    .filter((measure) => measure.type === type)
    .sort((a, b) => (a.created ?? '').localeCompare(b.created ?? ''));

export const supportMeasureRows = (measures: Measure[] | undefined): SupportMeasureRow[] =>
  (measures ?? []).map((measure) => ({ id: measure.id, title: measure.title ?? '' }));

/** Blank rows are dropped; a saved row that was blanked or removed is deleted. */
export const supportMeasureChanges = (rows: SupportMeasureRow[], saved: Measure[]): SupportMeasureChanges => {
  const kept = rows.map((row) => ({ ...row, title: row.title.trim() })).filter((row) => row.title !== '');
  const savedById = new Map(saved.map((measure) => [measure.id, measure]));
  const keptIds = new Set(kept.map((row) => row.id));
  return {
    create: kept
      .filter((row) => !row.id)
      .map(({ title, result, description }) => ({
        title,
        ...(result && { result }),
        ...(description && { description }),
      })),
    update: kept
      .filter((row): row is { id: string; title: string } => !!row.id && savedById.get(row.id)?.title !== row.title)
      .map(({ id, title }) => ({ id, title })),
    remove: saved.map((measure) => measure.id).filter((id): id is string => !!id && !keptIds.has(id)),
  };
};

export const hasSupportMeasureChanges = (changes: SupportMeasureChanges): boolean =>
  changes.create.length + changes.update.length + changes.remove.length > 0;

/** Writes one change at a time; the errand is read again afterwards by whoever called. */
export const saveSupportMeasures = async (
  errandId: string,
  municipalityId: string,
  type: string,
  changes: SupportMeasureChanges
): Promise<void> => {
  for (const row of changes.create) {
    await createSupportMeasure(errandId, municipalityId, { type, ...row });
  }
  for (const { id, title } of changes.update) {
    await updateSupportMeasure(errandId, municipalityId, id, { title });
  }
  for (const id of changes.remove) {
    await deleteSupportMeasure(errandId, municipalityId, id);
  }
};

const isMeasureResult = (value: string | null | undefined): value is SupportMeasureResultName =>
  SUPPORT_MEASURE_RESULTS.some((candidate) => candidate.result === value);

/** An unknown result (written by something other than Draken) shows as none, and is kept until the handler picks one. */
export const supportMeasureProtocolFields = (measure: Measure): SupportMeasureProtocolFields => ({
  result: isMeasureResult(measure.result) ? measure.result : '',
  description: measure.description ?? '',
});

export const supportMeasureProtocolEdited = (fields: SupportMeasureProtocolFields, measure: Measure): boolean => {
  const loaded = supportMeasureProtocolFields(measure);
  return fields.result !== loaded.result || fields.description !== loaded.description;
};

export const supportMeasureProtocolPatch = (fields: SupportMeasureProtocolFields): SupportMeasurePatch => ({
  result: fields.result || null,
  description: fields.description,
});
