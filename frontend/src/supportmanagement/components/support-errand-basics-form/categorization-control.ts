import type {
  IafVofInvestigationClassificationLabelTree,
  SupportErrandClassificationPlacement,
} from '@supportmanagement/investigation/iaf-vof-investigation-classification-policy';

export type CategorizationMode = 'two-level' | 'three-level' | 'none';

export interface CategorizationFeatureFlags {
  readonly useTwoLevelCategorization: boolean;
  readonly useThreeLevelCategorization: boolean;
}

export type CategorizationControl =
  | { readonly kind: 'none' }
  | { readonly kind: 'two-level' }
  | { readonly kind: 'three-level' }
  | {
      readonly kind: 'iaf-vof';
      readonly disabled: boolean;
      readonly labelTree: IafVofInvestigationClassificationLabelTree;
    };

/**
 * The deployment flags encode a single choice as two booleans, so both-true and
 * both-false are representable. Normalizing them here keeps the illegal states
 * out of every consumer.
 */
export const resolveCategorizationMode = ({
  useTwoLevelCategorization,
  useThreeLevelCategorization,
}: CategorizationFeatureFlags): CategorizationMode => {
  if (useThreeLevelCategorization) return 'three-level';
  if (useTwoLevelCategorization) return 'two-level';
  return 'none';
};

/**
 * Selects which categorization control Grundinformation renders, from the
 * deployment mode and the runtime classification placement. The IAF/VOF label
 * tree is a different vocabulary rather than a variant of the default one, so
 * the placement decides first and the mode only selects between default controls.
 */
export const resolveCategorizationControl = (
  mode: CategorizationMode,
  placement: SupportErrandClassificationPlacement
): CategorizationControl => {
  if (placement.categorization === 'iaf-vof') {
    // The investigation document owns the control when it is active. While the
    // capability is unavailable the control stays visible but read-only, so a
    // required field is never silently absent.
    if (mode !== 'three-level' || placement.owner === 'investigation') return { kind: 'none' };
    return { kind: 'iaf-vof', disabled: placement.owner === 'unavailable', labelTree: placement.policy.labelTree };
  }

  // Every non-IAF/VOF application resolves to owner "basics" today. The guard is
  // kept so a future placement change fails closed instead of double-rendering.
  if (placement.owner !== 'basics' || mode === 'none') return { kind: 'none' };
  return { kind: mode };
};
