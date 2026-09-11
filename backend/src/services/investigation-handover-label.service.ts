import {
  INVESTIGATION_ACCESS_LEX_LABEL,
  isInvestigationHandoverLabelPath,
  isInvestigationLocationLabelClassification,
} from '@/config/investigation-handover-labels';
import { normalizeSupportManagementResourcePath } from '@/config/supportmanagement-path';
import { Errand, Label } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';

/**
 * Resolves one label by its resource path anywhere in the metadata tree.
 *
 * The path is matched against `resourcePath` as a whole and never split into segments: a resource
 * path is not a chain of resource names, and reconstructing it from the levels it passes through
 * resolves the wrong node as soon as two branches share a name.
 */
export const findLabelByResourcePath = (labelStructure: readonly Label[] | undefined, resourcePath: string): Label => {
  const wanted = normalizeSupportManagementResourcePath(resourcePath);
  const matches: Label[] = [];

  const visit = (nodes: readonly Label[] | undefined): void => {
    for (const node of nodes ?? []) {
      if (normalizeSupportManagementResourcePath(node.resourcePath) === wanted) matches.push(node);
      visit(node.labels);
    }
  };
  visit(labelStructure);

  if (matches.length !== 1) {
    throw new HttpException(502, `Label path ${resourcePath} resolved ${matches.length} times in Support Management metadata`);
  }
  return matches[0];
};

const requireLabelId = (label: { id?: string }, context: string): string => {
  if (typeof label.id !== 'string' || label.id.length === 0) {
    throw new HttpException(502, `Support Management ${context} contains a label without id`);
  }
  return label.id;
};

interface HandoverLabelUpdateInput {
  readonly currentLabels: Errand['labels'];
  readonly labelStructure: readonly Label[] | undefined;
  readonly addResourcePaths: readonly string[];
  readonly removeResourcePaths: readonly string[];
}

/**
 * Builds the complete label id list for a handover step.
 *
 * Support Management replaces the label collection wholesale, so every label the errand already
 * carries is repeated here. Only the paths the step names move; the classification labels pass
 * through untouched, which is what keeps this route from becoming a second way to categorise an
 * errand.
 *
 * Removing a path the errand does not carry is a no-op rather than an error: a step describes the
 * state it leaves behind, not a transition from one exact starting point.
 *
 * Returns `undefined` when the errand already has exactly the requested labels, so an unchanged
 * assignment does not spend an errand version.
 */
export const buildInvestigationHandoverLabelUpdate = ({
  currentLabels,
  labelStructure,
  addResourcePaths,
  removeResourcePaths,
}: HandoverLabelUpdateInput): { id: string }[] | undefined => {
  for (const resourcePath of [...addResourcePaths, ...removeResourcePaths]) {
    if (!isInvestigationHandoverLabelPath(resourcePath)) {
      throw new HttpException(400, `${resourcePath} is not a label a handover step may change`);
    }
  }

  const addedIds = addResourcePaths.map(path => requireLabelId(findLabelByResourcePath(labelStructure, path), 'label metadata'));
  const removedIds = new Set(removeResourcePaths.map(path => requireLabelId(findLabelByResourcePath(labelStructure, path), 'label metadata')));

  const currentIds = (currentLabels ?? []).map(label => requireLabelId(label, 'errand response'));
  const keptIds = currentIds.filter(id => !removedIds.has(id));
  const updatedIds = [...new Set([...keptIds, ...addedIds])];

  const unchanged =
    updatedIds.length === currentIds.length && new Set(currentIds).size === updatedIds.length && updatedIds.every(id => currentIds.includes(id));
  if (unchanged) return undefined;

  return updatedIds.map(id => ({ id }));
};

interface MetadataLabelNode {
  readonly resourcePath: string;
  readonly classification: string;
  /** The human-readable name. A resource path is an identity, never something to show a handler. */
  readonly displayName: string;
  /** Depth in the metadata tree, read from the structure rather than counted in the path text. */
  readonly depth: number;
}

