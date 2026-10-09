/** Whether a classification category is set; `NONE` is how an errand without one is registered. */
export const hasClassificationCategory = (category: string | undefined): boolean => !!category && category !== 'NONE';

/** The parts of an errand that decide whether it is still an unfinished registration. */
export interface SupportErrandEmptinessInput {
  readonly id?: string;
  readonly classification?: { readonly category?: string; readonly type?: string };
  readonly category?: string;
  readonly type?: string;
}

/**
 * Whether the errand is still a registration draft rather than one that can be handled. Everything
 * on the errand page reads this: the tabs, the attachments, the facility disclosure, "Ta ärende"
 * and the sidebar's handling actions.
 *
 * A missing classification only means "not registered yet" where Grundinformation actually accepts
 * one. It does not when an investigation document owns classification, nor while that capability is
 * unavailable and the control is read-only - so requiring a classification there would leave the
 * errand a draft with no way out, and every handling action disabled with it. The same reasoning
 * already keeps the Grundinformation form schema from requiring fields it does not render.
 */
export const isSupportErrandEmpty = (
  errand: SupportErrandEmptinessInput | undefined | null,
  basicsAcceptsClassification: boolean,
  categorizesByLabelPaths = false
): boolean => {
  if (!errand?.id) return true;
  if (!basicsAcceptsClassification) return false;
  // In a label tree the category field holds the label path. An errand from before the tree, which carries only a
  // classification, still counts as categorized (LEGACY_CLASSIFICATION).
  if (categorizesByLabelPaths) return !errand.category && !hasClassificationCategory(errand.classification?.category);

  return (
    !errand.classification ||
    errand.classification.category === 'NONE' ||
    errand.classification.type === 'NONE' ||
    errand.category === '' ||
    errand.type === ''
  );
};
