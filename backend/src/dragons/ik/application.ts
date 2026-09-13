import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';
import { createSupportApplicationProfile } from '@/supportmanagement/config/support-application-profile';

export const application: DragonApplication = {
  id: 'IK',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'IK',
    documents: [],
    registration: {
      mode: 'enabled',
      defaults: {
        classification: { category: 'KSK_SERVICE_CENTER', type: 'KSK_SERVICE_CENTER.UNCATEGORIZED' },
        labels: { category: 'KSK_SERVICE_CENTER', type: 'KSK_SERVICE_CENTER/UNCATEGORIZED' },
      },
    },
  }),
};
