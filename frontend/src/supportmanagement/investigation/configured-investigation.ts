import { appConfig } from '@config/appconfig';

import { type InvestigationModule, validateInvestigationConfiguration } from './investigation-module';

/** Only the selected application's composition root configures this owner. */
let implementation: InvestigationModule | null | undefined;

export const configureInvestigation = (selected: InvestigationModule | null): void => {
  implementation = selected;
};

export const getInvestigation = (): InvestigationModule | null => {
  if (implementation === undefined) throw new Error('The application has not configured its investigation.');
  validateInvestigationConfiguration(appConfig.features.useInvestigation, implementation);
  return implementation;
};
