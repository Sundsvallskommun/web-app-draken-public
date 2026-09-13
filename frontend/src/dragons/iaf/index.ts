import { kontaktSundsvallSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

import type { DragonModule } from '../dragon-module';

export const iafDragon: DragonModule = Object.freeze({
  id: 'IAF',
  supportErrandPolicy: kontaktSundsvallSupportErrandPolicy,
});
