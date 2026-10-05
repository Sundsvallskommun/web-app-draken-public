import { Label } from '@common/data-contracts/supportmanagement/data-contracts';

import { resolveErrandLabelPath } from './support-label-service';
import { SupportMetadata } from './support-metadata-service';

/**
 * Helpers for the labels categorization. The BFF hands on the label tree below its categorization root,
 * so the tree here starts at level 1. Its levels are picked two at a time, each pair in its own
 * combobox: the first combobox covers levels 1 and 2, the second levels 3 and 4. The root is never
 * picked, since SupportManagement adds it to the errand as an ancestor of the picked labels.
 */

/** A path through the label tree, level 1 first, and what it means for the two comboboxes. */
export interface LabelsSelection {
  path: Label[];
  /** The choice in the first combobox: the level 2 label, or a level 1 label that has nothing below it. */
  first?: Label;
  /** The choice in the second combobox: the level 4 label, or a level 3 label that has nothing below it. */
  second?: Label;
}

export const hasChildLabels = (label?: Label): boolean => (label?.labels?.length ?? 0) > 0;

const toLabelsSelection = (path: Label[]): LabelsSelection => ({
  path,
  first: path[1] ?? path[0],
  second: path[3] ?? path[2],
});

/** The errand's labels, matched against the label tree. */
export const getErrandLabelsSelection = (
  errandLabels: Label[] | undefined,
  metadata: SupportMetadata | undefined
): LabelsSelection => toLabelsSelection(resolveErrandLabelPath(errandLabels, metadata));

/** The path to a picked label, with the levels above it filled in from the tree. */
export const selectLabel = (label: Label | undefined, metadata: SupportMetadata | undefined): LabelsSelection =>
  toLabelsSelection(label ? resolveErrandLabelPath([label], metadata) : []);

/** A selection is complete once nothing is left to pick below the last choice. */
export const isCompleteLabelsSelection = ({ first, second }: LabelsSelection): boolean =>
  !!first && (!!second || !hasChildLabels(first));

/**
 * The form requires a category and a type. They hold the resource paths of the choices in the first and
 * second combobox; a first choice with nothing below it stands in for the type as well.
 */
export const toLabelsFormValues = ({ first, second }: LabelsSelection): { category: string; type: string } => ({
  category: first?.resourcePath ?? '',
  type: second?.resourcePath ?? (first && !hasChildLabels(first) ? first.resourcePath ?? '' : ''),
});

const flattenLabelTree = (labels: Label[] = []): Label[] =>
  labels.flatMap((label) => [label, ...flattenLabelTree(label.labels)]);

/**
 * The errand's labels with its categorization replaced by the selection. Labels outside the label tree,
 * such as free tags and the root, are kept. Only a complete selection is written, so an unfinished change
 * never leaves the labels of the previous selection behind.
 */
export const withLabelsSelection = (
  errandLabels: Label[] | undefined,
  selection: LabelsSelection,
  metadata: SupportMetadata | undefined
): Label[] => {
  const treeLabels = flattenLabelTree(metadata?.labels?.labelStructure);
  const treeIds = new Set(treeLabels.map((label) => label.id).filter((id): id is string => !!id));
  const treePaths = new Set(treeLabels.map((label) => label.resourcePath).filter((path): path is string => !!path));
  const isInTree = (label: Label) =>
    (!!label.id && treeIds.has(label.id)) || (!!label.resourcePath && treePaths.has(label.resourcePath));

  return [
    ...(errandLabels ?? []).filter((label) => !isInTree(label)),
    ...(isCompleteLabelsSelection(selection) ? selection.path : []),
  ];
};
