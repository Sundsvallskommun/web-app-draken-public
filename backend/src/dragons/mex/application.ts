import { CASEDATA_CONTROLLERS } from '@/shell/casedata-controllers';
import type { DragonApplication } from '@/shell/dragon-application';

export const application: DragonApplication = {
  id: 'MEX',
  controllers: [...CASEDATA_CONTROLLERS],
};
