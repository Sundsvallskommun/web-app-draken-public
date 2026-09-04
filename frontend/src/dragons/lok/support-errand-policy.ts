import type { SupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';
import { Resolution } from '@supportmanagement/services/support-errand-status';

export const lokSupportErrandPolicy: Partial<SupportErrandPolicy> = {
  resolutions: Object.freeze({
    [Resolution.SOLVED]: 'Löst av VoF/IAF Lokalplanering',
    [Resolution.FORWARDED_TO_DRAKFASTIGHETER]: 'Vidarebefordrat till Drakfastigheter',
    [Resolution.FORWARDED_TO_EXTERNAL_LANDLORD]: 'Vidarebefordrat till extern hyresvärd',
    [Resolution.FORWARDED_TO_INTERNAL_CONTRACTOR]: 'Vidarebefordrat till intern entreprenör',
    [Resolution.FORWARDED_TO_EXTERNAL_CONTRACTOR]: 'Vidarebefordrat till extern entreprenör',
  }),
};
