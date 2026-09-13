import {
  kontaktSundsvallSupportErrandPolicy,
  type SupportErrandPolicy,
} from '@supportmanagement/policy/support-errand-policy';
import { Resolution } from '@supportmanagement/services/support-errand-status';

export const bouSupportErrandPolicy: SupportErrandPolicy = {
  ...kontaktSundsvallSupportErrandPolicy,
  resolutions: Object.freeze({
    [Resolution.SOLVED]: 'Löst',
    [Resolution.BACK_TO_CONTACT_SUNDSVALL]: 'Åter till Kontakt Sundsvall',
  }),
};
