import { Resolution } from '../services/support-errand-status';
import { internalCustomerServiceResolutionLabels, kontaktSundsvallResolutionLabels } from './resolution-label-presets';

/**
 * Labels for persisted resolution codes, including codes outside today's close-dialog choices.
 * History must remain readable when a dragon changes its choices or uses CLOSED as its default.
 * The running dragon's labels take precedence in the sidebar; this vocabulary never enables a
 * resolution in the close dialog.
 */
export const supportResolutionHistoryLabels: Readonly<Record<string, string>> = Object.freeze({
  ...internalCustomerServiceResolutionLabels,
  ...kontaktSundsvallResolutionLabels,
  [Resolution.CLOSED]: 'Avslutat',
  [Resolution.BACK_TO_MANAGER]: 'Åter till chef',
  [Resolution.BACK_TO_HR]: 'Åter till HR',
  [Resolution.NEED_MET]: 'Behov uppfyllt',
  [Resolution.RECRUITED_FEWER]: 'Rekryterat färre',
  [Resolution.RECRUITED_MORE]: 'Rekryterat fler',
  [Resolution.CANCELLED]: 'Avbruten',
  [Resolution.BACK_TO_CONTACT_SUNDSVALL]: 'Åter till Kontakt Sundsvall',
  [Resolution.FORWARDED_TO_DRAKFASTIGHETER]: 'Vidarebefordrat till Drakfastigheter',
  [Resolution.FORWARDED_TO_EXTERNAL_LANDLORD]: 'Vidarebefordrat till extern hyresvärd',
  [Resolution.FORWARDED_TO_INTERNAL_CONTRACTOR]: 'Vidarebefordrat till intern entreprenör',
  [Resolution.FORWARDED_TO_EXTERNAL_CONTRACTOR]: 'Vidarebefordrat till extern entreprenör',
});
