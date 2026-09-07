import { configureInvestigation } from '@supportmanagement/investigation/configured-investigation';

export { ikDragon as dragon } from './index';
export { supportUi as applicationUi } from '@shell/ui/support-ui';

export const configureApplication = (): void => configureInvestigation(null);
