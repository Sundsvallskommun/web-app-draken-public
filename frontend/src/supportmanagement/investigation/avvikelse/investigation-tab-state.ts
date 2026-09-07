import type { InvestigationProfile } from '../investigation-profile';
import type { InvestigationProfileStatus } from '../investigation-profile-store';

export type InvestigationTabState = 'loading' | 'error' | 'unavailable' | 'not-configured' | 'no-access' | 'ready';

/** The documents this user reaches. A document they are not mapped to is not theirs to open. */
export const visibleInvestigationDocuments = (
  profile: InvestigationProfile | null | undefined
): InvestigationProfile['documents'] => (profile?.documents ?? []).filter((document) => document.access !== 'hidden');

/**
 * What an investigation tab shows once a capability flag has made it visible.
 *
 * Visibility no longer depends on the runtime profile, so every unusable profile has to explain
 * itself here rather than the tab silently disappearing. Kept pure so the ordering of these cases
 * is testable without rendering.
 */
export const resolveInvestigationTabState = (
  status: InvestigationProfileStatus,
  profile: InvestigationProfile | null | undefined
): InvestigationTabState => {
  if (status === 'idle' || status === 'loading') return 'loading';
  if (status === 'error') return 'error';
  // "disabled" means the profile was never requested - not SupportManagement, or an auth route.
  if (status === 'disabled' || !profile) return 'not-configured';
  if (profile.state === 'unavailable') return 'unavailable';
  if (profile.state !== 'active' || profile.documents.length === 0) return 'not-configured';
  // Documents exist, but none of them are this user's. Kept apart from "not configured" so the
  // handler is told it is a question of permissions rather than of a missing deployment.
  if (visibleInvestigationDocuments(profile).length === 0) return 'no-access';
  return 'ready';
};
