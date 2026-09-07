import { configureAvvikelseClassification } from '@avvikelse/avvikelse-classification-placement';
import { avvikelseInvestigation } from '@avvikelse/avvikelse-investigation';
import { configureInvestigation } from '@supportmanagement/investigation/configured-investigation';

import { iafDragon as dragon } from './index';

export { dragon };
export { supportUi as applicationUi } from '@shell/ui/support-ui';

export const configureApplication = (): void => {
  configureAvvikelseClassification(dragon.id);
  configureInvestigation(avvikelseInvestigation);
};
