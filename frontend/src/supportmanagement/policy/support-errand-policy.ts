import type { AppConfigFeatures } from '@config/appconfig';

import { ongoingStatuses, Resolution, Status } from '../services/support-errand-status';
import { kontaktSundsvallResolutionLabels } from './resolution-label-presets';

/**
 * What one dragon decides about support errands: which statuses count as open work, which
 * resolutions an errand can be closed with, and what the overview says about a solved one.
 *
 * Shared supportmanagement code reads this through `getSupportErrandPolicy()` instead of asking
 * which application is running. A dragon module (`src/dragons/<id>/`) overrides the members it
 * needs to; the shell merges those over `defaultSupportErrandPolicy` at startup.
 */
export interface SupportErrandPolicy {
  /** Statuses treated as "open/ongoing" in overview counts, filters and status labels. */
  readonly ongoingStatuses: readonly Status[];
  /** Resolution code -> Swedish label offered when closing an errand and shown for its current resolution. */
  readonly resolutions: Readonly<Record<string, string>>;
  /**
   * Resolution preselected in the close dialog when the errand has none.
   *
   * A function of the feature flags rather than a value: `useClosedAsDefaultResolution` can be
   * flipped by Adminpanel after startup (`applyRuntimeFeatureFlags`), so it has to be read when
   * the dialog opens, not when the dragon is composed. A dragon whose default never depends on
   * the flag ignores the argument.
   */
  readonly defaultResolution: (features: Pick<AppConfigFeatures, 'useClosedAsDefaultResolution'>) => Resolution;
  /**
   * Text for the overview status label of a solved errand, keyed by resolution. `undefined` means
   * the resolution has no label of its own and the status's metadata display name is shown.
   */
  readonly solvedStatusLabel: (resolution: string) => string | undefined;
}

/**
 * Compact labels for the overview status pill of a solved errand. Only the resolutions that change
 * what the pill says are listed; every other resolution shows the status's display name from
 * metadata. This is a different vocabulary from `resolutions`: the pill says "Överlämnat" where the
 * close dialog says "Registrerat i annat system".
 */
const defaultSolvedStatusLabels: Readonly<Record<string, string>> = Object.freeze({
  [Resolution.REGISTERED_EXTERNAL_SYSTEM]: 'Överlämnat',
  [Resolution.CLOSED]: 'Avslutat',
  [Resolution.BACK_TO_MANAGER]: 'Åter till chef',
  [Resolution.BACK_TO_HR]: 'Åter till HR',
  [Resolution.BACK_TO_CONTACT_SUNDSVALL]: 'Felskickat',
});

/** The policy every dragon starts from. Kontakt Sundsvall's vocabulary, because that is where Draken started. */
export const defaultSupportErrandPolicy: SupportErrandPolicy = Object.freeze<SupportErrandPolicy>({
  ongoingStatuses,
  resolutions: kontaktSundsvallResolutionLabels,
  defaultResolution: ({ useClosedAsDefaultResolution }) =>
    useClosedAsDefaultResolution ? Resolution.CLOSED : Resolution.SOLVED,
  solvedStatusLabel: (resolution) => defaultSolvedStatusLabels[resolution],
});

// A module-level singleton rather than a React context: one process serves exactly one dragon,
// the policy is fixed before the first render, and plain functions (services, hooks' callbacks)
// need it as much as components do. A context would add providers and hooks for a value that
// never changes. Each Next.js module graph (server components, SSR, browser) gets its own copy,
// which is why the shell bootstraps in every graph - see `src/shell/README.md`.
let configuredPolicy: SupportErrandPolicy | undefined;

/**
 * Called once by the shell at startup (`@shell/bootstrap`). Calling it again replaces the policy;
 * production never does, and the unit tests rely on being able to.
 */
export const configureSupportErrandPolicy = (policy: SupportErrandPolicy): void => {
  configuredPolicy = policy;
};

/** Throws, rather than falling back to defaults, so a module graph the shell missed fails on first use. */
export const getSupportErrandPolicy = (): SupportErrandPolicy => {
  if (!configuredPolicy) {
    throw new Error(
      "Support errand policy is not configured. The shell must import '@shell/bootstrap' before supportmanagement code runs."
    );
  }
  return configuredPolicy;
};
