import { describe, expect, test } from 'vitest';

import { AceScreenPopMessage } from './ace-jsapi.types';
import { loggableScreenPop, parseScreenPop } from './ace-screen-pop';

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

  test('formats the calling number like numbers entered by the case worker', () => {
    const withAni = (Ani: string) => parseScreenPop(acceptedIvrCall({ Ani }))?.phoneNumber;
    expect(withAni('0046701740635')).toBe(phoneNumber);
    expect(withAni('070-174 06 35')).toBe(phoneNumber);
    expect(withAni('(070) 174 06 35')).toBe(phoneNumber);
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

describe('loggableScreenPop', () => {
  test('keeps the fields that describe the contact and hides the rest by key', () => {
    expect(loggableScreenPop(acceptedIvrCall())).toEqual({
      popEvent: 'afterNormalAccept',
      contact: {
        contactId: 264218330,
        contactStatus: 'active',
        currentContactsType: 'ivr',
        isActiveContact: undefined,
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

  test('hides values under keys it does not know, whatever they look like', () => {
    const message = acceptedIvrCall({ customerName: 'Anna Andersson', email: 'anna@example.com', queue: 'Q12' });
    expect(loggableScreenPop(message).contact?.contactData).toMatchObject({
      customerName: '[dolt]',
      email: '[dolt]',
      queue: '[dolt]',
    });
  });

  test('keeps empty values, so the log shows that ACE sent the key without a value', () => {
    expect(loggableScreenPop(acceptedIvrCall({ eidUserPnr: '' })).contact?.contactData?.eidUserPnr).toBe('');
  });

  test('handles a missing or empty message', () => {
    expect(loggableScreenPop(undefined)).toEqual({ popEvent: undefined, contact: undefined });
    expect(loggableScreenPop({ popEvent: 'manual' })).toEqual({ popEvent: 'manual', contact: undefined });
  });
});
