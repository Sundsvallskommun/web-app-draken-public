import { kontaktSundsvallSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

import type { DragonModule } from '../dragon-module';

export const kcDragon: DragonModule = Object.freeze({
  id: 'KC',
  supportErrandPolicy: kontaktSundsvallSupportErrandPolicy,
});
