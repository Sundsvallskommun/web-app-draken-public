import { createSupportApplicationProfile } from '@/config/support-application-profile';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'KA',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'KA',
    documents: [],
    registration: {
      mode: 'enabled',
      defaults: {
        classification: { category: 'ADMINISTRATION', type: 'ADMINISTRATION/CONTACT_CENTER' },
        labels: { category: 'ADMINISTRATION', type: 'ADMINISTRATION/CONTACT_CENTER', subType: 'ADMINISTRATION/CONTACT_CENTER/GENERAL' },
      },
    },
  }),
};
