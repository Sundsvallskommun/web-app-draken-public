import type { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import type {
  ClassificationSpec,
  LabelIdReference,
  ResolvedSupportErrandClassification,
  SupportErrandClassificationSelection,
} from '@/supportmanagement/config/support-investigation-classification';
import { normalizeSupportManagementResourcePath } from '@/supportmanagement/config/supportmanagement-path';

export interface AvvikelseClassificationLabelTree {
  readonly root: Readonly<{ resource: string; classification: string }>;
  readonly ownerClassification: string;
  readonly categoryClassification: string;
  readonly typeClassification: string;
}

/**
 * One resolvable path through the Support Management label tree.
 *
 * NOTE: the mapping to `classification` is deliberately shifted by one level, so the field
 * names do not line up with the metadata classification strings they carry:
 *
 *   configured owner node (`owner`)    -> classification.category
 *   configured category (`category`)   -> classification.type
 *   configured type nodes (`types`)    -> neither field; contribute selected label ids only
 *
 * When there is no configured owner ancestor, `classification.category` falls back to the
 * category node, so category and type then hold the same resource. This mapping is an invariant
 * of the fixed IAF/VOF investigation classification rule. The
 * frontend performs the same mapping and documents it at
 * `frontend/src/avvikelse/label-classification/avvikelse-supportmanagement-label-classification.ts`
 * ("Support Management persists the selected CATEGORY resource in classification.type").
 * Keep the two in step — they are two implementations of one rule.
 */
interface SupportErrandClassificationBinding {
  owner?: Label;
  category: Label;
  types: Label[];
}

interface SupportErrandClassificationMetadata {
  bindings: SupportErrandClassificationBinding[];
  managedLabels: Label[];
}

const normalizeLabelClassification = (classification: string | undefined): string => (classification ?? '').trim().replaceAll('_', '-').toUpperCase();

const normalizeLabelResource = normalizeSupportManagementResourcePath;

const getLabelResource = (label: Label): string =>
  typeof label.resourcePath === 'string' && label.resourcePath.trim().length > 0 ? label.resourcePath : label.resourceName;

const requireMetadataLabelResource = (label: Label): string => {
  if (typeof label.resourcePath === 'string' && label.resourcePath.trim().length > 0) return label.resourcePath;
  if (typeof label.resourceName === 'string' && label.resourceName.trim().length > 0) return label.resourceName;
  throw new HttpException(502, 'Support Management classification metadata contains a label without resource');
};

const findClassificationTypeLabels = (labels: readonly Label[] | undefined, labelTree: AvvikelseClassificationLabelTree): Label[] => {
  const types: Label[] = [];

  const visit = (nodes: readonly Label[]) => {
    for (const node of nodes) {
      const classification = normalizeLabelClassification(node.classification);
      if (classification === normalizeLabelClassification(labelTree.typeClassification)) {
        types.push(node);
      } else if (classification !== normalizeLabelClassification(labelTree.categoryClassification) && node.labels?.length) {
        visit(node.labels);
      }
    }
  };

  visit(labels ?? []);
  return types;
};

const getSupportErrandClassificationMetadata = (
  labelStructure: readonly Label[],
  labelTree: AvvikelseClassificationLabelTree,
): SupportErrandClassificationMetadata => {
  const bindings: SupportErrandClassificationBinding[] = [];

  const visit = (nodes: readonly Label[], owner?: Label) => {
    for (const node of nodes) {
      const classification = normalizeLabelClassification(node.classification);
      if (classification === normalizeLabelClassification(labelTree.categoryClassification)) {
        bindings.push({ owner, category: node, types: findClassificationTypeLabels(node.labels, labelTree) });
        continue;
      }

      const nextOwner = classification === normalizeLabelClassification(labelTree.ownerClassification) ? node : owner;
      if (node.labels?.length) visit(node.labels, nextOwner);
    }
  };

  const categoryRoots = labelStructure.filter(label => {
    const classification = normalizeLabelClassification(label.classification);
    return (
      classification === normalizeLabelClassification(labelTree.root.classification) &&
      normalizeLabelResource(getLabelResource(label)) === normalizeLabelResource(labelTree.root.resource)
    );
  });
  if (categoryRoots.length !== 1) {
    throw new HttpException(
      502,
      `Support Management classification metadata expected one configured root ${labelTree.root.resource}/${labelTree.root.classification}, found ${categoryRoots.length}`,
    );
  }
  const categoryRoot = categoryRoots[0];
  if (categoryRoot?.labels?.length) visit(categoryRoot.labels);
  if (bindings.length === 0) {
    throw new HttpException(
      502,
      `Support Management classification metadata contains no ${labelTree.categoryClassification} labels under the configured root`,
    );
  }
  const managedLabels: Label[] = [];
  const collectManagedLabels = (labels: readonly Label[]) => {
    for (const label of labels) {
      managedLabels.push(label);
      if (label.labels?.length) collectManagedLabels(label.labels);
    }
  };
  collectManagedLabels([categoryRoot]);

  return { bindings, managedLabels };
};

const requireMetadataLabelId = (label: Label): string => {
  if (typeof label.id === 'string' && label.id.length > 0) return label.id;
  throw new HttpException(502, 'Support Management classification metadata contains a label without id');
};

const buildClassificationMetadataIds = (labels: readonly Label[]): Map<string, Label> => {
  const metadataIds = new Map<string, Label>();
  for (const label of labels) {
    const id = requireMetadataLabelId(label);
    if (metadataIds.has(id)) {
      throw new HttpException(502, 'Support Management classification metadata contains duplicate label ids');
    }
    metadataIds.set(id, label);
  }
  return metadataIds;
};

const bindingMatchesClassification = (binding: SupportErrandClassificationBinding, classification: ClassificationSpec): boolean => {
  const categoryLabel = binding.owner ?? binding.category;
  return (
    normalizeLabelResource(requireMetadataLabelResource(categoryLabel)) === normalizeLabelResource(classification.category) &&
    normalizeLabelResource(requireMetadataLabelResource(binding.category)) === normalizeLabelResource(classification.type)
  );
};

const requireMatchingClassificationBinding = (
  bindings: readonly SupportErrandClassificationBinding[],
  classification: ClassificationSpec,
): SupportErrandClassificationBinding => {
  for (const binding of bindings) {
    for (const label of [...(binding.owner ? [binding.owner] : []), binding.category, ...binding.types]) {
      requireMetadataLabelResource(label);
    }
  }

  const matches = bindings.filter(binding => bindingMatchesClassification(binding, classification));
  if (matches.length === 0) {
    throw new HttpException(400, 'Classification does not match the configured Support Management label tree');
  }
  if (matches.length > 1) {
    throw new HttpException(502, 'Support Management classification metadata contains an ambiguous configured category path');
  }
  return matches[0];
};

const resolveSubmittedClassificationLabelIds = (
  binding: SupportErrandClassificationBinding,
  categoryLabels: readonly LabelIdReference[],
): string[] => {
  const submittedIds = categoryLabels.map(label => label.id);
  const submittedIdSet = new Set(submittedIds);
  if (submittedIdSet.size !== submittedIds.length) {
    throw new HttpException(400, 'Classification label ids must be unique');
  }

  const ownerId = binding.owner ? requireMetadataLabelId(binding.owner) : undefined;
  const categoryId = requireMetadataLabelId(binding.category);
  const typeIds = binding.types.map(type => requireMetadataLabelId(type));
  const selectedTypeIds = typeIds.filter(id => submittedIdSet.has(id));
  const expectedSelectedTypeCount = typeIds.length > 0 ? 1 : 0;
  if (selectedTypeIds.length !== expectedSelectedTypeCount) {
    throw new HttpException(400, 'Classification must contain exactly one valid undercategory when required');
  }

  const expectedIds = [...(ownerId ? [ownerId] : []), categoryId, ...selectedTypeIds];
  if (submittedIds.length !== expectedIds.length || submittedIds.some(id => !expectedIds.includes(id))) {
    throw new HttpException(400, 'Classification label ids do not match the selected configured category path');
  }
  return expectedIds;
};

/**
 * Validates a submitted classification against the configured metadata tree and returns the canonical
 * resource names plus the exact label ids that path implies. Throws 400 for a payload that does not
 * match the tree, and 502 when the metadata itself is unusable.
 */
export const resolveAvvikelseClassification = (
  data: SupportErrandClassificationSelection,
  labelStructure: readonly Label[] | undefined,
  labelTree: AvvikelseClassificationLabelTree,
): ResolvedSupportErrandClassification => {
  if (!labelStructure) {
    throw new HttpException(502, 'Support Management classification metadata is unavailable');
  }

  const { bindings, managedLabels } = getSupportErrandClassificationMetadata(labelStructure, labelTree);
  const metadataIds = buildClassificationMetadataIds(managedLabels);
  const binding = requireMatchingClassificationBinding(bindings, data.classification);
  const expectedIds = resolveSubmittedClassificationLabelIds(binding, data.categoryLabels);

  return {
    classification: {
      category: binding.owner ? requireMetadataLabelResource(binding.owner) : requireMetadataLabelResource(binding.category),
      type: requireMetadataLabelResource(binding.category),
    },
    categoryLabels: expectedIds.map(id => ({ id })),
    managedCategoryLabelIds: [...metadataIds.keys()],
    managedRootResource: labelTree.root.resource,
  };
};
