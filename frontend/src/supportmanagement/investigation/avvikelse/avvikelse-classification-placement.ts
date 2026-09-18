import { getApplication } from '@common/services/application-service';

import { useInvestigationProfileStore } from '../investigation-profile-store';
import {
  type AvvikelseClassificationPlacement,
  resolveSupportErrandClassificationPlacement,
} from './avvikelse-classification-policy';

/**
 * getApplication() is passed only so the resolver can verify the profile it was handed belongs to
 * this deployment. It selects no functionality - the capability flag already did that.
 */
export const resolveAvvikelseClassificationPlacement = (
  profile: Parameters<typeof resolveSupportErrandClassificationPlacement>[0]['profile']
): AvvikelseClassificationPlacement =>
  resolveSupportErrandClassificationPlacement({ application: getApplication(), profile });

/**
 * The placement as avvikelse's own code sees it, policy payload included.
 *
 * Deliberately not routed through `getSupportErrandClassificationPlacement`: asking the shared
 * registry which variant is active, from inside the variant that would be the answer, closes a
 * module cycle and loses the concrete policy type on the way out. Shared consumers use the registry
 * adapter; avvikelse resolves its own placement directly.
 */
export const getAvvikelseClassificationPlacement = (): AvvikelseClassificationPlacement =>
  resolveAvvikelseClassificationPlacement(useInvestigationProfileStore.getState().profile);
