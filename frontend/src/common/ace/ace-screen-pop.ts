import { luhnCheck } from '@common/services/helper-service';
import { phoneNumberFormatter } from '@common/utils/phoneNumberFormatter-utils';
import dayjs from 'dayjs';

import { AceScreenPopMessage } from './ace-jsapi.types';

export interface AceCaller {
  contactId: string;
  /** Personal number of a caller identified with BankID/eID in the IVR, always YYYYMMDDNNNN. */
  personNumber?: string;
  /** The number the call came from, e.g. +46701740635; missing when the number is hidden. */
  phoneNumber?: string;
}

/** ACE contact data key Sundsvall's ACE maps the personal number of an identified caller to. */
const PERSON_NUMBER_KEY = 'cid';
/** ACE contact data key holding the calling number (A-number). */
const PHONE_NUMBER_KEY = 'Ani';

/** A contact data value by key, ignoring case: Telia writes Cid, the mapping says cid. */
const contactDataValue = (contactData: Record<string, unknown> | undefined, key: string): string => {
  const entry = Object.entries(contactData ?? {}).find(([name]) => name.toLowerCase() === key.toLowerCase());
  return entry?.[1]?.toString() ?? '';
};

/**
 * The century of a 10-digit personal number, as Skatteverket counts it: the latest one in which the
 * person is already born, one more back for "+" (aged 100 or more). A coordination number (day + 60)
 * of someone born this month compares as later than today and gets the century before; accepted,
 * since it hardly happens.
 */
const centuryOf = (birthDate: string, isAged100OrMore: boolean, today: Date): number => {
  const bornLastCentury = birthDate > dayjs(today).format('YYMMDD');
  return Math.floor(today.getFullYear() / 100) - Number(bornLastCentury) - Number(isAged100OrMore);
};

/**
 * Returns the personal number as 12 digits (YYYYMMDDNNNN), the format Citizen is searched with, or
 * undefined when it is not one. Takes 12 or 10 digits, with or without "-" or "+".
 */
export const toPersonNumber = (value: string, today = new Date()): string | undefined => {
  const match = /^(\d{2})?(\d{6})([-+]?)(\d{4})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const [, century, birthDate, separator, lastDigits] = match;
  const personNumber = `${century ?? centuryOf(birthDate, separator === '+', today)}${birthDate}${lastDigits}`;
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
  const personNumber = toPersonNumber(contactDataValue(contact.contactData, PERSON_NUMBER_KEY));
  const phoneNumber = toPhoneNumber(contactDataValue(contact.contactData, PHONE_NUMBER_KEY));
  if (!contactId) {
    return null;
  }
  return {
    contactId,
    ...(personNumber && { personNumber }),
    ...(phoneNumber && { phoneNumber }),
  };
};
