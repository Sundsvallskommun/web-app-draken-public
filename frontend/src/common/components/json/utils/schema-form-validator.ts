import { isValidEmail } from '@common/utils/contact-validation-utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import Ajv2020 from 'ajv/dist/2020';

// Schemas declare $schema: draft 2020-12, which the default AJV8 validator (draft-07) cannot compile.
// format: email uses the same rule as the rest of Draken; the value is saved as typed, so surrounding spaces are not allowed.
export const schemaFormValidator = customizeValidator({
  AjvClass: Ajv2020,
  customFormats: { email: (email: string) => email === email.trim() && isValidEmail(email) },
});
