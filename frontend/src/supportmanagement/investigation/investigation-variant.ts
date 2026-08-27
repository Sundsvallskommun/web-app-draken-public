import type { AppConfigFeatures } from '@config/appconfig';
import type { ReactNode } from 'react';

import type { SupportErrandClassificationPlacement } from './iaf-vof-investigation-classification-policy';
import type { InvestigationProfile } from './investigation-profile';

/**
 * The feature flags that turn on one investigation implementation. An application declares which
 * functionality it uses; nothing here or below asks which application is running.
 */
export type InvestigationCapability = 'useAvvikelseInvestigation';

export interface InvestigationTabProps {
  onDirtyChange: (key: string, isDirty: boolean) => void;
}

/**
 * One investigation implementation, named for what it does rather than for who uses it.
 *
 * A module declares the capability flag that enables it, so adding a drake that wants existing
 * functionality is an env change. Adding new functionality is a module registered in the registry.
 */
export interface InvestigationVariantModule {
  readonly id: string;
  /** Label for the errand tab this variant fills. */
  readonly label: string;
  readonly enabledBy: InvestigationCapability;
  /** Where classification is edited, and in which vocabulary, when this variant is in play. */
  resolveClassificationPlacement: (
    profile: InvestigationProfile | null | undefined
  ) => SupportErrandClassificationPlacement;
  renderTab: (props: InvestigationTabProps) => ReactNode;
  /**
   * Notice rendered above the errand tab strip, so a broken profile is visible from any tab rather
   * than only after opening this one. Returns null when there is nothing to say.
   */
  renderNotice?: () => ReactNode;
}

/**
 * Implementations are mutually exclusive, but two flags being on is representable and is a
 * configuration error. First-wins keeps that error deterministic instead of dependent on
 * registration order luck - the same normalisation `resolveCategorizationMode` applies to the
 * two-/three-level pair.
 *
 * The concrete list lives in `investigation-variant-registry.ts`; keeping it out of this module is
 * what lets the selection rules be unit-tested without pulling in every variant's React tree.
 */
export const resolveInvestigationVariant = (
  features: AppConfigFeatures,
  variants: readonly InvestigationVariantModule[]
): InvestigationVariantModule | null => variants.find((variant) => features[variant.enabledBy]) ?? null;

/**
 * Two flags, deliberately: the capability says which implementation, and `useInvestigation` is the
 * master switch that turns the tab off across every variant at once.
 */
export const isInvestigationTabVisible = (
  features: AppConfigFeatures,
  variant: InvestigationVariantModule | null
): boolean => features.useInvestigation && variant !== null;
