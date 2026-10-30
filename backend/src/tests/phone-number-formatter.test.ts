import { describe, expect, it } from 'vitest';

import { phoneNumberFormatter } from '@/utils/phone-number-formatter';

import { mockPhoneNumber, mockPhoneNumberCountryCode } from './helpers/mock-data';

describe('phoneNumberFormatter', () => {
  it.each([
    mockPhoneNumber,
    mockPhoneNumber.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1-$2 $3 $4'),
    ` ${mockPhoneNumber} `,
    mockPhoneNumberCountryCode,
    mockPhoneNumberCountryCode.replace(/^(\+46)(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5'),
    mockPhoneNumberCountryCode.replace('+', '00'),
  ])('formats %s with the country code the sms endpoint requires', phoneNumber => {
    expect(phoneNumberFormatter(phoneNumber)).toBe(mockPhoneNumberCountryCode);
  });

  it('returns an empty string when there is no number', () => {
    expect(phoneNumberFormatter(undefined)).toBe('');
  });
});
