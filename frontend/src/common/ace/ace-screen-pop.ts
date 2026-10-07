import { luhnCheck } from '@common/services/helper-service';

import { AceScreenPopMessage } from './ace-jsapi.types';

export interface AceCaller {
  contactId: string;
  /** Personal number of the caller, format YYYYMMDDNNNN. */
  personNumber: string;
}

/** ACE contact data key holding the personal number of a caller identified with BankID/eID. */
const PERSON_NUMBER_KEY = 'eidUserPnr';

const isPersonNumber = (value: string): boolean => /^\d{12}$/.test(value) && luhnCheck(value);

/**
 * Interprets an ACE screen pop event. Only an accepted IVR call carrying a valid personal number
 * yields a caller; every other event (other pop events, unidentified callers, chat, email...)
 * yields null and is ignored by Draken.
 */
export const parseScreenPop = (message: AceScreenPopMessage | undefined): AceCaller | null => {
  const contact = message?.contact;
  if (message?.popEvent !== 'afterNormalAccept' || contact?.currentContactsType !== 'ivr') {
    return null;
  }
  const contactId = contact.contactId?.toString() ?? '';
  const personNumber = contact.contactData?.[PERSON_NUMBER_KEY]?.toString().trim() ?? '';
  if (!contactId || !isPersonNumber(personNumber)) {
    return null;
  }
  return { contactId, personNumber };
};
