import { normalizeSupportManagementResourcePath } from '@/config/supportmanagement-path';
import type { Errand, Label } from '@/data-contracts/supportmanagement/data-contracts';

import { withoutEmptyLabelRoots } from './investigation-handover-label.service';

/**
 * The label ids from the top of the metadata tree down to the label at `resourcePath`, or `undefined` when
 * the path is not in the tree exactly once. The path is matched whole, never split into names.
 */
const findLabelChain = (labelStructure: readonly Label[] | undefined, resourcePath: string): string[] | undefined => {
  const wanted = normalizeSupportManagementResourcePath(resourcePath);
  const chains: string[][] = [];
  const visit = (nodes: readonly Label[] | undefined, ancestors: string[]): void => {
    for (const node of nodes ?? []) {
      if (typeof node.id !== 'string' || node.id === '') continue;
      const chain = [...ancestors, node.id];
      if (normalizeSupportManagementResourcePath(node.resourcePath) === wanted) chains.push(chain);
      visit(node.labels, chain);
    }
  };
  visit(labelStructure, []);
  return chains.length === 1 ? chains[0] : undefined;
};

interface LabelPresenceInput {
  readonly currentLabels: Errand['labels'];
  readonly labelStructure: readonly Label[] | undefined;
  readonly resourcePath: string;
  /** Whether the errand should carry the label. */
  readonly present: boolean;
}

/**
 * The complete label id list with one label present or absent, every other label as the errand carries it.
 *
 * A label is added with its chain up to the top of the tree, as registration adds them, and taken away on
 * its own; a root left with nothing beneath it goes too (`withoutEmptyLabelRoots`). Support Management
 * replaces the label collection wholesale, so the result repeats every label the errand keeps.
 *
 * Returns `undefined` when there is nothing to write: the errand already looks that way, or the label is
 * not in the metadata, so a namespace that has not configured it is left alone.
 */
export const buildLabelPresenceUpdate = ({
  currentLabels,
  labelStructure,
  resourcePath,
  present,
}: LabelPresenceInput): { id: string }[] | undefined => {
  const chain = findLabelChain(labelStructure, resourcePath);
  if (!chain) return undefined;
  const labelId = chain[chain.length - 1];

  const currentIds = (currentLabels ?? []).map(label => label.id).filter((id): id is string => typeof id === 'string' && id !== '');
  const updatedIds = present
    ? [...new Set([...currentIds, ...chain])]
    : withoutEmptyLabelRoots(
        currentIds.filter(id => id !== labelId),
        labelStructure,
      );

  const unchanged = updatedIds.length === currentIds.length && updatedIds.every(id => currentIds.includes(id));
  return unchanged ? undefined : updatedIds.map(id => ({ id }));
};
