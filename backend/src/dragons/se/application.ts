import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'SE',
  controllers: [...SUPPORT_CONTROLLERS],
};
