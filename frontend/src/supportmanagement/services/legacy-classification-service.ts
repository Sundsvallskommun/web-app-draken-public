import { appConfig } from '@config/appconfig';

import { hasClassificationCategory } from './support-errand-emptiness';
import type { SupportErrand } from './support-errand-service';
import { getCategorizationLabels } from './support-errand-service';
import type { SupportMetadata } from './support-metadata-service';

/**
 * LEGACY_CLASSIFICATION: temporary read-only display of the classification of errands registered before
 * `useLabelCategorization`. To remove: delete this file and every branch marked LEGACY_CLASSIFICATION.
 */

const classificationValue = (value?: string): string => (value === 'NONE' ? '' : value) || '';

/** Shown from the classification: under `useLabelCategorization`, for errands without categorization labels. */
export const showsLegacyClassification = (errand: SupportErrand): boolean =>
  appConfig.features.useLabelCategorization &&
  getCategorizationLabels(errand).length === 0 &&
  hasClassificationCategory(errand.classification?.category);

export const getClassificationCategoryDisplayName = (
  errand: SupportErrand,
  metadata: SupportMetadata | undefined
): string => {
  const category = classificationValue(errand.classification?.category);
  return metadata?.categories?.find((c) => c.name === category)?.displayName || category;
};

export const getClassificationTypeDisplayName = (
  errand: SupportErrand,
  metadata: SupportMetadata | undefined
): string => {
  const category = classificationValue(errand.classification?.category);
  const type = classificationValue(errand.classification?.type);
  return (
    metadata?.categories?.find((c) => c.name === category)?.types?.find((t) => t.name === type)?.displayName || type
  );
};

/** The classification for headings: its type, or its category when the type is missing. */
export const getLegacyClassificationHeading = (errand: SupportErrand, metadata: SupportMetadata | undefined): string =>
  getClassificationTypeDisplayName(errand, metadata) || getClassificationCategoryDisplayName(errand, metadata);

/** Category and type of the classification as one line, for summaries. */
export const getLegacyClassificationSummary = (errand: SupportErrand, metadata: SupportMetadata | undefined): string =>
  [getClassificationCategoryDisplayName(errand, metadata), getClassificationTypeDisplayName(errand, metadata)]
    .filter(Boolean)
    .join(' - ');
