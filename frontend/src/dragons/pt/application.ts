import { configureInvestigation } from '@supportmanagement/investigation/configured-investigation';

export { ptDragon as dragon } from './index';
export { applicationUi } from '@shell/ui/casedata-ui';

export const configureApplication = (): void => configureInvestigation(null);
