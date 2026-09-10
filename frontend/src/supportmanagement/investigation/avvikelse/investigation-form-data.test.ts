import assert from 'node:assert/strict';

import { getDefaultFormState, type RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { test } from 'vitest';

import {
  getInvestigationRenderingSchema,
  investigationDefaultFormStateBehavior,
  normalizeInvestigationFormData,
} from './investigation-form-data';
import decisionSchemaRequest from './schemas/beslut-missforhallande.schema-request.json';

const choiceSchema: RJSFSchema = {
  type: 'object',
  required: ['answer', 'risk'],
  properties: {
    answer: {
      type: 'string',
      oneOf: [
        { const: 'yes', title: 'Ja' },
        { const: 'no', title: 'Nej' },
      ],
    },
    risk: {
      type: 'object',
      required: ['severity'],
      properties: {
        severity: {
          type: 'integer',
          oneOf: [
            { const: 1, title: 'Låg' },
            { const: 2, title: 'Hög' },
          ],
        },
      },
    },
    legalBases: { type: 'array', items: { type: 'string' }, default: ['SOL', 'LSS'] },
  },
};

test('leaves unanswered investigation choices empty and invalid when required', () => {
  const data = getDefaultFormState(
    validator,
    choiceSchema,
    {},
    choiceSchema,
    false,
    investigationDefaultFormStateBehavior
  );

  assert.equal(data.answer, undefined);
  assert.equal(data.risk?.severity, undefined);
  assert.deepEqual(data.legalBases, ['SOL', 'LSS']);
  const result = validator.validateFormData(data, choiceSchema);
  assert(result.errors.some((error) => error.name === 'required' && error.params.missingProperty === 'answer'));
  assert(result.errors.some((error) => error.name === 'required' && error.params.missingProperty === 'severity'));
});

test('preserves saved answers, including the first option, instead of treating them as unanswered', () => {
  for (const answer of ['yes', 'no']) {
    for (const severity of [1, 2]) {
      const saved = { answer, risk: { severity }, legalBases: ['HSL'] };
      const data = getDefaultFormState(
        validator,
        choiceSchema,
        saved,
        choiceSchema,
        false,
        investigationDefaultFormStateBehavior
      );

      assert.deepEqual(data, saved);
      assert.equal(validator.validateFormData(data, choiceSchema).errors.length, 0);
    }
  }
});

test('normalizes nested values through root-level local schema references', () => {
  const schema: RJSFSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      section: { $ref: '#/$defs/section' },
    },
    $defs: {
      section: {
        type: 'object',
        additionalProperties: false,
        properties: {
          retained: { type: 'string' },
        },
      },
    },
  };

  assert.deepEqual(
    normalizeInvestigationFormData('future-schema', schema, {
      section: {
        retained: 'behålls',
        stale: 'tas bort',
      },
    }),
    {
      section: {
        retained: 'behålls',
      },
    }
  );
});

const decisionSchema = decisionSchemaRequest.value as RJSFSchema;
const decisionKey = 'beslut-missforhallande';

// The decision asks its follow-up questions only once a misconduct is established, and asks for a
// motivation only for a No. Whatever the form still holds from an earlier answer is dropped.
test('decision normalization drops the follow-ups and motivations the answers make inapplicable', () => {
  const noMisconduct = normalizeInvestigationFormData(decisionKey, decisionSchema, {
    decisionDate: '2026-09-01',
    misconductEstablished: 'no',
    misconductEstablishedMotivation: '<p>Inget missförhållande.</p>',
    seriousMisconduct: 'no',
    seriousMisconductMotivation: '<p>Kvar från ett tidigare svar.</p>',
    tangibleRiskOfSeriousMisconduct: 'yes',
    reportedToIvo: 'yes',
    reportedToIvoMotivation: '<p>Kvar från ett tidigare svar.</p>',
    ivoCaseNumber: 'IVO-1',
  });

  assert.deepEqual(noMisconduct, {
    decisionDate: '2026-09-01',
    misconductEstablished: 'no',
    misconductEstablishedMotivation: '<p>Inget missförhållande.</p>',
    reportedToIvo: 'yes',
    ivoCaseNumber: 'IVO-1',
  });

  const misconduct = normalizeInvestigationFormData(decisionKey, decisionSchema, {
    misconductEstablished: 'yes',
    misconductEstablishedMotivation: '<p>Kvar från ett tidigare svar.</p>',
    seriousMisconduct: 'yes',
    seriousMisconductMotivation: '<p>Kvar från ett tidigare svar.</p>',
    tangibleRiskOfSeriousMisconduct: 'no',
    tangibleRiskOfSeriousMisconductMotivation: '<p>Skadan var redan skedd.</p>',
    reportedToIvo: 'no',
    reportedToIvoMotivation: '<p>Ej anmälningspliktigt.</p>',
    ivoCaseNumber: 'IVO-stale',
  });

  assert.deepEqual(misconduct, {
    misconductEstablished: 'yes',
    seriousMisconduct: 'yes',
    tangibleRiskOfSeriousMisconduct: 'no',
    tangibleRiskOfSeriousMisconductMotivation: '<p>Skadan var redan skedd.</p>',
    reportedToIvo: 'no',
    reportedToIvoMotivation: '<p>Ej anmälningspliktigt.</p>',
  });
});

test('decision normalization keeps an unanswered form untouched apart from unknown fields', () => {
  assert.deepEqual(normalizeInvestigationFormData(decisionKey, decisionSchema, { unknown: 1 }), {});
});

test('the decision rendering schema hides the same fields the normalization drops', () => {
  const fields = (formData: Record<string, unknown>) =>
    Object.keys(getInvestigationRenderingSchema(decisionKey, decisionSchema, formData).properties ?? {});

  assert.deepEqual(fields({}), ['decisionDate', 'misconductEstablished', 'reportedToIvo', 'supplementaryInformation']);
  assert.deepEqual(fields({ misconductEstablished: 'no', reportedToIvo: 'no' }), [
    'decisionDate',
    'misconductEstablished',
    'misconductEstablishedMotivation',
    'reportedToIvo',
    'reportedToIvoMotivation',
    'supplementaryInformation',
  ]);
  assert.deepEqual(fields({ misconductEstablished: 'yes', seriousMisconduct: 'no', reportedToIvo: 'yes' }), [
    'decisionDate',
    'misconductEstablished',
    'seriousMisconduct',
    'seriousMisconductMotivation',
    'tangibleRiskOfSeriousMisconduct',
    'reportedToIvo',
    'ivoCaseNumber',
    'supplementaryInformation',
  ]);
  // The source schema is not touched.
  assert.ok(decisionSchema.properties && 'seriousMisconduct' in decisionSchema.properties);
});
