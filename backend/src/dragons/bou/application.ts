import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';
import { createSupportApplicationProfile } from '@/supportmanagement/config/support-application-profile';

export const application: DragonApplication = {
  id: 'BOU',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'BOU',
    documents: [],
    registration: {
      mode: 'enabled',
      defaults: { classification: { category: 'BOU', type: 'BOU/UNCATEGORIZED' }, labels: { category: 'BOU', type: 'BOU/UNCATEGORIZED' } },
    },
  }),
};
