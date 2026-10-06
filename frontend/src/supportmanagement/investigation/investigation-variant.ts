import type { AppConfigFeatures } from '@config/appconfig';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { hasReachedSupportPhase, type SupportPhaseContext } from '@supportmanagement/services/support-phase-service';
import type { ReactNode } from 'react';

import type { SupportErrandClassificationPlacement } from './classification-placement';
import type { InvestigationAccessState } from './investigation-access';
import type { InvestigationProfile } from './investigation-profile';

/**
 * The feature flags that turn on one investigation implementation. An application declares which
 * functionality it uses; nothing here or below asks which application is running.
 */
export type InvestigationCapability = 'useAvvikelseInvestigation' | 'useAotInvestigation';

export interface InvestigationTabProps {
  readonly access: InvestigationAccessState;
  readonly refreshAccess: () => void;
  onDirtyChange: (key: string, isDirty: boolean) => void;
  /**
   * Brings the tab into view. Spara ärende in the sidebar saves what the tab holds, so a part it
   * could not save is shown to the handler, wherever they are.
   */
  readonly revealTab: () => void;
}

export interface InvestigationCategorizationControlProps {
  readonly disabled: boolean;
}

/** What a phase entry requirement is judged on: the errand, the runtime profile and the label tree. */
export interface InvestigationPhaseEntryContext {
  readonly errand: SupportErrand | undefined;
  readonly profile: InvestigationProfile | null | undefined;
  readonly labelStructure: SupportErrand['labels'];
}

export interface InvestigationPhaseEntryRequirementProps {
  /** Abandons the phase change; the requirement is asked for again on the next attempt. */
  readonly onClose: () => void;
}

/**
 * Something the variant requires before the errand may enter a phase. While it is unmet, the phase
 * change is held and `render` is shown instead, so the handler can deal with it or leave the errand
 * where it is. Shared code only asks; what the requirement is stays the variant's.
 */
interface InvestigationPhaseEntryRequirement {
  /** The workflow phase whose entry the requirement guards. */
  readonly phaseName: string;
  /**
   * What the phase button says while the requirement is unmet. The button then does that, not the phase
   * change, so it must not promise a phase change the handler will not get.
   */
  readonly actionLabel: string;
  readonly isMet: (context: InvestigationPhaseEntryContext) => boolean;
  readonly render: (props: InvestigationPhaseEntryRequirementProps) => ReactNode;
}

export interface InvestigationDetailsHeaderProps {
  readonly access: InvestigationAccessState;
  /** True while the errand page holds unsaved changes, which an errand-moving command would discard. */
  readonly disabled: boolean;
}

/**
 * A second errand tab a variant may fill, for the decision that closes an investigation.
 *
 * Unlike the investigation tab, which a capability flag alone turns on, a decision tab exists only
 * for the errands the variant says it does: the variant decides from the errand and the runtime
 * profile, shared code only asks. A variant with no decision omits the slot and gets no tab.
 */
interface InvestigationDecisionTabSlot {
  /** Label for the errand tab. */
  readonly label: string;
  /**
   * The workflow phase the decision is taken in. The tab is offered once the errand has reached it,
   * so a decision cannot be written while the errand is still being investigated. A slot that names
   * no phase is offered whenever `isVisible` says so, as it always was.
   */
  readonly requiredPhaseName?: string;
  readonly isVisible: (
    errand: SupportErrand | undefined,
    profile: InvestigationProfile | null | undefined,
    access: InvestigationAccessState
  ) => boolean;
  readonly render: (props: InvestigationTabProps) => ReactNode;
}

/**
 * A follow-up across errands - Verksamhetsuppföljning - offered in the overview's sidebar under its own
 * heading, for a variant whose investigations are worth following up across units. A variant without
 * one omits the slot, and the sidebar shows no such section.
 */
/** Who opens the follow-up: the handler roles they hold, and whether they administer the application. */
export interface InvestigationFollowUpViewer {
  readonly roleKeys?: readonly string[];
  readonly superadmin?: boolean;
}

interface InvestigationFollowUpSlot {
  /** The sidebar heading the entry sits under. */
  readonly heading: string;
  /** The sidebar entry, named for how much of the organisation the viewer follows up. */
  readonly label: (viewer: InvestigationFollowUpViewer) => string;
  readonly render: () => ReactNode;
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
  /**
   * The workflow phase the investigation is carried out in. The tab is offered once the errand has
   * reached it - a variant whose work has no phase of its own names none and is never gated.
   */
  readonly requiredPhaseName?: string;
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
  /**
   * The categorization control Grundinformation renders in place of the default two-/three-level
   * ones. Required exactly when \`resolveClassificationPlacement\` returns a placement carrying a
   * \`labelTree\`: a variant bringing its own vocabulary must also bring the control that edits it.
   * A variant categorizing from the default tree omits this and gets the ordinary controls.
   */
  renderCategorizationControl?: (props: InvestigationCategorizationControlProps) => ReactNode;
  /**
   * Errand-level controls rendered at the top of Ärendeuppgifter. A variant with nothing to add
   * omits this and the tab stays as every other drake sees it.
   */
  renderDetailsHeader?: (props: InvestigationDetailsHeaderProps) => ReactNode;
  /** The decision tab, for a variant whose investigation ends in a recorded decision. */
  readonly decisionTab?: InvestigationDecisionTabSlot;
  /**
   * What has to be done before the errand may enter a phase, in the order it has to be done: the first
   * one unmet holds the phase change. A variant with none omits this.
   */
  readonly phaseEntryRequirements?: readonly InvestigationPhaseEntryRequirement[];
  /** The follow-up across errands, for a variant that offers one. */
  readonly followUp?: InvestigationFollowUpSlot;
}

/** The requirement holding a move into the phase `isTargetPhase` names, if any: the first unmet one. */
export const findHeldPhaseEntryRequirement = (
  requirements: readonly InvestigationPhaseEntryRequirement[] | undefined,
  isTargetPhase: (phaseName: string) => boolean,
  context: InvestigationPhaseEntryContext
): InvestigationPhaseEntryRequirement | undefined =>
  requirements?.find((requirement) => isTargetPhase(requirement.phaseName) && !requirement.isMet(context));

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
 * master switch that turns the tab off across every variant at once. On top of the flags the errand
 * has to have reached the phase the variant works in, so the tab appears when the work does.
 */
export const isInvestigationTabVisible = (
  features: AppConfigFeatures,
  variant: InvestigationVariantModule | null,
  phases: SupportPhaseContext
): boolean =>
  features.useInvestigation && variant !== null && hasReachedSupportPhase(variant.requiredPhaseName, phases);

/**
 * The master switch and the phase gate apply to the decision tab exactly as they apply to the
 * investigation tab; beyond them the variant's own slot decides, per errand and profile. No slot,
 * no tab.
 */
export const isDecisionTabVisible = (
  features: AppConfigFeatures,
  variant: InvestigationVariantModule | null,
  errand: SupportErrand | undefined,
  profile: InvestigationProfile | null | undefined,
  phases: SupportPhaseContext,
  access: InvestigationAccessState = { status: 'loading' }
): boolean =>
  features.useInvestigation &&
  variant?.decisionTab?.isVisible(errand, profile, access) === true &&
  hasReachedSupportPhase(variant.decisionTab.requiredPhaseName, phases);
