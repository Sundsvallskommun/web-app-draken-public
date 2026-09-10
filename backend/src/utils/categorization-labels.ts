import { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';

export const ROOT_CLASSIFICATION = 'ROOT';
export const CATEGORIZATION_ROOT_RESOURCE_PATH = 'CATEGORYROOT';

const MAX_DEPTH_BELOW_ROOT = 3;

interface MetadataWithLabels {
  labels?: { labelStructure?: Label[] };
}

const childrenOf = (label: Label): Label[] => label.labels ?? [];

const isCategorizationRoot = (label: Label): boolean =>
  label.classification === ROOT_CLASSIFICATION && label.resourcePath === CATEGORIZATION_ROOT_RESOURCE_PATH;

const structureHasRoots = (labels: Label[]): boolean =>
  labels.some(label => label.classification === ROOT_CLASSIFICATION || structureHasRoots(childrenOf(label)));

const findCategorizationRoots = (labels: Label[]): Label[] =>
  labels.flatMap(label => [...(isCategorizationRoot(label) ? [label] : []), ...findCategorizationRoots(childrenOf(label))]);

const depthOf = (labels: Label[]): number => (labels.length === 0 ? 0 : 1 + Math.max(...labels.map(label => depthOf(childrenOf(label)))));

const requireSingleCategorizationRoot = (labels: Label[]): Label => {
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

export const selectCategorizationLabels = (labelStructure: Label[] | undefined): Label[] | undefined => {
  const structure = labelStructure ?? [];

  if (!structureHasRoots(structure)) {
    return labelStructure;
  }

  return requireRenderableDepth(childrenOf(requireSingleCategorizationRoot(structure)));
};

export const withCategorizationLabels = <T extends MetadataWithLabels>(metadata: T): T => {
  const labelStructure = metadata.labels?.labelStructure;

  if (!labelStructure) {
    return metadata;
  }

  return { ...metadata, labels: { ...metadata.labels, labelStructure: selectCategorizationLabels(labelStructure) } };
};
