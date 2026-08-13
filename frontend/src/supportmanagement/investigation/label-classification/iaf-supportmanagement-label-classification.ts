import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';

import type { LabelClassificationCatalog, LabelClassificationSelection } from './label-classification.types';

const CATEGORY_ROOT = 'CATEGORY';
const HSL_OWNER_IDENTIFIERS = ['CATEGORY/HSL', 'HSL'] as const;
const SOL_LSS_OWNER_IDENTIFIERS = ['CATEGORY/SOL_LSS', 'SOL_LSS'] as const;

export const IAF_LEGAL_BASE = {
  HSL: 'HSL',
  LSS: 'LSS',
  SOL: 'SOL',
} as const;

export type IafLegalBase = (typeof IAF_LEGAL_BASE)[keyof typeof IAF_LEGAL_BASE];

const normalizeClassification = (classification: string | undefined): string =>
  (classification ?? '').trim().replaceAll('_', '-').toUpperCase();

const normalizeResourcePath = (resourcePath: string | undefined): string =>
  (resourcePath ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .toUpperCase();

const isClassification = (label: Label, classification: string): boolean =>
  normalizeClassification(label.classification) === classification;

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

const findCategoryRoot = (labelStructure: readonly Label[]): Label | undefined =>
  labelStructure.find(
    (label) =>
      normalizeResourcePath(label.resourcePath || label.resourceName) === CATEGORY_ROOT ||
      isClassification(label, 'CATEGORY-ROOT')
  );

const findTypeLabels = (labels: readonly Label[] | undefined): Label[] => {
  const typeLabels: Label[] = [];

  const visit = (nodes: readonly Label[]) => {
    nodes.forEach((node) => {
      if (isClassification(node, 'TYPE')) {
        typeLabels.push(node);
        return;
      }

      if (!isClassification(node, 'CATEGORY') && node.labels?.length) {
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

const getAllowedOwnerIdentifiers = (legalBases: readonly string[]): ReadonlySet<string> => {
  const allowedOwnerIdentifiers = new Set<string>();
  if (legalBases.includes(IAF_LEGAL_BASE.HSL)) {
    HSL_OWNER_IDENTIFIERS.forEach((identifier) => allowedOwnerIdentifiers.add(identifier));
  }
  if (legalBases.includes(IAF_LEGAL_BASE.SOL) || legalBases.includes(IAF_LEGAL_BASE.LSS)) {
    SOL_LSS_OWNER_IDENTIFIERS.forEach((identifier) => allowedOwnerIdentifiers.add(identifier));
  }
  return allowedOwnerIdentifiers;
};

const belongsToAllowedLegalBase = (owner: Label | undefined, allowedOwnerIdentifiers: ReadonlySet<string>): boolean =>
  Boolean(
    owner &&
      [owner.resourcePath, owner.resourceName].some(
        (identifier) => identifier && allowedOwnerIdentifiers.has(normalizeResourcePath(identifier))
      )
  );

/**
 * Adapts the IAF SupportManagement label tree to the two choices shown in Draken.
 * CATEGORY is a container, provision-category is retained for persistence, and
 * only category/type are exposed as Avvikelsetyp/Underkategori.
 */
export const createIafLabelClassificationModel = (
  labelStructure: readonly Label[] | undefined,
  legalBases?: readonly string[]
): IafLabelClassificationModel => {
  const structure = labelStructure ?? [];
  const categoryRoot = findCategoryRoot(structure);
  const searchRoots = categoryRoot?.labels ?? structure;
  const bindings: IafLabelClassificationBinding[] = [];

  const visit = (nodes: readonly Label[], owner?: Label) => {
    nodes.forEach((node) => {
      if (isClassification(node, 'CATEGORY')) {
        bindings.push({ owner, category: node, types: findTypeLabels(node.labels) });
        return;
      }

      const nextOwner = isClassification(node, 'PROVISION-CATEGORY') ? node : owner;
      if (node.labels?.length) {
        visit(node.labels, nextOwner);
      }
    });
  };

  visit(searchRoots);

  const allowedOwnerIdentifiers = legalBases === undefined ? undefined : getAllowedOwnerIdentifiers(legalBases);
  const filteredBindings = allowedOwnerIdentifiers
    ? bindings.filter(({ owner }) => belongsToAllowedLegalBase(owner, allowedOwnerIdentifiers))
    : bindings;
  const sortedBindings = [...filteredBindings].sort((left, right) =>
    labelDisplayName(left.category).localeCompare(labelDisplayName(right.category), 'sv')
  );

  return {
    catalog: {
      code: 'IAF_SUPPORTMANAGEMENT_CLASSIFICATION',
      displayName: 'IAF',
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
  };
};

export const getPersistedIafLabelClassificationState = (
  labelStructure: readonly Label[] | undefined,
  legalBases: readonly string[],
  classification: PersistedIafLabelClassification
): PersistedIafLabelClassificationState => {
  if (!classification.category?.trim() || !classification.type?.trim()) return 'missing-classification';

  const completeModel = createIafLabelClassificationModel(labelStructure);
  if (completeModel.bindings.length === 0) return 'legacy-unknown';

  // Support Management persists the selected CATEGORY resource in classification.type.
  // Resolve that exact raw value before considering labels, which may contain stale references.
  const binding = completeModel.bindings.find(
    ({ category }) => normalizeResourcePath(labelResourceValue(category)) === normalizeResourcePath(classification.type)
  );
  if (!binding) return 'legacy-unknown';

  const expectedOwner = binding.owner ? labelResourceValue(binding.owner) : labelResourceValue(binding.category);
  if (normalizeResourcePath(expectedOwner) !== normalizeResourcePath(classification.category)) {
    return 'known-inconsistent';
  }

  const contextualModel = createIafLabelClassificationModel(labelStructure, legalBases);
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
    classification.labels?.some((label) => isClassification(label, 'TYPE')) === true;
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

const isCategoryPath = (resourcePath: string | undefined): boolean => {
  const path = normalizeResourcePath(resourcePath);
  return path === CATEGORY_ROOT || path.startsWith(`${CATEGORY_ROOT}/`);
};

const isManagedLabel = (model: IafLabelClassificationModel, label: Label): boolean =>
  isCategoryPath(label.resourcePath) ||
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
