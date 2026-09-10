import { type InvestigationAccessState, investigationDocumentAccess } from '../investigation-access';
import type { InvestigationDocumentPlacement, InvestigationProfile } from '../investigation-profile';
import type { InvestigationProfileStatus } from '../investigation-profile-store';

export type InvestigationTabState =
  | 'loading'
  | 'error'
  | 'unavailable'
  | 'not-configured'
  | 'no-access'
  | 'access-error'
  | 'ready';

/**
 * Which tab is asking, and for which errand. The investigation tab is the default so existing
 * callers keep their meaning; a document restricted to reported misconduct only applies when the
 * caller says the errand is one.
 */
export interface InvestigationDocumentContext {
  readonly access?: InvestigationAccessState;
  readonly placement?: InvestigationDocumentPlacement;
  readonly reportedMisconduct?: boolean;
}

const appliesToErrand = (
  document: InvestigationProfile['documents'][number],
  context: InvestigationDocumentContext
): boolean =>
  (document.placement ?? 'investigation') === (context.placement ?? 'investigation') &&
  ((document.appliesTo ?? 'all') === 'all' || context.reportedMisconduct === true);

/** The documents configured for this tab and errand, before the user's access is considered. */
export const configuredInvestigationDocuments = (
  profile: InvestigationProfile | null | undefined,
  context: InvestigationDocumentContext = {}
): InvestigationProfile['documents'] =>
  (profile?.documents ?? []).filter((document) => appliesToErrand(document, context));

/** The documents this user reaches. A document they are not mapped to is not theirs to open. */
export const visibleInvestigationDocuments = (
  profile: InvestigationProfile | null | undefined,
  context: InvestigationDocumentContext = {}
): InvestigationProfile['documents'] =>
  configuredInvestigationDocuments(profile, context).filter(
    (document) => investigationDocumentAccess(context.access ?? { status: 'loading' }, document.key) !== 'hidden'
  );

/** Editing requires an explicit current-errand grant. Missing access never enables a form. */
export const isInvestigationDocumentEditable = (
  document: InvestigationProfile['documents'][number],
  access: InvestigationAccessState
): boolean => investigationDocumentAccess(access, document.key) === 'edit';

/**
 * What an investigation tab shows once a capability flag has made it visible.
 *
 * Visibility no longer depends on the runtime profile, so every unusable profile has to explain
 * itself here rather than the tab silently disappearing. Kept pure so the ordering of these cases
 * is testable without rendering.
 */
export const resolveInvestigationTabState = (
  status: InvestigationProfileStatus,
  profile: InvestigationProfile | null | undefined,
  context: InvestigationDocumentContext = {}
): InvestigationTabState => {
  if (status === 'idle' || status === 'loading') return 'loading';
  if (status === 'error') return 'error';
  // "disabled" means the profile was never requested - not SupportManagement, or an auth route.
  if (status === 'disabled' || !profile) return 'not-configured';
  if (profile.state === 'unavailable') return 'unavailable';
  if (profile.state !== 'active' || configuredInvestigationDocuments(profile, context).length === 0) {
    return 'not-configured';
  }
  if (!context.access || context.access.status === 'loading') return 'loading';
  if (context.access.status === 'error') return 'access-error';
  // Documents exist, but none of them are this user's. Kept apart from "not configured" so the
  // handler is told it is a question of permissions rather than of a missing deployment.
  if (visibleInvestigationDocuments(profile, context).length === 0) return 'no-access';
  return 'ready';
};
