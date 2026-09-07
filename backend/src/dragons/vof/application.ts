import { VOF_SUPPORT_APPLICATION_PROFILE } from '@/avvikelse/application-profile';
import { SupportErrandJsonParameterController } from '@/controllers/supportmanagement/support-errand-json-parameter.controller';
import type { DragonApplication } from '@/shell/dragon-application';
import { SUPPORT_CONTROLLERS } from '@/shell/support-controllers';

export const application: DragonApplication = {
  id: 'VOF',
  controllers: [...SUPPORT_CONTROLLERS, SupportErrandJsonParameterController],
  supportProfile: VOF_SUPPORT_APPLICATION_PROFILE,
};
