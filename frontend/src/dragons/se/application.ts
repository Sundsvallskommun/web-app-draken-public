import { configureInvestigationVariants } from '@supportmanagement/investigation/investigation-variant-registry';

export { seDragon as dragon } from './index';
export { supportUi as applicationUi } from '@shell/ui/support-ui';

export const configureApplication = (): void => configureInvestigationVariants([]);
