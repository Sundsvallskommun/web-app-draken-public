import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';

import type { ReportedMisconductLabelTree } from '../investigation-classification-policy';
import type { LabelClassificationCatalog, LabelClassificationSelection } from './label-classification.types';

export interface LabelClassificationLegalBaseRule {
  readonly legalBase: string;
  readonly allowedClassificationCategories: readonly string[];
}

const normalizeClassification = (classification: string | undefined): string =>
  (classification ?? '').trim().replaceAll('_', '-').toUpperCase();

const normalizeResourcePath = (resourcePath: string | undefined): string =>
  (resourcePath ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toUpperCase();

const isClassification = (label: Label, classification: string): boolean =>
  normalizeClassification(label.classification) === normalizeClassification(classification);

const labelCode = (label: Label): string => label.resourcePath || label.id || label.resourceName;

const labelResourceValue = (label: Label): string => label.resourcePath || label.resourceName;

const labelDisplayName = (label: Label): string => label.displayName || label.resourceName || labelCode(label);

const hasSameIdentity = (left: Label, right: Label): boolean => {
  if (left.id && right.id && left.id === right.id) {
    return true;
  }

  if (left.resourcePath && right.resourcePath) {
    return normalizeResourcePath(left.resourcePath) === normalizeResourcePath(right.resourcePath);
  }

  return (
    !left.id &&
    !right.id &&
    !left.resourcePath &&
    !right.resourcePath &&
    normalizeClassification(left.classification) === normalizeClassification(right.classification) &&
    left.resourceName === right.resourceName
  );
};

const withoutChildren = ({ labels: _labels, ...label }: Label): Label => label;

const sortLabels = (labels: readonly Label[]): Label[] =>
  [...labels].sort((left, right) => labelDisplayName(left).localeCompare(labelDisplayName(right), 'sv'));

const configuredLabelResource = (label: Label): string | undefined =>
  typeof label.resourcePath === 'string' && label.resourcePath.trim().length > 0
    ? label.resourcePath
    : label.resourceName;

const isConfiguredRoot = (label: Label, labelTree: ReportedMisconductLabelTree): boolean =>
  normalizeResourcePath(configuredLabelResource(label)) === normalizeResourcePath(labelTree.root.resource) &&
  isClassification(label, labelTree.root.classification);

const requireConfiguredRoot = (labelStructure: readonly Label[], labelTree: ReportedMisconductLabelTree): Label => {
  const roots = labelStructure.filter((label) => isConfiguredRoot(label, labelTree));
  if (roots.length !== 1) {
    throw new Error(
      `Support Management classification metadata expected one configured root ${labelTree.root.resource}/${labelTree.root.classification}, found ${roots.length}`
    );
  }
  return roots[0];
};

const findTypeLabels = (labels: readonly Label[] | undefined, labelTree: ReportedMisconductLabelTree): Label[] => {
  const typeLabels: Label[] = [];

  const visit = (nodes: readonly Label[]) => {
    nodes.forEach((node) => {
      if (isClassification(node, labelTree.typeClassification)) {
        typeLabels.push(node);
        return;
      }

      if (!isClassification(node, labelTree.categoryClassification) && node.labels?.length) {
        visit(node.labels);
      }
    });
  };

  visit(labels ?? []);
  return sortLabels(typeLabels);
};

export interface IafLabelClassificationBinding {
  readonly owner?: Label;
  readonly category: Label;
  readonly types: readonly Label[];
}

export interface IafLabelClassificationModel {
  readonly catalog: LabelClassificationCatalog;
  readonly bindings: readonly IafLabelClassificationBinding[];
  readonly labelTree: ReportedMisconductLabelTree;
}

export type PersistedIafLabelClassificationState =
  | 'known-valid'
  | 'legacy-unknown'
  | 'known-disallowed-legal-base'
  | 'known-missing-required-type'
  | 'known-inconsistent'
  | 'missing-classification';

interface PersistedIafLabelClassification {
  readonly labels?: readonly Label[];
  readonly category?: string;
  readonly type?: string;
  readonly subType?: string;
}

const getAllowedOwnerIdentifiers = (
  legalBases: readonly string[],
  legalBaseRules: readonly LabelClassificationLegalBaseRule[]
): ReadonlySet<string> => {
  const allowedOwnerIdentifiers = new Set<string>();
  const selectedLegalBases = new Set(legalBases.map((legalBase) => legalBase.trim().toUpperCase()));

  legalBaseRules
    .filter(({ legalBase }) => selectedLegalBases.has(legalBase.trim().toUpperCase()))
    .flatMap(({ allowedClassificationCategories }) => allowedClassificationCategories)
    .forEach((category) => {
      const normalizedCategory = normalizeResourcePath(category);
      if (!normalizedCategory) return;
      allowedOwnerIdentifiers.add(normalizedCategory);
      allowedOwnerIdentifiers.add(normalizedCategory.split('/').at(-1) ?? normalizedCategory);
    });

  return allowedOwnerIdentifiers;
};

const belongsToAllowedLegalBase = (owner: Label | undefined, allowedOwnerIdentifiers: ReadonlySet<string>): boolean =>
  Boolean(
    owner &&
      [owner.resourcePath, owner.resourceName].some(
        (identifier) => identifier && allowedOwnerIdentifiers.has(normalizeResourcePath(identifier))
      )
  );

const bindingOwnerValue = (binding: IafLabelClassificationBinding): string =>
  labelResourceValue(binding.owner ?? binding.category);

const hasPersistedProvisionOwner = (binding: IafLabelClassificationBinding, ownerValue: string | undefined): boolean =>
  Boolean(
    binding.owner &&
      [binding.owner.resourcePath, binding.owner.resourceName].some(
        (identifier) => normalizeResourcePath(identifier) === normalizeResourcePath(ownerValue)
      )
  );

const hasPersistedTypeWithinProvisionOwner = (
  binding: IafLabelClassificationBinding,
  typeValue: string | undefined
): boolean => {
  if (!binding.owner) return false;

  const persistedType = normalizeResourcePath(typeValue);
  return [binding.owner.resourcePath, binding.owner.resourceName].some((identifier) => {
    const ownerPath = normalizeResourcePath(identifier);
    return Boolean(ownerPath && (persistedType === ownerPath || persistedType.startsWith(`${ownerPath}/`)));
  });
};

/**
 * Adapts the configured reported-misconduct tree to the two choices shown in
 * Draken. The configured root is a container, the configured owner is retained
 * for persistence, and category/type are exposed as the editable choices.
 * The Iaf-prefixed symbols are retained until the parallel UI rewrite lands;
 * their behavior is profile-driven and no longer tied to an application name.
 */
export const createIafLabelClassificationModel = (
  labelStructure: readonly Label[] | undefined,
  labelTree: ReportedMisconductLabelTree | undefined,
  legalBases?: readonly string[],
  legalBaseRules: readonly LabelClassificationLegalBaseRule[] = []
): IafLabelClassificationModel => {
  if (!labelTree) {
    throw new Error('The reported-misconduct classification capability is missing label-tree semantics');
  }
  if (labelStructure === undefined) {
    return {
      catalog: { code: `${labelTree.root.resource}_CLASSIFICATION`, displayName: labelTree.root.resource, types: [] },
      bindings: [],
      labelTree,
    };
  }
  const categoryRoot = requireConfiguredRoot(labelStructure, labelTree);
  const bindings: IafLabelClassificationBinding[] = [];

  const visit = (nodes: readonly Label[], owner?: Label) => {
    nodes.forEach((node) => {
      if (isClassification(node, labelTree.categoryClassification)) {
        bindings.push({ owner, category: node, types: findTypeLabels(node.labels, labelTree) });
        return;
      }

      const nextOwner = isClassification(node, labelTree.ownerClassification) ? node : owner;
      if (node.labels?.length) {
        visit(node.labels, nextOwner);
      }
    });
  };

  visit(categoryRoot.labels ?? []);

  const allowedOwnerIdentifiers =
    legalBases === undefined ? undefined : getAllowedOwnerIdentifiers(legalBases, legalBaseRules);
  const filteredBindings = allowedOwnerIdentifiers
    ? bindings.filter(({ owner }) => belongsToAllowedLegalBase(owner, allowedOwnerIdentifiers))
    : bindings;
  const sortedBindings = [...filteredBindings].sort((left, right) =>
    labelDisplayName(left.category).localeCompare(labelDisplayName(right.category), 'sv')
  );

  return {
    catalog: {
      code: `${labelTree.root.resource}_CLASSIFICATION`,
      displayName: labelTree.root.resource,
      types: sortedBindings.map(({ category, types }) => ({
        code: labelCode(category),
        displayName: labelDisplayName(category),
        subtypes: types.map((type) => ({
          code: labelCode(type),
          displayName: labelDisplayName(type),
        })),
      })),
    },
    bindings: sortedBindings,
    labelTree,
  };
};

export const getPersistedIafLabelClassificationState = (
  labelStructure: readonly Label[] | undefined,
  labelTree: ReportedMisconductLabelTree,
  legalBases: readonly string[],
  classification: PersistedIafLabelClassification,
  legalBaseRules: readonly LabelClassificationLegalBaseRule[] = []
): PersistedIafLabelClassificationState => {
  if (!classification.category?.trim() || !classification.type?.trim()) return 'missing-classification';

  const completeModel = createIafLabelClassificationModel(labelStructure, labelTree);
  if (completeModel.bindings.length === 0) return 'legacy-unknown';

  // This strategy persists the selected configured category resource in classification.type.
  // Resolve that exact raw value before considering labels, which may contain stale references.
  const binding = completeModel.bindings.find(
    ({ category }) => normalizeResourcePath(labelResourceValue(category)) === normalizeResourcePath(classification.type)
  );
  if (!binding) {
    // An older category/type may no longer exist in metadata, but its persisted provision-category
    // still identifies the legal-base owner. Preserve that legacy value only while the owner remains
    // available in the current legal-base context; otherwise a legal-base change would silently keep
    // an incompatible classification.
    const persistedCategoryOwner = completeModel.bindings.find((candidate) =>
      hasPersistedProvisionOwner(candidate, classification.category)
    )?.owner;
    const persistedTypeOwner = completeModel.bindings.find((candidate) =>
      hasPersistedTypeWithinProvisionOwner(candidate, classification.type)
    )?.owner;
    if (persistedCategoryOwner && persistedTypeOwner && !hasSameIdentity(persistedCategoryOwner, persistedTypeOwner)) {
      return 'known-inconsistent';
    }

    const persistedOwner = persistedTypeOwner ?? persistedCategoryOwner;
    if (persistedOwner) {
      const contextualModel = createIafLabelClassificationModel(labelStructure, labelTree, legalBases, legalBaseRules);
      const persistedOwnerIsAllowed = contextualModel.bindings.some(
        (candidate) => candidate.owner && hasSameIdentity(candidate.owner, persistedOwner)
      );
      if (!persistedOwnerIsAllowed) return 'known-disallowed-legal-base';
    }

    return 'legacy-unknown';
  }

  const expectedOwner = bindingOwnerValue(binding);
  if (normalizeResourcePath(expectedOwner) !== normalizeResourcePath(classification.category)) {
    return 'known-inconsistent';
  }

  const contextualModel = createIafLabelClassificationModel(labelStructure, labelTree, legalBases, legalBaseRules);
  if (!contextualModel.bindings.some(({ category }) => hasSameIdentity(category, binding.category))) {
    return 'known-disallowed-legal-base';
  }
  if (binding.types.length === 0) return 'known-valid';

  const selectedKnownType = binding.types.find(
    (type) =>
      normalizeResourcePath(labelResourceValue(type)) === normalizeResourcePath(classification.subType) ||
      classification.labels?.some((label) => hasSameIdentity(label, type))
  );
  if (selectedKnownType) return 'known-valid';

  const hasPersistedTypeEvidence =
    Boolean(classification.subType?.trim()) ||
    classification.labels?.some((label) => isClassification(label, labelTree.typeClassification)) === true;
  if (!hasPersistedTypeEvidence) return 'known-missing-required-type';

  const typeKnownInAnotherBinding = completeModel.bindings.some(
    (candidate) =>
      !hasSameIdentity(candidate.category, binding.category) &&
      candidate.types.some(
        (type) =>
          normalizeResourcePath(labelResourceValue(type)) === normalizeResourcePath(classification.subType) ||
          classification.labels?.some((label) => hasSameIdentity(label, type))
      )
  );

  return typeKnownInAnotherBinding ? 'known-inconsistent' : 'legacy-unknown';
};

export const getIafLabelClassificationSelection = (
  model: IafLabelClassificationModel,
  errandLabels: readonly Label[] | undefined,
  classification?: { readonly category?: string; readonly type?: string; readonly subType?: string }
): LabelClassificationSelection => {
  const labels = errandLabels ?? [];
  const bindingFromLabels = model.bindings.find(
    ({ category, types }) =>
      labels.some((label) => hasSameIdentity(label, category)) ||
      types.some((type) => labels.some((label) => hasSameIdentity(label, type)))
  );
  const binding =
    bindingFromLabels ??
    model.bindings.find(({ category }) =>
      [classification?.type, classification?.category].some(
        (resource) =>
          resource && normalizeResourcePath(resource) === normalizeResourcePath(labelResourceValue(category))
      )
    );

  if (!binding) {
    return {};
  }

  const selectedTypeFromLabels = binding.types.find((type) => labels.some((label) => hasSameIdentity(label, type)));
  const selectedType =
    selectedTypeFromLabels ??
    binding.types.find((type) =>
      [classification?.subType, classification?.type].some(
        (resource) => resource && normalizeResourcePath(resource) === normalizeResourcePath(labelResourceValue(type))
      )
    );
  return {
    typeCode: labelCode(binding.category),
    subtypeCode: selectedType ? labelCode(selectedType) : undefined,
  };
};

const isCategoryPath = (resourcePath: string | undefined, rootResource: string): boolean => {
  const path = normalizeResourcePath(resourcePath);
  const root = normalizeResourcePath(rootResource);
  return path === root || path.startsWith(`${root}/`);
};

const isManagedLabel = (model: IafLabelClassificationModel, label: Label): boolean =>
  isCategoryPath(label.resourcePath, model.labelTree.root.resource) ||
  model.bindings.some(
    ({ owner, category, types }) =>
      (owner ? hasSameIdentity(label, owner) : false) ||
      hasSameIdentity(label, category) ||
      types.some((type) => hasSameIdentity(label, type))
  );

const appendUnique = (labels: Label[], label: Label | undefined) => {
  if (label && !labels.some((existingLabel) => hasSameIdentity(existingLabel, label))) {
    labels.push(withoutChildren(label));
  }
};

export interface IafLabelClassificationUpdate {
  readonly labels: Label[];
  readonly categoryLabels: Label[];
  readonly labelsChanged: boolean;
  readonly category: string;
  readonly type: string;
  readonly subType: string;
  readonly requiresSubType: boolean;
}

const hasSameLabelSequence = (currentLabels: readonly Label[], nextLabels: readonly Label[]): boolean =>
  currentLabels.length === nextLabels.length &&
  currentLabels.every((label, index) => label.labels === undefined && hasSameIdentity(label, nextLabels[index]));

export const applyIafLabelClassificationSelection = (
  model: IafLabelClassificationModel,
  currentLabels: readonly Label[] | undefined,
  selection: LabelClassificationSelection
): IafLabelClassificationUpdate => {
  const binding = model.bindings.find(({ category }) => labelCode(category) === selection.typeCode);
  const selectedType = binding?.types.find((type) => labelCode(type) === selection.subtypeCode);
  const labels = (currentLabels ?? []).filter((label) => !isManagedLabel(model, label)).map(withoutChildren);
  const categoryLabels: Label[] = [];

  for (const selectedLabel of [binding?.owner, binding?.category, selectedType]) {
    appendUnique(labels, selectedLabel);
    appendUnique(categoryLabels, selectedLabel);
  }

  return {
    labels,
    categoryLabels,
    labelsChanged: !hasSameLabelSequence(currentLabels ?? [], labels),
    category: binding?.owner ? labelResourceValue(binding.owner) : binding ? labelResourceValue(binding.category) : '',
    type: binding ? labelResourceValue(binding.category) : '',
    subType: selectedType ? labelResourceValue(selectedType) : '',
    requiresSubType: Boolean(binding?.types.length),
  };
};
