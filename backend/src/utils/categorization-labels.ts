import { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';

const ROOT_CLASSIFICATION = 'ROOT';
const CATEGORIZATION_ROOT_RESOURCE_PATH = 'CATEGORIZATION_ROOT';

const MAX_DEPTH_BELOW_ROOT = 3;

/** SupportManagement names each label's classification, which the generated contract does not know yet. */
type ClassifiedLabel = Label & { classificationDisplayName?: string };

interface MetadataWithLabels {
  labels?: {
    labelStructure?: Label[];
    /** The classification display name of the categorization root, which is left out of the label structure. */
    classificationDisplayName?: string;
  };
}

const childrenOf = (label: Label): Label[] => label.labels ?? [];

const isCategorizationRoot = (label: Label): boolean =>
  label.classification === ROOT_CLASSIFICATION && label.resourcePath === CATEGORIZATION_ROOT_RESOURCE_PATH;

const structureHasRoots = (labels: Label[]): boolean =>
  labels.some(label => label.classification === ROOT_CLASSIFICATION || structureHasRoots(childrenOf(label)));

const findCategorizationRoots = (labels: Label[]): Label[] =>
  labels.flatMap(label => [...(isCategorizationRoot(label) ? [label] : []), ...findCategorizationRoots(childrenOf(label))]);

const depthOf = (labels: Label[]): number => (labels.length === 0 ? 0 : 1 + Math.max(...labels.map(label => depthOf(childrenOf(label)))));

const requireSingleCategorizationRoot = (labels: Label[]): ClassifiedLabel => {
  const [root, ...extraRoots] = findCategorizationRoots(labels);

  if (!root || extraRoots.length > 0) {
    throw new HttpException(
      502,
      `Invalid response when reading metadata: expected exactly one label classified ${ROOT_CLASSIFICATION} with resourcePath ${CATEGORIZATION_ROOT_RESOURCE_PATH}, found ${root ? 1 + extraRoots.length : 0}`,
    );
  }

  return root;
};

const requireRenderableDepth = (subtree: Label[]): Label[] => {
  const depth = depthOf(subtree);

  if (depth > MAX_DEPTH_BELOW_ROOT) {
    throw new HttpException(
      502,
      `Invalid response when reading metadata: categorization tree is ${depth} levels deep, at most ${MAX_DEPTH_BELOW_ROOT} can be rendered`,
    );
  }

  return subtree;
};

/**
 * Scopes the label structure to the categorization: when the structure has root labels, only the labels below
 * the categorization root are handed on, along with the root's classification display name. The root itself is
 * never picked, since SupportManagement adds it to an errand's labels as an ancestor of the categorization.
 * A structure without root labels is handed on untouched.
 */
export const withCategorizationLabels = <T extends MetadataWithLabels>(metadata: T): T => {
  const labelStructure = metadata.labels?.labelStructure;

  if (!labelStructure || !structureHasRoots(labelStructure)) {
    return metadata;
  }

  const root = requireSingleCategorizationRoot(labelStructure);
  return {
    ...metadata,
    labels: {
      ...metadata.labels,
      labelStructure: requireRenderableDepth(childrenOf(root)),
      classificationDisplayName: root.classificationDisplayName,
    },
  };
};
