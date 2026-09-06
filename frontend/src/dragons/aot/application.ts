import { configureInvestigationVariants } from '@supportmanagement/investigation/investigation-variant-registry';

import { aotInvestigationVariant } from './investigation/aot-investigation-variant';

export { aotDragon as dragon } from './index';
export { supportUi as applicationUi } from '@shell/ui/support-ui';

export const configureApplication = (): void => configureInvestigationVariants([aotInvestigationVariant]);
