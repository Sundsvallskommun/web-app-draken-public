import { getSupportErrandClassificationPlacement } from '@supportmanagement/investigation/investigation-classification-ownership';

import { getLabelCategorizationHeading, type SupportErrand } from './support-errand-service';
import { getErrandTypeLabel, getLabelReportType } from './support-label-classification-service';
import { getLabelDisplayName } from './support-label-service';
import type { SupportMetadata } from './support-metadata-service';

/**
 * The heading of an errand categorized in its label tree: its type, named in the vocabulary that categorizes it. An
 * investigation that brings its own label tree names the type in that tree. Until the investigation has classified
 * the errand it has no type, so it is named by what was reported instead - a deviation or a misconduct, as the
 * overview names it - and by nothing when no report type is known either. Every other deployment names the deepest
 * categorization label the errand carries.
 */
export const getLabelCategorizedErrandHeading = (
  errand: SupportErrand,
  metadata: SupportMetadata | undefined
): string | undefined => {
  if (!getSupportErrandClassificationPlacement().labelTree) return getLabelCategorizationHeading(errand, metadata);
  return (
    getErrandTypeLabel(errand, metadata)?.displayName ||
    getLabelDisplayName(getLabelReportType(errand), metadata) ||
    undefined
  );
};
