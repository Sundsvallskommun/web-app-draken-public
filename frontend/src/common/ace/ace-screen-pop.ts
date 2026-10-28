import { luhnCheck } from '@common/services/helper-service';
import { phoneNumberFormatter } from '@common/utils/phoneNumberFormatter-utils';

import { AceScreenPopMessage } from './ace-jsapi.types';

export interface AceCaller {
  contactId: string;
  /** Personal number of a caller identified with BankID/eID in the IVR, always YYYYMMDDNNNN. */
  personNumber?: string;
  /** The number the call came from, e.g. +46701740635; missing when the number is hidden. */
  phoneNumber?: string;
}

/** ACE contact data key holding the personal number of a caller identified with BankID/eID. */
const PERSON_NUMBER_KEY = 'eidUserPnr';
/** ACE contact data key holding the calling number (A-number). */
const PHONE_NUMBER_KEY = 'Ani';

const toDateString = (date: Date): string =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

/**
 * Returns the personal number as 12 digits (YYYYMMDDNNNN), the format Citizen is searched with, or
 * undefined when it is not a valid personal or coordination number. Takes 12 digits as well as 10
 * (YYMMDDNNNN), with or without "-" or "+". The century of a 10-digit number follows Skatteverket:
 * the latest century in which the person is already born, and one more back with "+" (100 or older).
 */
export const toPersonNumber = (value: string, today = new Date()): string | undefined => {
  const match = /^(\d{2})?(\d{2})(\d{2})(\d{2})([-+]?)(\d{4})$/.exec(value.replace(/\s/g, ''));
  if (!match) {
    return undefined;
  }
  const [, century, year, month, day, separator, lastDigits] = match;
  // Coordination numbers add 60 to the day of birth.
  const dayOfMonth = Number(day) > 60 ? Number(day) - 60 : Number(day);
  if (Number(month) < 1 || Number(month) > 12 || dayOfMonth < 1 || dayOfMonth > 31) {
    return undefined;
  }
  let fullYear = Number(`${century ?? ''}${year}`);
  if (!century) {
    fullYear += Math.floor(today.getFullYear() / 100) * 100;
    if (`${fullYear}${month}${String(dayOfMonth).padStart(2, '0')}` > toDateString(today)) {
      fullYear -= 100;
    }
    if (separator === '+') {
      fullYear -= 100;
    }
  }
  const personNumber = `${fullYear}${month}${day}${lastDigits}`;
  return luhnCheck(personNumber) ? personNumber : undefined;
};

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
  const personNumber = toPersonNumber(contact.contactData?.[PERSON_NUMBER_KEY]?.toString() ?? '');
  const phoneNumber = toPhoneNumber(contact.contactData?.[PHONE_NUMBER_KEY]?.toString() ?? '');
  if (!contactId) {
    return null;
  }
  return {
    contactId,
    ...(personNumber && { personNumber }),
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
