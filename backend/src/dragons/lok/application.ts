import { createSupportApplicationProfile } from '@/config/support-application-profile';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'LOK',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'LOK',
    documents: [],
    registration: {
      mode: 'enabled',
      defaults: {
        classification: { category: 'IAF', type: 'IAF/WORK_AND_LIVELIHOOD' },
        labels: { category: 'IAF', type: 'IAF/WORK_AND_LIVELIHOOD' },
      },
    },
  }),
};
