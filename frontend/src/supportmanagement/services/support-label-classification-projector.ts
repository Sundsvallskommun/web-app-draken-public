import type { Classification, Label } from '@common/data-contracts/supportmanagement/data-contracts';

import type { IafVofInvestigationClassificationLabelTree } from '../investigation/iaf-vof-investigation-classification-policy';

export interface SupportErrandLabelSource {
  readonly labels?: readonly Label[];
  readonly classification?: Classification;
}

export interface SupportLabelMetadataSource {
  readonly labels?: { readonly labelStructure?: readonly Label[] };
}

export const normalizeClassification = (classification: string | undefined): string =>
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

export const flattenLabelTree = (labels: readonly Label[] | undefined): Label[] =>
  (labels ?? []).flatMap((label) => [label, ...flattenLabelTree(label.labels)]);

export const matchesResource = (label: Label, resource: string | undefined): boolean =>
  Boolean(
    resource &&
      [label.resourcePath, label.resourceName].some(
        (candidate) => candidate && normalizeResource(candidate) === normalizeResource(resource)
      )
  );

export const projectLabelCategory = (
  errand: SupportErrandLabelSource | undefined,
  metadata: SupportLabelMetadataSource | undefined,
  labelTree: IafVofInvestigationClassificationLabelTree | undefined
): Label | undefined => {
  const categoryClassification = labelTree?.categoryClassification ?? 'CATEGORY';
  const selectedCategory = findLabelByClassification(errand?.labels, categoryClassification);
  if (selectedCategory) return selectedCategory;

  // This is an IAF/VOF invariant, not a configurable mapping: reported
  // misconduct persists its selected category in classification.type. Other
  // applications retain legacy classification.category.
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
  labelTree: IafVofInvestigationClassificationLabelTree | undefined
): Label | undefined =>
  labelTree ? projectLabelCategory(errand, metadata, labelTree) : findLabelByClassification(errand?.labels, 'TYPE');

export const projectMappedLabelSubType = (
  errand: SupportErrandLabelSource | undefined,
  labelTree: IafVofInvestigationClassificationLabelTree | undefined
): Label | undefined => findLabelByClassification(errand?.labels, labelTree?.typeClassification ?? 'SUBTYPE');

export const shouldProjectMappedLabelSubType = (
  legacyThreeLevelCategorization: boolean,
  labelTree: IafVofInvestigationClassificationLabelTree | undefined
): boolean => Boolean(labelTree) || legacyThreeLevelCategorization;
