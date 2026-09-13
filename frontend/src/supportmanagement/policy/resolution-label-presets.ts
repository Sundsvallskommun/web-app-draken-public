import { Resolution } from '../services/support-errand-status';

/**
 * Resolution vocabularies shared by more than one dragon.
 *
 * Dragon modules may not import each other, so a label set that two dragons use identically lives
 * here, in the domain that owns the contract, and each dragon references it by name. A vocabulary
 * used by exactly one dragon belongs in that dragon's folder instead.
 */

/**
 * The Kontakt Sundsvall labels (formerly the `ResolutionLabelKS` enum): what every dragon closes
 * errands with unless its module supplies its own set. `REFERRED_TO_RETURN` has no `Resolution`
 * member but is a real code that the close dialog offers and persists, so it stays.
 */
export const kontaktSundsvallResolutionLabels: Readonly<Record<string, string>> = Object.freeze({
  [Resolution.SOLVED]: 'Löst av Kontakt Sundsvall',
  [Resolution.REFERRED_VIA_EXCHANGE]: 'Vidarebefordrat via växelprogrammet',
  [Resolution.CONNECTED]: 'Kopplat samtal',
  [Resolution.REGISTERED_EXTERNAL_SYSTEM]: 'Registrerat i annat system',
  [Resolution.SELF_SERVICE]: 'Hänvisat till självservice',
  [Resolution.INTERNAL_SERVICE]: 'Hänvisat till intern service',
  REFERRED_TO_RETURN: 'Hänvisat att återkomma',
  [Resolution.SECURE_APPBOX]: 'SecureAppbox',
});

/** Used by IK (Intern kundtjänst) and SE (Servicecenter Ekonomi), which share one internal customer service vocabulary. */
export const internalCustomerServiceResolutionLabels: Readonly<Record<string, string>> = Object.freeze({
  [Resolution.REFER_TO_CONTACTSUNDSVALL]: 'Hänvisat till Kontakt Sundsvall',
  [Resolution.SELF_SERVICE]: 'Hänvisat till självservice',
  [Resolution.SOLVED]: 'Informerat / Intern Kundtjänst har löst ärendet',
  [Resolution.REFER_TO_PHONE]: 'Behöver återkomma/hänvisat till telefontid',
  [Resolution.REGISTERED]: 'Tagit emot/registrerat/paketerat ärende',
  [Resolution.CONNECTED]: 'Kopplat samtal',
  [Resolution.SENT_MESSAGE]: 'Skickat ett meddelande',
});
