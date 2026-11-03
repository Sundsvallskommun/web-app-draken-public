import { luhnCheck } from '@common/services/helper-service';
import { phoneNumberFormatter } from '@common/utils/phoneNumberFormatter-utils';

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
 * Returns the calling number formatted like numbers the case worker enters (+46...), or undefined
 * for a hidden or unusable number.
 */
const toPhoneNumber = (value: string): string | undefined => {
  const phoneNumber = phoneNumberFormatter(value.replace(/[()]/g, ''));
  return /^\+\d{7,11}$/.test(phoneNumber) ? phoneNumber : undefined;
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

const HIDDEN = '[dolt]';
/** Contact fields that describe the contact, not the person, and may be logged as they are. */
const LOGGABLE_CONTACT_KEYS = ['contactId', 'contactStatus', 'currentContactsType', 'isActiveContact'] as const;
/** Contact data keys whose values describe the contact, not the person, and may be logged. */
const LOGGABLE_CONTACT_DATA_KEYS = new Set(['contactSourceType', 'direction', 'media']);

/**
 * The screen pop as it may be logged: only the fields listed above keep their values. Every other
 * contact data key is logged by name with its value hidden, so the log shows what ACE sends without
 * the caller's personal number, phone number, name or messages.
 */
export const loggableScreenPop = (message: AceScreenPopMessage | undefined) => {
  const contact = message?.contact;
  const contactData = Object.entries(contact?.contactData ?? {}).map(([key, value]) => [
    key,
    LOGGABLE_CONTACT_DATA_KEYS.has(key) || value === '' || value === undefined ? value : HIDDEN,
  ]);
  return {
    popEvent: message?.popEvent,
    contact: contact && {
      ...Object.fromEntries(LOGGABLE_CONTACT_KEYS.map((key) => [key, contact[key]])),
      contactData: Object.fromEntries(contactData),
    },
  };
};
