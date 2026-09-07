import type { SupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';
import { Resolution } from '@supportmanagement/services/support-errand-status';

export const bouSupportErrandPolicy: Partial<SupportErrandPolicy> = {
  resolutions: Object.freeze({
    [Resolution.SOLVED]: 'Löst',
    [Resolution.BACK_TO_CONTACT_SUNDSVALL]: 'Åter till Kontakt Sundsvall',
  }),
};
