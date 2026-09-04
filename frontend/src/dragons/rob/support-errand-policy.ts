import type { SupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';
import { ongoingStatuses, Resolution, Status } from '@supportmanagement/services/support-errand-status';

/** How a recruitment (rekrytering) ends. */
const robResolutionLabels: Readonly<Record<string, string>> = Object.freeze({
  [Resolution.NEED_MET]: 'Behov uppfyllt',
  [Resolution.RECRUITED_FEWER]: 'Rekryterat färre',
  [Resolution.RECRUITED_MORE]: 'Rekryterat fler',
  [Resolution.CANCELLED]: 'Avbruten',
});

/** The recruitment steps are open work: they count, filter and label as ongoing next to the ordinary statuses. */
const robOngoingStatuses: readonly Status[] = Object.freeze([
  ...ongoingStatuses,
  Status.UPSTART,
  Status.PUBLISH_SELECTION,
  Status.INTERNAL_CONTROL_AND_INTERVIEWS,
  Status.REFERENCE_CHECK,
  Status.REVIEW,
  Status.SECURITY_CLEARENCE,
  Status.FEEDBACK_CLOSURE,
  Status.SUBPACKAGE_HANDLED,
]);

export const robSupportErrandPolicy: Partial<SupportErrandPolicy> = {
  ongoingStatuses: robOngoingStatuses,
  resolutions: robResolutionLabels,
  // "Behov uppfyllt" regardless of useClosedAsDefaultResolution; the flag is a Kontakt Sundsvall-style concept.
  defaultResolution: () => Resolution.NEED_MET,
  // A solved recruitment shows its resolution text; an unknown code shows "Löst" instead of the metadata name.
  solvedStatusLabel: (resolution) => robResolutionLabels[resolution] ?? 'Löst',
};
