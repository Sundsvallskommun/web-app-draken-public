import { createSupportApplicationProfile } from '@/config/support-application-profile';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'KC',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'KC',
    documents: [],
    registration: { mode: 'enabled', defaults: { classification: { category: 'CONTACT_SUNDSVALL', type: 'UNCATEGORIZED' } } },
  }),
};
