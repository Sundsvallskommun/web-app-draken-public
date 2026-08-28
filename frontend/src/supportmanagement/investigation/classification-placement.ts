import type { SupportLabelTreeProfile } from '../services/support-label-classification-projector';

/** Which part of the UI persists the errand's classification. */
export type SupportErrandClassificationOwner = 'basics' | 'investigation' | 'unavailable';

/**
 * The shared vocabulary for classification placement: who owns persistence, and which label tree
 * the errand is categorized from. Deliberately says nothing about *which* variant is active - a
 * variant's own policy payload is private to that variant and travels on its own placement type.
 */
export interface SupportErrandClassificationPlacement {
  readonly owner: SupportErrandClassificationOwner;
  /** Absent means the default category-root vocabulary that every other application uses. */
  readonly labelTree?: SupportLabelTreeProfile;
}

/**
 * The placement every application resolves to when no investigation variant claims it:
 * Grundinformation owns classification and renders the ordinary categorization control.
 */
export const defaultBasicsPlacement: SupportErrandClassificationPlacement = Object.freeze({
  owner: 'basics',
});
