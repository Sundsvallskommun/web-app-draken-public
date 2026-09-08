import type { AppConfigFeatures } from '@config/appconfig';
import type { ReactNode } from 'react';

import type { SupportApplicationProfile } from '../application/support-application-profile';
import type { SupportErrandClassificationPlacement } from './classification-placement';

export interface InvestigationTabProps {
  onDirtyChange: (key: string, isDirty: boolean) => void;
}

export interface InvestigationCategorizationControlProps {
  readonly disabled: boolean;
}

/**
 * One investigation implementation, named for what it does rather than for who uses it.
 *
 * The application supplies one implementation. Runtime activation uses useInvestigation.
 */
export interface InvestigationModule {
  readonly id: string;
  /** Label for the errand tab this variant fills. */
  readonly label: string;
  /** Where classification is edited, and in which vocabulary, when this variant is in play. */
  resolveClassificationPlacement: (
    profile: SupportApplicationProfile | null | undefined
  ) => SupportErrandClassificationPlacement;
  renderTab: (props: InvestigationTabProps) => ReactNode;
  /**
   * Notice rendered above the errand tab strip, so a broken profile is visible from any tab rather
   * than only after opening this one. Returns null when there is nothing to say.
   */
  renderNotice?: () => ReactNode;
  /**
   * The categorization control Grundinformation renders in place of the default two-/three-level
   * ones. Required exactly when \`resolveClassificationPlacement\` returns a placement carrying a
   * \`labelTree\`: a variant bringing its own vocabulary must also bring the control that edits it.
   * A variant categorizing from the default tree omits this and gets the ordinary controls.
   */
  renderCategorizationControl?: (props: InvestigationCategorizationControlProps) => ReactNode;
}

/** The selected implementation is fixed by the application; runtime only controls activation. */
class InvestigationConfigurationError extends Error {
  // Next.js strips message and name from errors thrown while rendering server components in
  // production but forwards a digest, so global-error can still recognise the error there.
  readonly digest = 'InvestigationConfigurationError';
  constructor() {
    super('Investigation is enabled but this application has no investigation implementation.');
    this.name = 'InvestigationConfigurationError';
  }
}

export const validateInvestigationConfiguration = (
  enabled: boolean,
  implementation: InvestigationModule | null
): void => {
  if (enabled && !implementation) throw new InvestigationConfigurationError();
};

export const isInvestigationTabVisible = (
  features: Pick<AppConfigFeatures, 'useInvestigation'>,
  implementation: InvestigationModule | null
): boolean => {
  validateInvestigationConfiguration(features.useInvestigation, implementation);
  return features.useInvestigation;
};
