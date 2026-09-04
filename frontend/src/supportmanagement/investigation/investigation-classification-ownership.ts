import { appConfig } from '@config/appconfig';
import {
  resolveCategorizationControl,
  resolveCategorizationMode,
} from '@supportmanagement/components/support-errand-basics-form/categorization-control';

import { defaultBasicsPlacement, type SupportErrandClassificationPlacement } from './classification-placement';
import { useInvestigationProfileStore } from './investigation-profile-store';
import { getInvestigationVariant } from './investigation-variant-registry';

/**
 * Thin runtime adapter. Every consumer asks this function whether Grundinformation or an
 * investigation document owns classification persistence.
 *
 * The variant claiming this application decides. An application no variant claims resolves to the
 * neutral placement, so the ordinary categorization control renders and no investigation policy is
 * consulted at all.
 */
export const getSupportErrandClassificationPlacement = (): SupportErrandClassificationPlacement => {
  const variant = getInvestigationVariant();
  if (!variant) return defaultBasicsPlacement;

  return variant.resolveClassificationPlacement(useInvestigationProfileStore.getState().profile);
};

const basicsCategorizationControl = () =>
  resolveCategorizationControl(
    resolveCategorizationMode(appConfig.features),
    getSupportErrandClassificationPlacement()
  );

/**
 * Whether the errand can be given a classification in Grundinformation right now.
 *
 * Weaker than rendering a control: while the investigation capability is unavailable the variant's
 * control stays on screen but read-only, so an errand that arrived unclassified cannot be
 * classified there either. Everything that reads a missing classification as a problem has to ask
 * this rather than whether a control is drawn - the form schema, so "Spara ärende" is not held shut
 * over a field nobody may fill in, and the emptiness check, so an unclassifiable errand does not
 * count as an unfinished registration with every handling action disabled.
 */
export const basicsAcceptsClassification = (): boolean => {
  const control = basicsCategorizationControl();
  if (control.kind === 'none') return false;

  return control.kind !== 'variant' || !control.disabled;
};
