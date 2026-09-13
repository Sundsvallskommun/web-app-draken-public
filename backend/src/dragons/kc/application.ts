import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';
import { createSupportApplicationProfile } from '@/supportmanagement/config/support-application-profile';

export const application: DragonApplication = {
  id: 'KC',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'KC',
    documents: [],
    registration: { mode: 'enabled', defaults: { classification: { category: 'CONTACT_SUNDSVALL', type: 'UNCATEGORIZED' } } },
  }),
};
