import type { Measure, MeasureType } from '@common/data-contracts/supportmanagement/data-contracts';

type SelectableMeasureType = MeasureType & { id: string };

/** Render Draken's resolved choices; retain the saved type when editing historical measures. */
export const selectableMeasureTypes = (
  types: readonly MeasureType[],
  availableTypeIds: readonly string[],
  currentTypeId?: string
): SelectableMeasureType[] =>
  types
    .filter(
      (type): type is SelectableMeasureType =>
        Boolean(type.id) &&
        (type.id === currentTypeId || (!type.deprecated && availableTypeIds.includes(type.id ?? '')))
    )
    .toSorted(
      (a, b) =>
        (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        (a.displayName || a.name).localeCompare(b.displayName || b.name, 'sv')
    );

export const measureTypeLabel = (
  types: readonly MeasureType[],
  measure: Pick<Measure, 'measureTypeId' | 'type'>
): string => {
  const type = types.find((candidate) => candidate.id && candidate.id === measure.measureTypeId);
  return type?.displayName || type?.name || measure.type || measure.measureTypeId || 'Typ saknas';
};
