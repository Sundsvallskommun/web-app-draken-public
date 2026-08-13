import type { Classification, Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { isIAF } from '@common/services/application-service';

import type { SupportMetadata } from './support-metadata-service';

interface SupportErrandLabelSource {
  readonly labels?: Label[];
  readonly classification?: Classification;
}

export const findLabelByClassification = (
  labels: readonly Label[] | undefined,
  classification: string
): Label | undefined => labels?.find((label) => label.classification?.toUpperCase() === classification.toUpperCase());

const flattenLabelTree = (labels: readonly Label[] | undefined): Label[] =>
  (labels ?? []).flatMap((label) => [label, ...flattenLabelTree(label.labels)]);

const matchesResource = (label: Label, resource: string | undefined): boolean =>
  Boolean(resource && (label.resourcePath === resource || label.resourceName === resource));

export const getLabelCategory = (
  errand: SupportErrandLabelSource | undefined,
  metadata?: SupportMetadata
): Label | undefined => {
  const selectedCategory = findLabelByClassification(errand?.labels, 'CATEGORY');
  if (selectedCategory) {
    return selectedCategory;
  }

  const categoryResource = isIAF() ? errand?.classification?.type : errand?.classification?.category;
  return flattenLabelTree(metadata?.labels?.labelStructure).find(
    (label) => label.classification.toUpperCase() === 'CATEGORY' && matchesResource(label, categoryResource)
  );
};

export const getLabelType = (errand: SupportErrandLabelSource | undefined): Label | undefined =>
  findLabelByClassification(errand?.labels, 'TYPE');

export const getLabelSubType = (errand: SupportErrandLabelSource | undefined): Label | undefined =>
  findLabelByClassification(errand?.labels, 'SUBTYPE');

export const getErrandTypeLabel = (
  errand: SupportErrandLabelSource | undefined,
  metadata?: SupportMetadata
): Label | undefined => (isIAF() ? getLabelCategory(errand, metadata) : getLabelType(errand));

export const getLabelTypeFromDisplayName = (displayName: string, metadata: SupportMetadata): Label[] =>
  flattenLabelTree(metadata?.labels?.labelStructure).filter(
    (label) => label.classification.toUpperCase() === 'TYPE' && label.displayName === displayName
  );

export const getLabelTypeFromName = (name: string, metadata: SupportMetadata): Label | undefined =>
  flattenLabelTree(metadata?.labels?.labelStructure).find(
    (label) => label.classification.toUpperCase() === 'TYPE' && matchesResource(label, name)
  );

export const getLabelSubTypeFromName = (name: string, metadata: SupportMetadata): Label | undefined =>
  flattenLabelTree(metadata?.labels?.labelStructure).find(
    (label) => label.classification.toUpperCase() === 'SUBTYPE' && matchesResource(label, name)
  );

export const getLabelCategoryFromName = (name: string, metadata: SupportMetadata): Label | undefined =>
  flattenLabelTree(metadata?.labels?.labelStructure).find(
    (label) => label.classification.toUpperCase() === 'CATEGORY' && matchesResource(label, name)
  );
