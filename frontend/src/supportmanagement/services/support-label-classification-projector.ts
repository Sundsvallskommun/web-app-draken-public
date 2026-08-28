import type { Classification, Label } from '@common/data-contracts/supportmanagement/data-contracts';

import { normalizeSupportManagementResourcePath } from './supportmanagement-path';

/**
 * Which label classifications a deployment reads at each categorization level.
 *
 * Every SupportManagement application categorizes errands from the label tree; they differ in
 * which subtree they read. The default tree needs no profile - CATEGORY/TYPE/SUBTYPE are the
 * classifications - so an absent profile means "the default vocabulary". A variant that brings
 * its own subtree supplies one.
 */
export interface SupportLabelTreeProfile {
  readonly categoryClassification: string;
  readonly typeClassification: string;
}

export interface SupportErrandLabelSource {
  readonly labels?: readonly Label[];
  readonly classification?: Classification;
}

export interface SupportLabelMetadataSource {
  readonly labels?: { readonly labelStructure?: readonly Label[] };
}

export const normalizeClassification = (classification: string | undefined): string =>
  (classification ?? '').trim().replaceAll('_', '-').toUpperCase();

const normalizeResource = normalizeSupportManagementResourcePath;

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
  labelTree: SupportLabelTreeProfile | undefined
): Label | undefined => {
  const categoryClassification = labelTree?.categoryClassification ?? 'CATEGORY';
  const selectedCategory = findLabelByClassification(errand?.labels, categoryClassification);
  if (selectedCategory) return selectedCategory;

  // Not a configurable mapping: a deployment with its own label tree persists the selected
  // category in classification.type, while the default tree retains it in classification.category.
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
  labelTree: SupportLabelTreeProfile | undefined
): Label | undefined =>
  labelTree ? projectLabelCategory(errand, metadata, labelTree) : findLabelByClassification(errand?.labels, 'TYPE');

export const projectMappedLabelSubType = (
  errand: SupportErrandLabelSource | undefined,
  labelTree: SupportLabelTreeProfile | undefined
): Label | undefined => findLabelByClassification(errand?.labels, labelTree?.typeClassification ?? 'SUBTYPE');

export const shouldProjectMappedLabelSubType = (
  legacyThreeLevelCategorization: boolean,
  labelTree: SupportLabelTreeProfile | undefined
): boolean => Boolean(labelTree) || legacyThreeLevelCategorization;
