import { mockEnv } from '../../fixtures/mock-env';

export interface ScreenPopOptions {
  /** Sent as contactData.eidUserPnr; null leaves the caller unidentified. */
  personNumber?: string | null;
  /** Sent as contactData.Ani, the calling number; null hides the number. */
  phoneNumber?: string | null;
  popEvent?: string;
  contactType?: string;
  contactId?: number;
}

let nextContactId = 264218330;

/**
 * Builds an ACE screen pop message shaped after Telia's afterNormalAccept example, with the
 * identity replaced by a Skatteverket test person. Defaults describe the call Draken acts on:
 * an accepted IVR call from a caller identified with BankID, calling from a fictional number. Each message gets a new contactId
 * unless one is given.
 */
export const screenPopMessage = ({
  personNumber = mockEnv.mockPersonNumber,
  phoneNumber = mockEnv.mockPhoneNumberCountryCode,
  popEvent = 'afterNormalAccept',
  contactType = 'ivr',
  contactId = nextContactId++,
}: ScreenPopOptions = {}) => ({
  popEvent,
  contact: {
    contactId,
    contactStatus: 'active',
    currentContactsType: contactType,
    contactData: {
      ...(phoneNumber === null ? {} : { Ani: phoneNumber }),
      Entrance: 'E2E',
      contactSourceType: contactType,
      direction: 'incoming',
      media: 'call',
      ...(personNumber === null ? {} : { eidUserPnr: personNumber }),
    },
  },
});
