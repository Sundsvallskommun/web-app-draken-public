import { kontaktSundsvallSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

import type { DragonModule } from '../dragon-module';

export const msvaDragon: DragonModule = Object.freeze({
  id: 'MSVA',
  supportErrandPolicy: kontaktSundsvallSupportErrandPolicy,
});
