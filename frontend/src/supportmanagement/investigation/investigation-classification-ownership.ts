import {
  resolveSupportErrandClassificationPlacement,
  type SupportErrandClassificationPlacement,
} from './investigation-classification-policy';
import { useInvestigationProfileStore } from './investigation-profile-store';

/**
 * Thin runtime adapter around the canonical BFF profile. Every consumer asks
 * this function whether Grundinformation or an investigation document owns
 * classification persistence.
 */
export const getSupportErrandClassificationPlacement = (): SupportErrandClassificationPlacement =>
  resolveSupportErrandClassificationPlacement(useInvestigationProfileStore.getState().profile);
