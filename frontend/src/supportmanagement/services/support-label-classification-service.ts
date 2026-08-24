import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import type { SupportErrandClassificationPlacement } from '@supportmanagement/investigation/iaf-vof-investigation-classification-policy';
import { getSupportErrandClassificationPlacement } from '@supportmanagement/investigation/investigation-classification-ownership';

import {
  findLabelByClassification,
  flattenLabelTree,
  matchesResource,
  normalizeClassification,
  projectErrandTypeLabel,
  projectLabelCategory,
  projectMappedLabelSubType,
  shouldProjectMappedLabelSubType,
  type SupportErrandLabelSource,
} from './support-label-classification-projector';
import type { SupportMetadata } from './support-metadata-service';

export { findLabelByClassification } from './support-label-classification-projector';

const getIafVofPolicy = (placement: SupportErrandClassificationPlacement) =>
  placement.categorization === 'iaf-vof' ? placement.policy : undefined;

export const getLabelCategory = (
  errand: SupportErrandLabelSource | undefined,
  metadata?: SupportMetadata,
  placement: SupportErrandClassificationPlacement = getSupportErrandClassificationPlacement()
): Label | undefined => {
  const policy = getIafVofPolicy(placement);
  return projectLabelCategory(errand, metadata, policy?.labelTree);
};

export const getLabelType = (errand: SupportErrandLabelSource | undefined): Label | undefined =>
  findLabelByClassification(errand?.labels, 'TYPE');

export const getLabelSubType = (errand: SupportErrandLabelSource | undefined): Label | undefined =>
  findLabelByClassification(errand?.labels, 'SUBTYPE');

export const getErrandTypeLabel = (
  errand: SupportErrandLabelSource | undefined,
  metadata?: SupportMetadata,
  placement: SupportErrandClassificationPlacement = getSupportErrandClassificationPlacement()
): Label | undefined => projectErrandTypeLabel(errand, metadata, getIafVofPolicy(placement)?.labelTree);

/** Maps the third form level from the runtime capability vocabulary. */
export const getMappedLabelSubType = (
  errand: SupportErrandLabelSource | undefined,
  placement: SupportErrandClassificationPlacement = getSupportErrandClassificationPlacement()
): Label | undefined => projectMappedLabelSubType(errand, getIafVofPolicy(placement)?.labelTree);

export const shouldMapLabelSubType = (
  legacyThreeLevelCategorization: boolean,
  placement: SupportErrandClassificationPlacement = getSupportErrandClassificationPlacement()
): boolean => shouldProjectMappedLabelSubType(legacyThreeLevelCategorization, getIafVofPolicy(placement)?.labelTree);

const findLabelByClassificationAndResource = (
  metadata: SupportMetadata,
  classification: string,
  name: string
): Label | undefined =>
  flattenLabelTree(metadata?.labels?.labelStructure).find(
    (label) => normalizeClassification(label.classification) === classification && matchesResource(label, name)
  );

export const getLabelTypeFromName = (name: string, metadata: SupportMetadata): Label | undefined =>
  findLabelByClassificationAndResource(metadata, 'TYPE', name);

export const getLabelSubTypeFromName = (name: string, metadata: SupportMetadata): Label | undefined =>
  findLabelByClassificationAndResource(metadata, 'SUBTYPE', name);

export const getLabelCategoryFromName = (name: string, metadata: SupportMetadata): Label | undefined =>
  findLabelByClassificationAndResource(metadata, 'CATEGORY', name);
