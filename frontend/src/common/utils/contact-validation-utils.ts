import { phoneNumberFormatter } from '@common/utils/phoneNumberFormatter-utils';
import * as yup from 'yup';

// Both patterns are stricter subsets of E.164, the format the sms endpoints in Messaging and SupportManagement require.
// Swedish: 7–9 digits after +46, where numbers starting with 7 (mobile) always have 9
const swedishPhoneNumberPattern = /^\+46(7\d{8}|[1-689]\d{6,8})$/;
// Other countries: country code and number together, at least 7 digits so a half-typed number is not accepted
const internationalPhoneNumberPattern = /^\+(?!46)[1-9]\d{6,14}$/;

export const invalidPhoneMessage = 'Ej giltigt telefonnummer';
export const invalidEmailMessage = 'E-postadress har fel format';

// Validates the number as phoneNumberFormatter will store and send it, so 070-174 06 35 and +46701740635 are equal
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const formattedPhoneNumber = phoneNumberFormatter(phoneNumber);
  return (
    swedishPhoneNumberPattern.test(formattedPhoneNumber) || internationalPhoneNumberPattern.test(formattedPhoneNumber)
  );
};

export const phoneNumberSchema = () =>
  yup
    .string()
    .trim()
    .test('valid-phone-number', invalidPhoneMessage, (phoneNumber) => !phoneNumber || isValidPhoneNumber(phoneNumber));

export const emailSchema = () => yup.string().trim().email(invalidEmailMessage);

export const isValidEmail = (email: string): boolean => emailSchema().isValidSync(email);
