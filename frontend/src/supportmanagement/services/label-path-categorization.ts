import { appConfig } from '@config/appconfig';
import type { SupportErrandClassificationPlacement } from '@supportmanagement/investigation/classification-placement';
import { getSupportErrandClassificationPlacement } from '@supportmanagement/investigation/investigation-classification-ownership';

/**
 * Whether the errand's category, type and subtype fields hold label paths rather than a classification. A
 * label-categorized deployment keeps its whole categorization in the label tree. An investigation that brings its own
 * label tree keeps the classification fields instead, and maps its own subcategory onto the third one.
 */
export const categorizesByLabelPaths = (
  placement: SupportErrandClassificationPlacement = getSupportErrandClassificationPlacement()
): boolean => appConfig.features.useLabelCategorization && !placement.labelTree;
