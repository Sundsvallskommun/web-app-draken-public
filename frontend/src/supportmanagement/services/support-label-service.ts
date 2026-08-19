import { Label } from '@common/data-contracts/supportmanagement/data-contracts';

import { SupportMetadata } from './support-metadata-service';

/**
 * Helpers for the `deprecated` flag on supportmanagement metadata labels.
 *
 * A deprecated label must stay in the metadata structure so that errands already classified with it
 * keep resolving their display name, escalation email and other attributes. The flag only governs
 * what a user is allowed to *pick*, so filtering is always done at render time on the option lists,
 * never on the metadata itself.
 *
 * Deprecation is inherited: a deprecated CATEGORY makes its TYPEs and SUBTYPEs unselectable too,
 * since they can only be reached through their parent.
 */

const isLabelDeprecated = (label?: Label): boolean => label?.deprecated === true;

/**
 * Filters a list of labels down to the ones a user may pick.
 *
 * `keepIds` holds the ids of labels that are already set on the errand being edited. Those are kept
 * even when deprecated, so an existing errand keeps showing its own classification instead of
 * rendering an empty select. They can be deselected but not chosen again.
 */
export const getSelectableLabels = (labels: Label[] | undefined, keepIds: (string | undefined)[] = []): Label[] => {
  const idsToKeep = keepIds.filter((id): id is string => !!id);
  return (labels ?? []).filter((label) => !isLabelDeprecated(label) || (!!label.id && idsToKeep.includes(label.id)));
};

/**
 * Selectable types for a category, with their selectable subtypes inlined.
 *
 * A type that has subtypes in the metadata but no selectable ones left is dropped entirely. It has
 * no valid leaf to pick, and hiding the branch is closer to the intent behind deprecating every
 * subtype than turning the type itself into a selectable leaf would be — that would silently change
 * how that branch gets classified. Types kept via `keepIds` are never dropped.
 */
export const getSelectableTypesWithSubTypes = (
  types: Label[] | undefined,
  keepIds: (string | undefined)[] = []
): Label[] => {
  const idsToKeep = keepIds.filter((id): id is string => !!id);

  return getSelectableLabels(types, keepIds)
    .map((type) => ({ type, selectableSubTypes: getSelectableLabels(type.labels, keepIds) }))
    .filter(
      ({ type, selectableSubTypes }) =>
        (type.labels?.length ?? 0) === 0 || selectableSubTypes.length > 0 || (!!type.id && idsToKeep.includes(type.id))
    )
    .map(({ type, selectableSubTypes }) => ({ ...type, labels: selectableSubTypes }));
};

/** Top level (CATEGORY) labels a user may pick, in metadata order. */
export const getSelectableCategories = (metadata: SupportMetadata | undefined) =>
  getSelectableLabels(metadata?.labels?.labelStructure);

/**
 * Every selectable TYPE across the whole structure, or only within the given categories when
 * `categoryResourcePaths` is non-empty. Types under a deprecated category are excluded.
 */
export const getSelectableTypes = (
  metadata: SupportMetadata | undefined,
  categoryResourcePaths: string[] = []
): Label[] => {
  const categories = getSelectableCategories(metadata).filter(
    (category) =>
      categoryResourcePaths.length === 0 ||
      (!!category.resourcePath && categoryResourcePaths.includes(category.resourcePath))
  );
  return categories.flatMap((category) => getSelectableTypesWithSubTypes(category.labels));
};

/**
 * Every selectable SUBTYPE across the whole structure, narrowed by category and/or by type display
 * name when those filters are set. Subtypes under a deprecated category or type are excluded.
 */
export const getSelectableSubTypes = (
  metadata: SupportMetadata | undefined,
  categoryResourcePaths: string[] = [],
  typeDisplayNames: string[] = []
): Label[] => {
  const types = getSelectableTypes(metadata, categoryResourcePaths).filter(
    (type) => typeDisplayNames.length === 0 || (!!type.displayName && typeDisplayNames.includes(type.displayName))
  );
  return types.flatMap((type) => getSelectableLabels(type.labels));
};

/** Display names of the given labels, de-duplicated and with missing names dropped. */
export const getUniqueLabelDisplayNames = (labels: Label[]): string[] =>
  Array.from(new Set(labels.map((label) => label.displayName).filter((name): name is string => !!name)));

/** Marker appended to a label that is shown but can no longer be chosen. */
const DEPRECATED_LABEL_SUFFIX = '(Utgått)';

/**
 * Whether a label, or any label above it, is deprecated.
 *
 * Works for both metadata labels and the copies stored on an errand — the latter do not carry the
 * flag, so the label is looked up in the metadata structure by id, falling back to resource path.
 * The tree is searched rather than indexed by path segments: `resourcePath` is not reliably a chain
 * of the `resourceName` values above it, so descending segment by segment misses real labels.
 *
 * A branch is only reachable through its parent, so a deprecated ancestor makes everything below it
 * deprecated as well. Returns false when there is nothing to resolve against (metadata not loaded
 * yet) or when the label is not found: an unknown label is left unmarked rather than guessed at.
 */
const isLabelPathDeprecated = (label: Label | undefined, metadata: SupportMetadata | undefined): boolean => {
  const labelStructure = metadata?.labels?.labelStructure;
  if (!labelStructure?.length || !label) {
    return false;
  }

  const isSameLabel = (candidate: Label): boolean =>
    (!!label.id && candidate.id === label.id) ||
    (!!label.resourcePath && candidate.resourcePath === label.resourcePath);

  // Returns undefined while the label has not been found, so that a miss in one branch keeps the
  // search going instead of being read as 'not deprecated'.
  const findDeprecation = (candidates: Label[], hasDeprecatedAncestor: boolean): boolean | undefined => {
    for (const candidate of candidates) {
      const deprecated = hasDeprecatedAncestor || isLabelDeprecated(candidate);
      if (isSameLabel(candidate)) {
        return deprecated;
      }
      const found = findDeprecation(candidate.labels ?? [], deprecated);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  };

  return findDeprecation(labelStructure, false) ?? false;
};

/**
 * Display name for a label, marked with '(Utgått)' when it can no longer be chosen. Used where a
 * deprecated label is still shown — the categorization selects on an existing errand, and the errand
 * list — so it is visible that the classification is a leftover rather than a current option.
 */
export const getLabelDisplayName = (label: Label | undefined, metadata: SupportMetadata | undefined): string => {
  const displayName = label?.displayName || label?.resourcePath || '';
  if (!displayName) {
    return '';
  }
  return isLabelPathDeprecated(label, metadata) ? `${displayName} ${DEPRECATED_LABEL_SUFFIX}` : displayName;
};
