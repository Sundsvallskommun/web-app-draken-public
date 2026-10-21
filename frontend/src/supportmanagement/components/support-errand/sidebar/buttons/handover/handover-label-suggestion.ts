import { Label, LabelMapping, MatchReason } from '@common/data-contracts/supportmanagement/data-contracts';
import {
  findLabelPath,
  getCategorizationStructure,
  getClassificationDepth,
  isLabelDeprecated,
} from '@supportmanagement/services/support-label-service';

/** The path in the target's label tree that the handover preview suggests, and on what basis. */
export interface HandoverLabelSuggestion {
  path: Label[];
  matchReason?: MatchReason;
}

/**
 * Turns the preview's per-source-label suggestions into one path to preselect. Each suggested target is
 * resolved by id in the target's categorization tree (a resource path does not follow the resource names,
 * so it is never split) and the deepest path wins. A path that stops above the first selectable level
 * (CATEGORY) or runs through a deprecated label cannot be picked and is no suggestion. Undefined when no
 * suggestion resolves, e.g. a target ROOT label (the tree comes trimmed below it).
 */
export const getHandoverLabelSuggestion = (
  labelStructure: Label[] | undefined,
  mappings: LabelMapping[] | undefined
): HandoverLabelSuggestion | undefined => {
  const structure = getCategorizationStructure(labelStructure);
  const firstSelectableDepth = getClassificationDepth(structure, 'CATEGORY') ?? 0;

  return (mappings ?? [])
    .map((mapping) => ({ path: findLabelPath(structure, mapping.suggestedTargetId), matchReason: mapping.matchReason }))
    .filter(({ path }) => path.length > firstSelectableDepth && !path.some(isLabelDeprecated))
    .reduce<HandoverLabelSuggestion | undefined>(
      (deepest, suggestion) => (!deepest || suggestion.path.length > deepest.path.length ? suggestion : deepest),
      undefined
    );
};

/** Whether the picked path is exactly the suggested one. */
export const isHandoverLabelSuggestionPicked = (
  suggestion: HandoverLabelSuggestion | undefined,
  pickedPath: Label[]
): boolean =>
  !!suggestion &&
  suggestion.path.length === pickedPath.length &&
  suggestion.path.every((label, index) => label.id === pickedPath[index]?.id);
