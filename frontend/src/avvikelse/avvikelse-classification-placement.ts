import { useInvestigationProfileStore } from '../supportmanagement/investigation/investigation-profile-store';
import {
  type AvvikelseClassificationPlacement,
  resolveSupportErrandClassificationPlacement,
} from './avvikelse-classification-policy';

let application: string | undefined;

/** The consuming dragon supplies identity only for validating the returned backend profile. */
export const configureAvvikelseClassification = (identity: string): void => {
  application = identity;
};

export const resolveAvvikelseClassificationPlacement = (
  profile: Parameters<typeof resolveSupportErrandClassificationPlacement>[0]['profile']
): AvvikelseClassificationPlacement => {
  if (!application) throw new Error('Avvikelse classification has not been configured by its dragon');
  return resolveSupportErrandClassificationPlacement({ application, profile });
};

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
