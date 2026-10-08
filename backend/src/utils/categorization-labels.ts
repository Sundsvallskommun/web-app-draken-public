import { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';

/**
 * Some namespaces keep their label tree under a ROOT label (KC: CATEGORIZATION_ROOT, AOT: CATEGORYROOT), other
 * label sets under other roots. The frontend gets the levels below the configured root.
 */
const ROOT_CLASSIFICATION = 'ROOT';

interface MetadataWithLabels {
  labels?: { labelStructure?: Label[] };
}

const isRoot = (label: Label): boolean => label.classification === ROOT_CLASSIFICATION;

/** The children of the configured root, or the whole structure when it has no ROOT labels. */
export const selectCategorizationLabels = (labelStructure: Label[] | undefined, rootResourceName: string | undefined): Label[] | undefined => {
  const roots = (labelStructure ?? []).filter(isRoot);

  if (roots.length === 0) {
    return labelStructure;
  }

  const rootNames = roots.map(root => root.resourceName).join(', ');

  if (!rootResourceName) {
    throw new HttpException(
      500,
      `Label structure has labels classified ${ROOT_CLASSIFICATION} (${rootNames}) but no categorization root is configured for the namespace`,
    );
  }

  const matches = roots.filter(root => root.resourceName === rootResourceName);

  if (matches.length !== 1) {
    throw new HttpException(
      502,
      `Invalid response when reading metadata: expected one label classified ${ROOT_CLASSIFICATION} named ${rootResourceName}, found ${matches.length} (roots: ${rootNames})`,
    );
  }

  return matches[0].labels ?? [];
};

export const withCategorizationLabels = <T extends MetadataWithLabels>(metadata: T, rootResourceName: string | undefined): T => {
  const labelStructure = metadata?.labels?.labelStructure;

  if (!labelStructure) {
    return metadata;
  }

  return { ...metadata, labels: { ...metadata.labels, labelStructure: selectCategorizationLabels(labelStructure, rootResourceName) } };
};