/** Indexes the metadata tree by both identities an errand label can be recognised by. */
const indexMetadataLabels = (
  labelStructure: readonly Label[] | undefined,
): { byId: Map<string, MetadataLabelNode>; byPath: Map<string, MetadataLabelNode> } => {
  const byId = new Map<string, MetadataLabelNode>();
  const byPath = new Map<string, MetadataLabelNode>();

  const visit = (nodes: readonly Label[] | undefined, depth: number): void => {
    for (const node of nodes ?? []) {
      const resourcePath = typeof node.resourcePath === 'string' ? node.resourcePath.trim() : '';
      if (resourcePath.length > 0) {
        const indexed: MetadataLabelNode = { resourcePath, classification: node.classification ?? '', displayName: node.displayName ?? '', depth };
        byPath.set(normalizeSupportManagementResourcePath(resourcePath), indexed);
        if (typeof node.id === 'string' && node.id.length > 0) byId.set(node.id, indexed);
      }
      visit(node.labels, depth + 1);
    }
  };
  visit(labelStructure, 0);

  return { byId, byPath };
};

/** The metadata nodes an errand's labels stand for, dropping any the metadata does not describe. */
const resolveErrandMetadataLabels = (currentLabels: Errand['labels'], labelStructure: readonly Label[] | undefined): MetadataLabelNode[] => {
  const { byId, byPath } = indexMetadataLabels(labelStructure);

  return (currentLabels ?? [])
    .map(label => {
      // The id is the identity. An errand label's own resourcePath is only consulted when the id is
      // missing, and even then the metadata node is what carries the classification.
      if (typeof label.id === 'string' && byId.has(label.id)) return byId.get(label.id);
      const resourcePath = typeof label.resourcePath === 'string' ? label.resourcePath.trim() : '';
      return resourcePath.length > 0 ? byPath.get(normalizeSupportManagementResourcePath(resourcePath)) : undefined;
    })
    .filter((node): node is MetadataLabelNode => node !== undefined);
};

/** The resource paths an errand's labels stand for, resolved through the metadata tree. */
export const resolveErrandLabelResourcePaths = (currentLabels: Errand['labels'], labelStructure: readonly Label[] | undefined): string[] =>
  resolveErrandMetadataLabels(currentLabels, labelStructure).map(node => node.resourcePath);

/** Where an errand happened: the path AccessMapper matches on, and the name a handler is shown. */
export interface ErrandLocation {
  readonly resourcePath: string;
  readonly displayName: string;
}

/**
 * The one place an errand concerns.
 *
 * An errand carries its whole location path, not just the leaf: a place four levels down arrives as
 * four labels, one per level. They are all classified as locations, so counting them is not how you
 * find the place - the place is the **deepest** of them. Every ancestor is a broader area, and
 * resolving against one of those would hand the errand to whoever manages a whole region instead of
 * the unit it concerns.
 *
 * Depth comes from the metadata tree rather than from counting separators in the path, so a resource
 * path is never parsed as if it were a chain of names.
 *
 * Two labels at the same depth are a genuine ambiguity - two different places, not two levels of one
 * - and that is reported rather than guessed.
 */
export const resolveErrandLocation = (currentLabels: Errand['labels'], labelStructure: readonly Label[] | undefined): ErrandLocation => {
  const locations = resolveErrandMetadataLabels(currentLabels, labelStructure).filter(node =>
    isInvestigationLocationLabelClassification(node.classification),
  );

  if (locations.length === 0) {
    throw new HttpException(409, 'The errand has no location label, so its unit manager cannot be resolved');
  }

  const deepest = Math.max(...locations.map(node => node.depth));
  const deepestByPath = new Map(
    locations.filter(node => node.depth === deepest).map(node => [normalizeSupportManagementResourcePath(node.resourcePath), node]),
  );

  if (deepestByPath.size > 1) {
    const names = [...deepestByPath.values()].map(node => node.displayName || node.resourcePath);
    throw new HttpException(
      409,
      `The errand carries ${deepestByPath.size} places at the same level (${names.join(', ')}), so its unit manager is ambiguous`,
    );
  }

  const [resourcePath, node] = [...deepestByPath.entries()][0];
  // AccessMapper matches on the path; a handler is shown the name. Falling back to the path keeps a
  // place with no display name readable rather than blank.
  return { resourcePath, displayName: node.displayName || resourcePath };
};

/** Whether the errand is currently with the LEX roles, which the access label is what says. */
export const hasInvestigationAccessLexLabel = (currentLabels: Errand['labels'], labelStructure: readonly Label[] | undefined): boolean => {
  const wanted = normalizeSupportManagementResourcePath(INVESTIGATION_ACCESS_LEX_LABEL);
  return resolveErrandLabelResourcePaths(currentLabels, labelStructure).some(
    resourcePath => normalizeSupportManagementResourcePath(resourcePath) === wanted,
  );
};
