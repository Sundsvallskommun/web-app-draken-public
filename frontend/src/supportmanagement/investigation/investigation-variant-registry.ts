import { appConfig } from '@config/appconfig';

import { avvikelseInvestigationVariant } from './avvikelse/avvikelse-investigation-variant';
import { type InvestigationVariantModule, resolveInvestigationVariant } from './investigation-variant';

/** Every investigation implementation. Adding one is adding a module here plus its capability flag. */
const VARIANTS: readonly InvestigationVariantModule[] = Object.freeze([avvikelseInvestigationVariant]);

export const getInvestigationVariant = (): InvestigationVariantModule | null =>
  resolveInvestigationVariant(appConfig.features, VARIANTS);
