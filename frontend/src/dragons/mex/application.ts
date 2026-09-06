import { configureInvestigationVariants } from '@supportmanagement/investigation/investigation-variant-registry';

export { mexDragon as dragon } from './index';
export { applicationUi } from '@shell/ui/casedata-ui';

export const configureApplication = (): void => configureInvestigationVariants([]);
