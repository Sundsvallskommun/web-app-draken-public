import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';
import { createSupportApplicationProfile } from '@/supportmanagement/config/support-application-profile';

export const application: DragonApplication = {
  id: 'AOT',
  controllers: [...SUPPORT_CONTROLLERS],
  supportProfile: createSupportApplicationProfile({
    application: 'AOT',
    documents: [],
    // Registration is enabled, but AOT has no agreed default taxonomy yet.
    registration: { mode: 'enabled', defaults: {} },
  }),
};
