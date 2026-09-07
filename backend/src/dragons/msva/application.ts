import { createSupportApplicationProfile } from '@/config/support-application-profile';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'MSVA',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'MSVA',
    documents: [],
    registration: { mode: 'enabled', defaults: { classification: { category: 'MSVA', type: 'MSVA.UNCATEGORIZED' } } },
  }),
};
