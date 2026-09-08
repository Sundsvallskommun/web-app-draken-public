import assert from 'node:assert/strict';

import { getDefaultFormState, type RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { test } from 'vitest';

import { investigationDefaultFormStateBehavior, normalizeInvestigationFormData } from './investigation-form-data';

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
