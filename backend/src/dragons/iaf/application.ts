import { IAF_SUPPORT_APPLICATION_PROFILE } from '@/avvikelse/application-profile';
import { SupportErrandJsonParameterController } from '@/controllers/supportmanagement/support-errand-json-parameter.controller';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'IAF',
  controllers: [...SUPPORT_CONTROLLERS, SupportErrandJsonParameterController],
  supportProfile: IAF_SUPPORT_APPLICATION_PROFILE,
};
