import { mockEnv } from '../../fixtures/mock-env';

export interface ScreenPopOptions {
  /** Sent as contactData.eidUserPnr; null leaves the caller unidentified. */
  personNumber?: string | null;
  popEvent?: string;
  contactType?: string;
  contactId?: number;
}

let nextContactId = 264218330;

/**
 * Builds an ACE screen pop message shaped after Telia's afterNormalAccept example, with the
 * identity replaced by a Skatteverket test person. Defaults describe the call Draken acts on:
 * an accepted IVR call from a caller identified with BankID. Each message gets a new contactId
 * unless one is given.
 */
export const screenPopMessage = ({
  personNumber = mockEnv.mockPersonNumber,
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
      Ani: `+46${mockEnv.mockPhoneNumber.slice(1)}`,
      Entrance: 'E2E',
      contactSourceType: contactType,
      direction: 'incoming',
      media: 'call',
      ...(personNumber === null ? {} : { eidUserPnr: personNumber }),
    },
  },
});
