import { kontaktSundsvallSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

import type { DragonModule } from '../dragon-module';

export const aotDragon: DragonModule = Object.freeze({
  id: 'AOT',
  supportErrandPolicy: kontaktSundsvallSupportErrandPolicy,
});
