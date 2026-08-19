import type { Classification, Label } from '@common/data-contracts/supportmanagement/data-contracts';

import type { ReportedMisconductLabelTree } from '../investigation/investigation-classification-policy';

export interface SupportErrandLabelSource {
  readonly labels?: readonly Label[];
  readonly classification?: Classification;
}

export interface SupportLabelMetadataSource {
  readonly labels?: { readonly labelStructure?: readonly Label[] };
}

const normalizeClassification = (classification: string | undefined): string =>
  (classification ?? '').trim().replaceAll('_', '-').toUpperCase();

const normalizeResource = (resource: string | undefined): string =>
  (resource ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toUpperCase();

export const findLabelByClassification = (
  labels: readonly Label[] | undefined,
  classification: string
): Label | undefined =>
  labels?.find((label) => normalizeClassification(label.classification) === normalizeClassification(classification));

const flattenLabelTree = (labels: readonly Label[] | undefined): Label[] =>
  (labels ?? []).flatMap((label) => [label, ...flattenLabelTree(label.labels)]);

const matchesResource = (label: Label, resource: string | undefined): boolean =>
  Boolean(
    resource &&
      [label.resourcePath, label.resourceName].some(
        (candidate) => candidate && normalizeResource(candidate) === normalizeResource(resource)
      )
  );

export const projectLabelCategory = (
  errand: SupportErrandLabelSource | undefined,
  metadata: SupportLabelMetadataSource | undefined,
  labelTree: ReportedMisconductLabelTree | undefined
): Label | undefined => {
  const categoryClassification = labelTree?.categoryClassification ?? 'CATEGORY';
  const selectedCategory = findLabelByClassification(errand?.labels, categoryClassification);
  if (selectedCategory) return selectedCategory;

  // This is a discriminated-strategy invariant, not a configurable mapping:
  // reported misconduct persists its selected category in classification.type.
  // Profiles without the capability retain legacy classification.category.
  const categoryResource = labelTree ? errand?.classification?.type : errand?.classification?.category;
  return flattenLabelTree(metadata?.labels?.labelStructure).find(
    (label) =>
      normalizeClassification(label.classification) === normalizeClassification(categoryClassification) &&
      matchesResource(label, categoryResource)
  );
};

export const projectErrandTypeLabel = (
  errand: SupportErrandLabelSource | undefined,
  metadata: SupportLabelMetadataSource | undefined,
  labelTree: ReportedMisconductLabelTree | undefined
): Label | undefined =>
  labelTree ? projectLabelCategory(errand, metadata, labelTree) : findLabelByClassification(errand?.labels, 'TYPE');

export const projectMappedLabelSubType = (
  errand: SupportErrandLabelSource | undefined,
  labelTree: ReportedMisconductLabelTree | undefined
): Label | undefined => findLabelByClassification(errand?.labels, labelTree?.typeClassification ?? 'SUBTYPE');

export const shouldProjectMappedLabelSubType = (
  legacyThreeLevelCategorization: boolean,
  labelTree: ReportedMisconductLabelTree | undefined
): boolean => Boolean(labelTree) || legacyThreeLevelCategorization;
