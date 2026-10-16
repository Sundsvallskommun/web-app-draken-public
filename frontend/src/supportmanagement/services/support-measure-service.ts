import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';

import { getLabelType, type SupportErrand } from './support-errand-service';
import type { SupportMetadata } from './support-metadata-service';

interface SupportMeasureInput {
  type: string;
  title: string;
}

/** A row in the list. `id` is missing until the row has been saved. */
export interface SupportMeasureRow {
  id?: string;
  title: string;
}

export interface SupportMeasureChanges {
  create: string[];
  update: { id: string; title: string }[];
  remove: string[];
}

export const getSupportMeasures = (errandId: string, municipalityId: string): Promise<Measure[]> =>
  apiService.get<Measure[]>(`supportmeasures/${municipalityId}/${errandId}`).then((res) => res.data ?? []);

const createSupportMeasure = (errandId: string, municipalityId: string, input: SupportMeasureInput): Promise<Measure> =>
  apiService
    .post<Measure, SupportMeasureInput>(`supportmeasures/${municipalityId}/${errandId}`, input)
    .then((res) => res.data);

const updateSupportMeasure = (
  errandId: string,
  municipalityId: string,
  measureId: string,
  title: string
): Promise<Measure> =>
  apiService
    .patch<Measure, { title: string }>(`supportmeasures/${municipalityId}/${errandId}/${measureId}`, { title })
    .then((res) => res.data);

const deleteSupportMeasure = (errandId: string, municipalityId: string, measureId: string): Promise<void> =>
  apiService.deleteRequest<void>(`supportmeasures/${municipalityId}/${errandId}/${measureId}`).then(() => undefined);

/** The errand's TYPE label, when the namespace has a measure type of that name (INTERNAL_/EXTERNAL_INSPECTION). */
export const supportMeasureTypeForErrand = (
  errand: Pick<SupportErrand, 'labels'> | undefined,
  metadata: SupportMetadata | undefined
): string | undefined => {
  const typeName: string | undefined = errand ? getLabelType(errand as SupportErrand)?.resourceName : undefined;
  return typeName && metadata?.measureTypes?.some((measureType) => measureType.name === typeName)
    ? typeName
    : undefined;
};

export const supportMeasureRows = (measures: Measure[] | undefined): SupportMeasureRow[] =>
  (measures ?? []).map((measure) => ({ id: measure.id, title: measure.title ?? '' }));

/** Blank rows are dropped; a saved row that was blanked or removed is deleted. */
export const supportMeasureChanges = (rows: SupportMeasureRow[], saved: Measure[]): SupportMeasureChanges => {
  const kept = rows.map((row) => ({ ...row, title: row.title.trim() })).filter((row) => row.title !== '');
  const savedById = new Map(saved.map((measure) => [measure.id, measure]));
  const keptIds = new Set(kept.map((row) => row.id));
  return {
    create: kept.filter((row) => !row.id).map((row) => row.title),
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
  for (const title of changes.create) {
    await createSupportMeasure(errandId, municipalityId, { type, title });
  }
  for (const { id, title } of changes.update) {
    await updateSupportMeasure(errandId, municipalityId, id, title);
  }
  for (const id of changes.remove) {
    await deleteSupportMeasure(errandId, municipalityId, id);
  }
};
