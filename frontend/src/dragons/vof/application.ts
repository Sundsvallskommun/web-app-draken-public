import { configureAvvikelseClassification } from '@avvikelse/avvikelse-classification-placement';
import { avvikelseInvestigationVariant } from '@avvikelse/avvikelse-investigation-variant';
import { configureInvestigationVariants } from '@supportmanagement/investigation/investigation-variant-registry';

import { vofDragon as dragon } from './index';

export { dragon };
export { supportUi as applicationUi } from '@shell/ui/support-ui';

export const configureApplication = (): void => {
  configureAvvikelseClassification(dragon.id);
  configureInvestigationVariants([avvikelseInvestigationVariant]);
};
