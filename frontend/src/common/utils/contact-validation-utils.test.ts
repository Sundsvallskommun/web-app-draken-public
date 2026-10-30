import { mockEnv } from '@e2e/fixtures/mock-env';
import { describe, expect, test } from 'vitest';

import { emailSchema, isValidEmail, isValidPhoneNumber, phoneNumberSchema } from './contact-validation-utils';
import { phoneNumberFormatter } from './phoneNumberFormatter-utils';

const smsRecipientPattern = /^\+[1-9]\d{3,14}$/;

// Only the numbers and addresses in mockEnv are used, written the different ways a user may type them
const {
  mockPhoneNumber,
  mockPhoneNumberCountryCode,
  mockSecondaryPhoneNumber,
  mockLandlinePhoneNumber,
  mockLongAreaCodeLandlinePhoneNumber,
  mockEmail,
  mockRecipientEmail,
} = mockEnv;
const mockPhoneNumberWithLetters = mockPhoneNumber.replace('174', 'abc');
const mockEmailWithoutAt = mockEmail.replace('@', '.');

const acceptedPhoneNumbers = [
  mockPhoneNumber,
  mockPhoneNumberCountryCode,
  mockSecondaryPhoneNumber,
  mockPhoneNumber.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1-$2 $3 $4'),
  mockPhoneNumber.replace(/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '$1-$2-$3-$4'),
  mockPhoneNumberCountryCode.replace(/^(\+46)(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5'),
  mockPhoneNumberCountryCode.replace('+', '00'),
  ` ${mockPhoneNumber} `,
  mockLandlinePhoneNumber,
  mockLandlinePhoneNumber.replace(/^(08)/, '$1-'),
  mockLongAreaCodeLandlinePhoneNumber,
  mockLongAreaCodeLandlinePhoneNumber.replace(/^(0980)/, '$1-'),
];

const rejectedPhoneNumbers = [
  '+46',
  'abc',
  mockPhoneNumber.slice(0, 3),
  mockPhoneNumber.slice(0, -2),
  `${mockPhoneNumber}12`,
  mockPhoneNumberCountryCode.replace('+46', '+460'),
  mockPhoneNumberCountryCode.slice(1),
  `+${mockPhoneNumber}`,
  mockPhoneNumberWithLetters,
  mockLandlinePhoneNumber.slice(0, 7),
  `${mockLongAreaCodeLandlinePhoneNumber}12`,
];

describe('isValidPhoneNumber', () => {
  test.each(acceptedPhoneNumbers)('accepts %s', (phoneNumber) => {
    expect(isValidPhoneNumber(phoneNumber)).toBe(true);
  });

  test.each(rejectedPhoneNumbers)('rejects %s', (phoneNumber) => {
    expect(isValidPhoneNumber(phoneNumber)).toBe(false);
  });

  test.each(acceptedPhoneNumbers)('formats %s into a number the sms endpoints accept', (phoneNumber) => {
    expect(phoneNumberFormatter(phoneNumber)).toMatch(smsRecipientPattern);
  });

  test('accepts a mobile number only once all digits are typed', () => {
    const typedSoFar = [...mockPhoneNumber].map((_, index) => mockPhoneNumber.slice(0, index + 1));

    expect(typedSoFar.filter(isValidPhoneNumber)).toEqual([mockPhoneNumber]);
  });
});

describe('phoneNumberSchema', () => {
  test('allows an empty value', () => {
    expect(phoneNumberSchema().isValidSync('')).toBe(true);
    expect(phoneNumberSchema().isValidSync(undefined)).toBe(true);
  });

  test('gives the shared error message', () => {
    expect(() => phoneNumberSchema().validateSync(mockPhoneNumberWithLetters)).toThrow('Ej giltigt telefonnummer');
  });

  test('can be made required', () => {
    expect(phoneNumberSchema().required().isValidSync('')).toBe(false);
  });

  test('gives the same answer on repeated calls', () => {
    const schema = phoneNumberSchema();
    expect([1, 2, 3].map(() => schema.isValidSync(mockPhoneNumberCountryCode))).toEqual([true, true, true]);
  });
});

describe('emailSchema', () => {
  test('trims surrounding whitespace', () => {
    expect(emailSchema().validateSync(mockRecipientEmail)).toBe(mockRecipientEmail.trim());
  });

  test('gives the shared error message', () => {
    expect(() => emailSchema().validateSync(mockEmailWithoutAt)).toThrow('E-postadress har fel format');
  });

  test('isValidEmail', () => {
    expect(isValidEmail(mockEmail)).toBe(true);
    expect(isValidEmail(mockEmailWithoutAt)).toBe(false);
  });
});
