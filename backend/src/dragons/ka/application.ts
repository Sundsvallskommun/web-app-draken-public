import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'KA',
  controllers: [...SUPPORT_CONTROLLERS],
};
