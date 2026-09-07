import { createSupportApplicationProfile } from '@/config/support-application-profile';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'SE',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'SE',
    documents: [],
    registration: {
      mode: 'enabled',
      defaults: {
        classification: { category: 'UNCATEGORIZED', type: 'UNCATEGORIZED/UNCATEGORISED' },
        labels: { category: 'UNCATEGORIZED', type: 'UNCATEGORIZED/UNCATEGORISED' },
      },
    },
  }),
};
