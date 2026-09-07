import { createSupportApplicationProfile } from '@/config/support-application-profile';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'LOP',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'LOP',
    documents: [],
    registration: {
      mode: 'enabled',
      defaults: {
        classification: { category: 'SALARY', type: 'SALARY.UNCATEGORIZED' },
        labels: { category: 'SALARY', type: 'SALARY/UNCATEGORIZED', subType: 'SALARY/UNCATEGORIZED/UNCATEGORIZED' },
      },
    },
  }),
};
