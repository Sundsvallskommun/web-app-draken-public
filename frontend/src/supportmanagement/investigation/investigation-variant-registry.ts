import { appConfig } from '@config/appconfig';

import { type InvestigationVariantModule, resolveInvestigationVariant } from './investigation-variant';

/** Only the selected dragon supplies implementations. This module owns selection, not imports. */
let variants: readonly InvestigationVariantModule[] | undefined;

export const configureInvestigationVariants = (implementations: readonly InvestigationVariantModule[]): void => {
  variants = Object.freeze([...implementations]);
};

export const getInvestigationVariant = (): InvestigationVariantModule | null => {
  if (!variants) throw new Error('Investigation variants have not been configured by the application shell');
  return resolveInvestigationVariant(appConfig.features, variants);
};
