import { createSupportApplicationProfile } from '@/config/support-application-profile';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

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
