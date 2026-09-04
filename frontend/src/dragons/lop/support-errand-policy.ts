import type { SupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';
import { Resolution } from '@supportmanagement/services/support-errand-status';

export const lopSupportErrandPolicy: Partial<SupportErrandPolicy> = {
  resolutions: Object.freeze({
    [Resolution.CLOSED]: 'Avslutat',
    [Resolution.BACK_TO_MANAGER]: 'Åter till chef',
    [Resolution.BACK_TO_HR]: 'Åter till HR',
    [Resolution.REGISTERED_EXTERNAL_SYSTEM]: 'Registrerat i annat system',
  }),
};
