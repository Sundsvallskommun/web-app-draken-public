import type { ErrandLabel } from '@common/data-contracts/supportmanagement/data-contracts';
import type { CJsonParameter, Classification } from 'src/data-contracts/backend/data-contracts';

import type { SupportErrand } from './support-errand-service';

const CLASSIFICATIONS = {
  CATEGORY: 'CATEGORY',
  TYPE: 'TYPE',
  SUBTYPE: 'SUBTYPE',
} as const;

type LabelClassification = (typeof CLASSIFICATIONS)[keyof typeof CLASSIFICATIONS];

/** A level only counts when the one above it does; a TYPE without a CATEGORY is a broken path. */
const getSelectedLabels = (labels: ErrandLabel[] | undefined): ErrandLabel[] => {
  const byClassification = (classification: LabelClassification) =>
    (labels ?? []).find((label) => label.classification === classification);

  const category = byClassification(CLASSIFICATIONS.CATEGORY);
  if (!category) return [];

  const type = byClassification(CLASSIFICATIONS.TYPE);
  if (!type) return [category];

  const subtype = byClassification(CLASSIFICATIONS.SUBTYPE);
  return subtype ? [category, type, subtype] : [category, type];
};

/**
 * An errand categorized without labels carries its type in `classification` (the same fallback as
 * getLabelCategory). SupportManagement writes NONE for an unset level, so NONE ends the path.
 */
const getClassificationPath = (classification: Classification | undefined): string[] => {
  const category = classification?.category;
  if (!category || category === 'NONE') return [];

  const type = classification?.type;
  return !type || type === 'NONE' ? [category] : [category, type];
};

/**
 * One schema per errand type: namespace + the whole categorization path, lower case —
 * `aot_alcohol_serving_permit_application_permanent_serving`. The namespace because the jsonschema
 * service partitions only by municipality; the whole path because a leaf name is only unique under
 * its own parent. Katla derives the name identically, so neither app needs a lookup table.
 */
export const schemaNameForErrand = (
  errand: Pick<SupportErrand, 'labels' | 'classification'> | undefined,
  namespace: string | undefined
): string | undefined => {
  const path = errand?.labels?.length
    ? getSelectedLabels(errand.labels)
        .map((label) => label.resourceName)
        .filter((resourceName): resourceName is string => !!resourceName)
    : getClassificationPath(errand?.classification);

  if (!namespace || path.length < 2) return undefined;

  return [namespace, ...path].join('_').toLowerCase();
};

/** `key` is the schema name, which is what Katla files the answers under. */
export const jsonParameterForSchema = (
  errand: SupportErrand | undefined,
  schemaName: string | undefined
): CJsonParameter | undefined =>
  schemaName ? errand?.jsonParameters?.find((parameter) => parameter.key === schemaName) : undefined;

/** SupportManagement replaces the whole array on update, so a write must carry the other documents along. */
export const upsertJsonParameter = (
  jsonParameters: CJsonParameter[] | undefined,
  next: CJsonParameter
): CJsonParameter[] => {
  const existing = jsonParameters ?? [];
  const index = existing.findIndex((parameter) => parameter.key === next.key);

  if (index === -1) return [...existing, next];

  const merged = [...existing];
  merged[index] = { ...existing[index], ...next };
  return merged;
};
