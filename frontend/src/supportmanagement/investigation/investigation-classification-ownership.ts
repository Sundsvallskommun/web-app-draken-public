import { isIAF } from '@common/services/application-service';
import { appConfig } from '@config/appconfig';

/**
 * Canonical application-level owner for IAF/VOF errand classification.
 *
 * Schema declarations decide where the control is placed inside an
 * investigation form. They do not move persistence ownership back to the
 * generic errand form if a schema is temporarily missing that declaration.
 */
export const investigationOwnsSupportErrandClassification = (): boolean =>
  isIAF() && appConfig.features.useInvestigation;
