import {
  kontaktSundsvallSupportErrandPolicy,
  type SupportErrandPolicy,
} from '@supportmanagement/policy/support-errand-policy';
import { Resolution } from '@supportmanagement/services/support-errand-status';

export const kaSupportErrandPolicy: SupportErrandPolicy = {
  ...kontaktSundsvallSupportErrandPolicy,
  resolutions: Object.freeze({
    [Resolution.SOLVED]: 'Löst av Kontaktcenter',
    [Resolution.REGISTERED_EXTERNAL_SYSTEM]: 'Vidarebefordrad (ärendet har överlämnats till annan funktion)',
  }),
};
