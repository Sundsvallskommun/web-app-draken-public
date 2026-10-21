import { describe, expect, test } from 'vitest';

import { AceScreenPopMessage } from './ace-jsapi.types';
import { parseScreenPop } from './ace-screen-pop';

// Test person number from Skatteverket, not a real person.
const personNumber = '199001012385';

// Shaped after Telia's afterNormalAccept example, with the identity replaced by a test person.
const acceptedIvrCall = (contactData: Record<string, string> = { eidUserPnr: personNumber }): AceScreenPopMessage => ({
  popEvent: 'afterNormalAccept',
  contact: {
    contactId: 264218330,
    contactStatus: 'active',
    currentContactsType: 'ivr',
    contactData: {
      Ani: '+46701740635',
      contactSourceType: 'ivr',
      direction: 'incoming',
      media: 'call',
      ...contactData,
    },
  },
});

describe('parseScreenPop', () => {
  test('returns the caller of an accepted IVR call identified with BankID', () => {
    expect(parseScreenPop(acceptedIvrCall())).toEqual({ contactId: '264218330', personNumber });
  });

  test('ignores pop events other than afterNormalAccept', () => {
    expect(parseScreenPop({ ...acceptedIvrCall(), popEvent: 'beforeNormalAccept' })).toBeNull();
    expect(parseScreenPop({ ...acceptedIvrCall(), popEvent: 'endOfContact' })).toBeNull();
  });

  test('ignores contacts that are not IVR calls', () => {
    const message = acceptedIvrCall();
    message.contact!.currentContactsType = 'chat';
    expect(parseScreenPop(message)).toBeNull();
  });

  test('ignores callers that were not identified', () => {
    const { eidUserPnr: _omitted, ...withoutIdentity } = acceptedIvrCall().contact!.contactData!;
    expect(
      parseScreenPop({
        ...acceptedIvrCall(),
        contact: { contactId: 1, currentContactsType: 'ivr', contactData: withoutIdentity },
      })
    ).toBeNull();
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '' }))).toBeNull();
  });

  test('ignores an identity that is not a valid 12-digit personal number', () => {
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '199001012386' }))).toBeNull();
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '9001012385' }))).toBeNull();
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '19900101-2385' }))).toBeNull();
  });

  test('ignores a missing or empty message', () => {
    expect(parseScreenPop(undefined)).toBeNull();
    expect(parseScreenPop({})).toBeNull();
  });
});
