import { appConfig } from '@config/appconfig';

import { aotInvestigationVariant } from './aot/aot-investigation-variant';
import { avvikelseInvestigationVariant } from './avvikelse/avvikelse-investigation-variant';
import { type InvestigationVariantModule, resolveInvestigationVariant } from './investigation-variant';

/**
 * Every investigation implementation. Adding one is adding a module here plus its capability flag.
 *
 * Order is load-bearing: selection is first-wins, so a deployment that wrongly enables two
 * capabilities keeps the behaviour of whichever is listed first. Avvikelse stays first so that
 * misconfiguration degrades to today's behaviour rather than to a placeholder.
 */
const VARIANTS: readonly InvestigationVariantModule[] = Object.freeze([
  avvikelseInvestigationVariant,
  aotInvestigationVariant,
]);

export const getInvestigationVariant = (): InvestigationVariantModule | null =>
  resolveInvestigationVariant(appConfig.features, VARIANTS);

/**
 * The follow-up across errands the running variant offers, if any. The master switch turns it off with
 * the rest of the investigation, as it does the tabs.
 */
export const getInvestigationFollowUp = (): InvestigationVariantModule['followUp'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.followUp : undefined;
