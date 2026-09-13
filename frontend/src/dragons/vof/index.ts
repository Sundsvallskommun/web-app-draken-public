import { kontaktSundsvallSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

import type { DragonModule } from '../dragon-module';

export const vofDragon: DragonModule = Object.freeze({
  id: 'VOF',
  supportErrandPolicy: kontaktSundsvallSupportErrandPolicy,
});
