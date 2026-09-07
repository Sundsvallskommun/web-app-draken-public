import { createSupportApplicationProfile } from '@/config/support-application-profile';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'ROB',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'ROB',
    documents: [],
    registration: { mode: 'enabled', defaults: { classification: { category: 'COMPLETE_RECRUITMENT', type: 'COMPLETE_RECRUITMENT.RETAKE' } } },
  }),
};
