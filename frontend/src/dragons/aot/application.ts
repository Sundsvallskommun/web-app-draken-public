import { configureInvestigation } from '@supportmanagement/investigation/configured-investigation';

import { aotInvestigation } from './investigation/aot-investigation';

export { aotDragon as dragon } from './index';
export { supportUi as applicationUi } from '@shell/ui/support-ui';

export const configureApplication = (): void => configureInvestigation(aotInvestigation);
