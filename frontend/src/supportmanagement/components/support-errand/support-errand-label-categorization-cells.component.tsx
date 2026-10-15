import { categorizesByLabelPaths } from '@supportmanagement/services/label-path-categorization';
import {
  getClassificationCategoryDisplayName,
  getClassificationTypeDisplayName,
  showsLegacyClassification,
} from '@supportmanagement/services/legacy-classification-service';
import {
  getCategorizationLabels,
  getLabelCategory,
  getLabelSubType,
  getLabelType,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getLabelDisplayName } from '@supportmanagement/services/support-label-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';

interface ErrandLabelCategorizationCellProps {
  errand: SupportErrand;
  metadata: SupportMetadata | undefined;
}

/**
 * The overview's category for a label-categorized deployment. An investigation that brings its own label tree names
 * the category in that tree; every other deployment shows the first categorization label, or the classification an
 * errand from before the label tree still carries.
 */
export const ErrandLabelCategoryCell: React.FC<ErrandLabelCategorizationCellProps> = ({ errand, metadata }) => {
  if (!categorizesByLabelPaths()) {
    return <>{getLabelDisplayName(getLabelCategory(errand, metadata), metadata)}</>;
  }
  // LEGACY_CLASSIFICATION
  return (
    <>
      {showsLegacyClassification(errand)
        ? getClassificationCategoryDisplayName(errand, metadata)
        : getLabelDisplayName(getCategorizationLabels(errand)[0], metadata)}
    </>
  );
};

/** The overview's type and subtype for a label-categorized deployment, chosen the same way as the category. */
export const ErrandLabelTypeCell: React.FC<ErrandLabelCategorizationCellProps> = ({ errand, metadata }) => {
  if (!categorizesByLabelPaths()) {
    return (
      <div>
        <div>{getLabelDisplayName(getLabelType(errand), metadata)}</div>
        <div>{getLabelDisplayName(getLabelSubType(errand), metadata)}</div>
      </div>
    );
  }
  // LEGACY_CLASSIFICATION
  if (showsLegacyClassification(errand)) {
    return <div>{getClassificationTypeDisplayName(errand, metadata)}</div>;
  }
  return (
    <div>
      {getCategorizationLabels(errand)
        .slice(1)
        .map((label) => (
          <div key={label.id ?? label.resourcePath}>{getLabelDisplayName(label, metadata)}</div>
        ))}
    </div>
  );
};
