import { getSupportErrandClassificationPlacement } from '@supportmanagement/investigation/investigation-classification-ownership';

import { getLabelCategorizationHeading, type SupportErrand } from './support-errand-service';
import { getErrandTypeLabel } from './support-label-classification-service';
import type { SupportMetadata } from './support-metadata-service';

/**
 * The heading of an errand categorized in its label tree: its type, named in the vocabulary that categorizes it. An
 * investigation that brings its own label tree names the type in that tree, and has none until the errand is
 * classified: the investigation classifies it later, so there is nothing missing to point out. Every other
 * deployment names the deepest categorization label the errand carries.
 */
export const getLabelCategorizedErrandHeading = (
  errand: SupportErrand,
  metadata: SupportMetadata | undefined
): string | undefined =>
  getSupportErrandClassificationPlacement().labelTree
    ? getErrandTypeLabel(errand, metadata)?.displayName
    : getLabelCategorizationHeading(errand, metadata);
