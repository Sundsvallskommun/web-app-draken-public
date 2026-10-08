import { getSupportErrandClassificationPlacement } from '@supportmanagement/investigation/investigation-classification-ownership';

import { getLabelCategorizationHeading, MISSING_ERRAND_TYPE_TEXT, type SupportErrand } from './support-errand-service';
import { getErrandTypeLabel } from './support-label-classification-service';
import type { SupportMetadata } from './support-metadata-service';

/**
 * The heading of an errand categorized in its label tree: its type, named in the vocabulary that categorizes it. An
 * investigation that brings its own label tree names the type in that tree; every other deployment names the deepest
 * categorization label the errand carries.
 */
export const getLabelCategorizedErrandHeading = (
  errand: SupportErrand,
  metadata: SupportMetadata | undefined
): string =>
  getSupportErrandClassificationPlacement().labelTree
    ? getErrandTypeLabel(errand, metadata)?.displayName ?? MISSING_ERRAND_TYPE_TEXT
    : getLabelCategorizationHeading(errand, metadata);
