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
  const idsToKeep = new Set(keepIds.filter((id): id is string => !!id));
  return (labels ?? []).filter((label) => !isLabelDeprecated(label) || (!!label.id && idsToKeep.has(label.id)));
};

/**
 * Selectable types for a category, with their selectable subtypes inlined.
 *
 * A type that has subtypes in the metadata but no selectable ones left is dropped: there is no valid
 * leaf to pick, and hiding the branch matches the intent behind deprecating every subtype better
 * than offering the type itself as a leaf would.
 *
 * When the category or a type is deprecated, only the labels named by `keepIds` are retained below
 * that point. This lets an existing errand display its current classification without exposing new
 * choices below an effectively deprecated parent.
 */
export const getSelectableTypesForCategory = (
  category: Label | undefined,
  keepIds: (string | undefined)[] = []
): Label[] => {
  const idsToKeep = new Set(keepIds.filter((id): id is string => !!id));
  const isKept = (label: Label) => !!label.id && idsToKeep.has(label.id);
  const categoryDeprecated = isLabelDeprecated(category);
  const selectableTypes = categoryDeprecated
    ? (category?.labels ?? []).filter(isKept)
    : getSelectableLabels(category?.labels, keepIds);

  return selectableTypes
    .map((type) => ({
      type,
      selectableSubTypes:
        categoryDeprecated || isLabelDeprecated(type)
          ? (type.labels ?? []).filter(isKept)
          : getSelectableLabels(type.labels, keepIds),
    }))
    .filter(
      ({ type, selectableSubTypes }) =>
        (type.labels?.length ?? 0) === 0 || selectableSubTypes.length > 0 || (!!type.id && idsToKeep.has(type.id))
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
  return categories.flatMap((category) => getSelectableTypesForCategory(category));
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
 * Effective deprecation for every label in a metadata structure, looked up by id and by resource
 * path. Both keys are needed: the copies stored on an errand carry an id and a resource path but no
 * flags, so they have to be resolved back to the structure. They are kept in separate maps so an id
 * can never collide with a path.
 *
 * The structure is indexed rather than searched per label. `resourcePath` is not reliably a chain of
 * the `resourceName` values above it, so it cannot be used to descend level by level, and searching
 * the tree for every rendered label is quadratic in the size of the structure.
 */
interface DeprecationIndex {
  byId: Map<string, boolean>;
  byResourcePath: Map<string, boolean>;
}

/**
 * One index per metadata object. A refetch replaces the whole object, so it gets a fresh index and
 * the previous one is collected along with the metadata it described.
 */
const deprecationIndexes = new WeakMap<SupportMetadata, DeprecationIndex>();

const buildDeprecationIndex = (labelStructure: Label[]): DeprecationIndex => {
  const index: DeprecationIndex = { byId: new Map(), byResourcePath: new Map() };

  // A branch is only reachable through its parent, so a deprecated ancestor makes everything below
  // it deprecated as well.
  const indexLevel = (labels: Label[], hasDeprecatedAncestor: boolean) => {
    for (const label of labels) {
      const deprecated = hasDeprecatedAncestor || isLabelDeprecated(label);
      if (label.id) {
        index.byId.set(label.id, deprecated);
      }
      if (label.resourcePath) {
        index.byResourcePath.set(label.resourcePath, deprecated);
      }
      indexLevel(label.labels ?? [], deprecated);
    }
  };

  indexLevel(labelStructure, false);
  return index;
};

const getDeprecationIndex = (metadata: SupportMetadata | undefined): DeprecationIndex | undefined => {
  const labelStructure = metadata?.labels?.labelStructure;
  if (!metadata || !labelStructure?.length) {
    return undefined;
  }

  const cached = deprecationIndexes.get(metadata);
  if (cached) {
    return cached;
  }

  const index = buildDeprecationIndex(labelStructure);
  deprecationIndexes.set(metadata, index);
  return index;
};

/**
 * Whether a label, or any label above it, is deprecated. Matches on id first and falls back to
 * resource path, so a label that was renamed still resolves.
 *
 * Returns false when there is nothing to resolve against (metadata not loaded yet) or when the label
 * is not in the structure: an unknown label is left unmarked rather than guessed at.
 */
const isLabelPathDeprecated = (label: Label | undefined, metadata: SupportMetadata | undefined): boolean => {
  const index = getDeprecationIndex(metadata);
  if (!index || !label) {
    return false;
  }

  const byId = label.id ? index.byId.get(label.id) : undefined;
  if (byId !== undefined) {
    return byId;
  }

  return (label.resourcePath ? index.byResourcePath.get(label.resourcePath) : undefined) ?? false;
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
