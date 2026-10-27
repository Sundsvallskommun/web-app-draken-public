import { luhnCheck } from '@common/services/helper-service';

import { AceScreenPopMessage } from './ace-jsapi.types';

export interface AceCaller {
  contactId: string;
  /** Personal number of a caller identified with BankID/eID in the IVR, format YYYYMMDDNNNN. */
  personNumber?: string;
  /** The number the call came from, e.g. +46701740635; missing when the number is hidden. */
  phoneNumber?: string;
}

/** ACE contact data key holding the personal number of a caller identified with BankID/eID. */
const PERSON_NUMBER_KEY = 'eidUserPnr';
/** ACE contact data key holding the calling number (A-number). */
const PHONE_NUMBER_KEY = 'Ani';

const isPersonNumber = (value: string): boolean => /^\d{12}$/.test(value) && luhnCheck(value);

/**
 * Returns the calling number in the format the contact form accepts (see phonePattern), or
 * undefined for a hidden or unusable number.
 */
const toPhoneNumber = (value: string): string | undefined => {
  const phoneNumber = value.replace(/[\s()-]/g, '').replace(/^00/, '+');
  return /^\+?\d{7,11}$/.test(phoneNumber) ? phoneNumber : undefined;
};

/**
 * Interprets an ACE screen pop event. Every accepted IVR call yields a caller, so it gets a new
 * errand, with whatever ACE knows about the caller: the personal number when they identified with
 * BankID/eID, the calling number unless it is hidden, both or neither. Every other event (other pop
 * events, chat, email...) yields null and is ignored by Draken.
 */
export const parseScreenPop = (message: AceScreenPopMessage | undefined): AceCaller | null => {
  const contact = message?.contact;
  if (message?.popEvent !== 'afterNormalAccept' || contact?.currentContactsType !== 'ivr') {
    return null;
  }
  const contactId = contact.contactId?.toString() ?? '';
  const personNumber = contact.contactData?.[PERSON_NUMBER_KEY]?.toString().trim() ?? '';
  const phoneNumber = toPhoneNumber(contact.contactData?.[PHONE_NUMBER_KEY]?.toString() ?? '');
  if (!contactId) {
    return null;
  }
  return {
    contactId,
    ...(isPersonNumber(personNumber) && { personNumber }),
    ...(phoneNumber && { phoneNumber }),
  };
};

const REDACTED = '[dolt]';
const PERSONAL_DATA_KEYS = new Set([PERSON_NUMBER_KEY, PHONE_NUMBER_KEY].map((key) => key.toLowerCase()));
/** Keys whose numeric values identify the contact in ACE, not a person. */
const ID_KEYS = new Set(['contactid']);

const looksLikePersonalNumber = (value: string | number): boolean =>
  /\d{7,}/.test(value.toString().replace(/[\s()+-]/g, ''));

/**
 * Copies an ACE event for logging, with personal numbers and phone numbers hidden: the known keys
 * always, and any other value with seven or more digits, since ACE passes on whatever the IVR
 * collected.
 */
export const redactAceEvent = (value: unknown, key = ''): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactAceEvent(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactAceEvent(v, k)]));
  }
  const lowerKey = key.toLowerCase();
  // Empty values are kept, so the log shows that ACE sent the key without a value.
  if ((typeof value === 'string' || typeof value === 'number') && value !== '' && !ID_KEYS.has(lowerKey)) {
    if (PERSONAL_DATA_KEYS.has(lowerKey) || looksLikePersonalNumber(value)) {
      return REDACTED;
    }
  }
  return value;
};
