import { defaultBasicsPlacement, type SupportErrandClassificationPlacement } from './classification-placement';
import { useInvestigationProfileStore } from './investigation-profile-store';
import { getInvestigationVariant } from './investigation-variant-registry';

/**
 * Thin runtime adapter. Every consumer asks this function whether Grundinformation or an
 * investigation document owns classification persistence.
 *
 * The variant claiming this application decides. An application no variant claims resolves to the
 * neutral placement, so the ordinary categorization control renders and no investigation policy is
 * consulted at all.
 */
export const getSupportErrandClassificationPlacement = (): SupportErrandClassificationPlacement => {
  const variant = getInvestigationVariant();
  if (!variant) return defaultBasicsPlacement;

  return variant.resolveClassificationPlacement(useInvestigationProfileStore.getState().profile);
};
