import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';

import type { LabelClassificationCatalog, LabelClassificationSelection } from './label-classification.types';

const CATEGORY_ROOT = 'CATEGORY';

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

/**
 * Adapts the IAF SupportManagement label tree to the two choices shown in Draken.
 * CATEGORY is a container, provision-category is retained for persistence, and
 * only category/type are exposed as Avvikelsetyp/Underkategori.
 */
export const createIafLabelClassificationModel = (
  labelStructure: readonly Label[] | undefined
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

  const sortedBindings = [...bindings].sort((left, right) =>
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

  appendUnique(labels, binding?.owner);
  appendUnique(labels, binding?.category);
  appendUnique(labels, selectedType);

  return {
    labels,
    labelsChanged: !hasSameLabelSequence(currentLabels ?? [], labels),
    category: binding?.owner ? labelResourceValue(binding.owner) : binding ? labelResourceValue(binding.category) : '',
    type: binding ? labelResourceValue(binding.category) : '',
    subType: selectedType ? labelResourceValue(selectedType) : '',
    requiresSubType: Boolean(binding?.types.length),
  };
};
