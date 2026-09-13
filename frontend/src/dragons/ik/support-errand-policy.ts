import { internalCustomerServiceResolutionLabels } from '@supportmanagement/policy/resolution-label-presets';
import {
  kontaktSundsvallSupportErrandPolicy,
  type SupportErrandPolicy,
} from '@supportmanagement/policy/support-errand-policy';

// IK and SE close errands with the same vocabulary. Dragons cannot import each other, so the
// shared set is a named preset in the domain and both reference it.
export const ikSupportErrandPolicy: SupportErrandPolicy = {
  ...kontaktSundsvallSupportErrandPolicy,
  resolutions: internalCustomerServiceResolutionLabels,
};
