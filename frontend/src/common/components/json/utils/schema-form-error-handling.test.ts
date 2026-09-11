import assert from 'node:assert/strict';

import type { RJSFSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import managerSchema from '@supportmanagement/investigation/avvikelse/schemas/utredning-enhetschef.schema-request.json';
import Ajv2020 from 'ajv/dist/2020';
import { test } from 'vitest';

import createJsonErrorTransformer, { getSchemaFormErrors } from './schema-form-error-handling';

const validator = customizeValidator({ AjvClass: Ajv2020 });

function validate(schema: RJSFSchema, data: Record<string, unknown>) {
  return validator.validateFormData(data, schema, undefined, createJsonErrorTransformer(schema)).errors;
}

test('summarizes nested investigation errors with Swedish titles and navigable field ids', () => {
  // The published request keeps literal types; RJSF's JSONSchema7 needs the widened shape.
  const schema = managerSchema.value as unknown as RJSFSchema;
  const errors = validate(schema, { legalBases: ['HSL'], riskAssessmentHsl: {} });
  const summary = getSchemaFormErrors(schema, errors, 'utredning-enhetschef');

  assert.ok(
    summary.some((error) => error.label === 'Riskbedömning HSL – Legitimerad personal som medverkat i bedömningen')
  );
  const probability = summary.find((error) => error.fieldId === 'utredning-enhetschef_riskAssessmentHsl_probability');
  assert.ok(probability);
  assert.equal(probability.label, 'Riskbedömning HSL – Sannolikhet för inträffande');
  assert.equal(probability.message, 'Vänligen ange Sannolikhet för inträffande.');
  assert.ok(summary.every((error) => !error.message.includes('must')));
  assert.ok(summary.every((error) => !error.message.includes('then')));
});

test('distinguishes repeated rows and includes the violated limit', () => {
  const schema: RJSFSchema = {
    type: 'object',
    properties: {
      people: {
        title: 'Deltagare',
        type: 'array',
        items: {
          type: 'object',
          required: ['name'],
          properties: { name: { title: 'Namn', type: 'string', minLength: 2 } },
        },
      },
    },
  };
  const summary = getSchemaFormErrors(schema, validate(schema, { people: [{}, { name: 'A' }] }), 'document');
  assert.deepEqual(summary, [
    { fieldId: 'document_people_0_name', label: 'Deltagare – Rad 1 – Namn', message: 'Vänligen ange Namn.' },
    { fieldId: 'document_people_1_name', label: 'Deltagare – Rad 2 – Namn', message: 'Ange minst 2 tecken.' },
  ]);
  assert.deepEqual(getSchemaFormErrors(schema, validate(schema, { people: [{ name: 'Anna' }] }), 'document'), []);
});

test('shows conditional required fields once without the technical branch error', () => {
  const schema: RJSFSchema = {
    type: 'object',
    properties: { details: { title: 'Beskrivning', type: 'string' } },
    allOf: [
      { if: { type: 'object' }, then: { required: ['details'] } },
      { if: { type: 'object' }, then: { required: ['details'] } },
    ],
  };
  assert.deepEqual(getSchemaFormErrors(schema, validate(schema, {}), 'document'), [
    { fieldId: 'document_details', label: 'Beskrivning', message: 'Vänligen ange Beskrivning.' },
  ]);
});
