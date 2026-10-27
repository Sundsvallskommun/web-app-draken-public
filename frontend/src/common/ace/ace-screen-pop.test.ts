import { describe, expect, test } from 'vitest';

import { AceScreenPopMessage } from './ace-jsapi.types';
import { parseScreenPop, redactAceEvent } from './ace-screen-pop';

// Test person number from Skatteverket, not a real person.
const personNumber = '199001012385';
// In the range PTS reserves for fiction, as in Telia's example.
const phoneNumber = '+46701740635';

// Shaped after Telia's afterNormalAccept example, with the identity replaced by a test person.
const acceptedIvrCall = (contactData: Record<string, string> = { eidUserPnr: personNumber }): AceScreenPopMessage => ({
  popEvent: 'afterNormalAccept',
  contact: {
    contactId: 264218330,
    contactStatus: 'active',
    currentContactsType: 'ivr',
    contactData: {
      Ani: phoneNumber,
      contactSourceType: 'ivr',
      direction: 'incoming',
      media: 'call',
      ...contactData,
    },
  },
});

describe('parseScreenPop', () => {
  test('returns both the personal number and the calling number of an identified caller', () => {
    expect(parseScreenPop(acceptedIvrCall())).toEqual({ contactId: '264218330', personNumber, phoneNumber });
  });

  test('returns the personal number of an identified caller with a hidden number', () => {
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: personNumber, Ani: '' }))).toEqual({
      contactId: '264218330',
      personNumber,
    });
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

  test('falls back to the calling number when the caller was not identified', () => {
    const { eidUserPnr: _omitted, ...withoutIdentity } = acceptedIvrCall().contact!.contactData!;
    expect(
      parseScreenPop({
        ...acceptedIvrCall(),
        contact: { contactId: 1, currentContactsType: 'ivr', contactData: withoutIdentity },
      })
    ).toEqual({ contactId: '1', phoneNumber });
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '' }))).toEqual({ contactId: '264218330', phoneNumber });
  });

  test('falls back to the calling number when the identity is not a valid personal number', () => {
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '199001012386' }))).toEqual({
      contactId: '264218330',
      phoneNumber,
    });
  });

  test('accepts the calling number in the formats the contact form takes', () => {
    const withAni = (Ani: string) => parseScreenPop(acceptedIvrCall({ Ani }))?.phoneNumber;
    expect(withAni('0046701740635')).toBe(phoneNumber);
    expect(withAni('070-174 06 35')).toBe('0701740635');
  });

  test('returns a caller without details when neither personal number nor calling number is usable', () => {
    const contactId = '264218330';
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '', Ani: '' }))).toEqual({ contactId });
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '', Ani: 'anonymous' }))).toEqual({ contactId });
    expect(parseScreenPop(acceptedIvrCall({ eidUserPnr: '', Ani: '123' }))).toEqual({ contactId });
  });

  test('does not take an identity that is not a valid 12-digit personal number', () => {
    const withoutAni = (eidUserPnr: string) => parseScreenPop(acceptedIvrCall({ eidUserPnr, Ani: '' }));
    expect(withoutAni('199001012386')).toEqual({ contactId: '264218330' });
    expect(withoutAni('9001012385')).toEqual({ contactId: '264218330' });
    expect(withoutAni('19900101-2385')).toEqual({ contactId: '264218330' });
  });

  test('ignores a call without a contact id, since it cannot be handled only once', () => {
    expect(parseScreenPop({ ...acceptedIvrCall(), contact: { contactId: '', currentContactsType: 'ivr' } })).toBeNull();
  });

  test('ignores a missing or empty message', () => {
    expect(parseScreenPop(undefined)).toBeNull();
    expect(parseScreenPop({})).toBeNull();
  });
});

describe('redactAceEvent', () => {
  test('hides personal and phone numbers but keeps the rest of the event', () => {
    expect(redactAceEvent(acceptedIvrCall())).toEqual({
      popEvent: 'afterNormalAccept',
      contact: {
        contactId: 264218330,
        contactStatus: 'active',
        currentContactsType: 'ivr',
        contactData: {
          Ani: '[dolt]',
          contactSourceType: 'ivr',
          direction: 'incoming',
          media: 'call',
          eidUserPnr: '[dolt]',
        },
      },
    });
  });

  test('hides numbers that look personal under any key', () => {
    expect(redactAceEvent({ contactData: { pnr: '19900101-2385', callback: 701740635, queue: 'Q12' } })).toEqual({
      contactData: { pnr: '[dolt]', callback: '[dolt]', queue: 'Q12' },
    });
  });

  test('keeps empty values and events without a payload as they are', () => {
    expect(redactAceEvent({ eidUserPnr: '' })).toEqual({ eidUserPnr: '' });
    expect(redactAceEvent(undefined)).toBeUndefined();
    expect(redactAceEvent({ reason: 'timeout' })).toEqual({ reason: 'timeout' });
  });
});
