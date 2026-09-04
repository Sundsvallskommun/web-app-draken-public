import { internalCustomerServiceResolutionLabels } from '@supportmanagement/policy/resolution-label-presets';
import type { SupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

// SE and IK close errands with the same vocabulary. Dragons cannot import each other, so the
// shared set is a named preset in the domain and both reference it.
export const seSupportErrandPolicy: Partial<SupportErrandPolicy> = {
  resolutions: internalCustomerServiceResolutionLabels,
};
