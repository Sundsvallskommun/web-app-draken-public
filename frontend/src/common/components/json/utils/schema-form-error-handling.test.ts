import assert from 'node:assert/strict';

import { mockEnv } from '@e2e/fixtures/mock-env';
import type { RJSFSchema } from '@rjsf/utils';
import { test } from 'vitest';

import createJsonErrorTransformer, { getSchemaFormErrors } from './schema-form-error-handling';
import { schemaFormValidator } from './schema-form-validator';

function validate(schema: RJSFSchema, data: Record<string, unknown>) {
  return schemaFormValidator.validateFormData(data, schema, undefined, createJsonErrorTransformer(schema)).errors;
}

test('validates format email with the same rule and message as the rest of Draken', () => {
  const schema: RJSFSchema = {
    type: 'object',
    properties: { contact: { title: 'E-post', type: 'string', format: 'email' } },
  };

  assert.equal(validate(schema, { contact: mockEnv.mockEmail }).length, 0);
  // Saved as typed, so the leading space in mockRecipientEmail makes it invalid here
  assert.equal(validate(schema, { contact: mockEnv.mockRecipientEmail }).length, 1);
  const [invalidEmailError] = validate(schema, { contact: mockEnv.mockEmail.replace('@', '.') });
  assert.equal(invalidEmailError.message, 'E-postadress har fel format');
});

test('summarizes nested errors with Swedish titles and navigable field ids', () => {
  const schema: RJSFSchema = {
    type: 'object',
    properties: {
      riskAssessmentHsl: {
        title: 'Riskbedömning HSL',
        type: 'object',
        required: ['participants', 'probability'],
        properties: {
          participants: { title: 'Legitimerad personal som medverkat i bedömningen', type: 'string' },
          probability: { title: 'Sannolikhet för inträffande', type: 'string' },
        },
      },
    },
  };
  const errors = validate(schema, { legalBases: ['HSL'], riskAssessmentHsl: {} });
  const summary = getSchemaFormErrors(schema, errors, 'utredning-enhetschef');

  assert.ok(
    summary.some((error) => error.label === 'Riskbedömning HSL – Legitimerad personal som medverkat i bedömningen')
  );
  const probability = summary.find((error) => error.fieldId === 'utredning-enhetschef_riskAssessmentHsl_probability');
  assert.ok(probability);
  assert.deepEqual(probability.ancestorIds, ['utredning-enhetschef_riskAssessmentHsl']);
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
    {
      fieldId: 'document_people_0_name',
      ancestorIds: ['document_people', 'document_people_0'],
      label: 'Deltagare – Rad 1 – Namn',
      message: 'Vänligen ange Namn.',
    },
    {
      fieldId: 'document_people_1_name',
      ancestorIds: ['document_people', 'document_people_1'],
      label: 'Deltagare – Rad 2 – Namn',
      message: 'Ange minst 2 tecken.',
    },
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
    { fieldId: 'document_details', ancestorIds: [], label: 'Beskrivning', message: 'Vänligen ange Beskrivning.' },
  ]);
});
