import assert from 'node:assert/strict';

import { getDefaultFormState, type RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { test } from 'vitest';

import {
  getInvestigationRenderingSchema,
  getInvestigationServerTimestamps,
  investigationDefaultFormStateBehavior,
  normalizeInvestigationFormData,
} from './investigation-form-data';
import hslDecisionSchemaRequest from './schemas/beslut-hsl.schema-request.json';
import solLssDecisionSchemaRequest from './schemas/beslut-sol-lss.schema-request.json';

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

// The published requests keep literal types; RJSF's JSONSchema7 needs the widened shape.
const hslDecisionSchema = hslDecisionSchemaRequest.value as unknown as RJSFSchema;
const solLssDecisionSchema = solLssDecisionSchemaRequest.value as unknown as RJSFSchema;
const decisions = [
  { key: 'beslut-hsl', schema: hslDecisionSchema, answers: {} },
  {
    key: 'beslut-sol-lss',
    schema: solLssDecisionSchema,
    answers: { decidedMisconductDegree: 'misconduct', decisionMotivation: '<p>Missförhållande.</p>' },
  },
] as const;

// The IVO and Public 360 case numbers only exist once the errand is reported to IVO. Whatever
// the form still holds from an earlier answer is dropped.
for (const decision of decisions) {
  test(`${decision.key} normalization drops both case numbers unless the errand is reported to IVO`, () => {
    const notReported = normalizeInvestigationFormData(decision.key, decision.schema, {
      ...decision.answers,
      decidedAt: '2026-09-11T12:30:00.000Z',
      ivoNotification: 'no',
      ivoCaseNumber: 'IVO-stale',
      public360CaseNumber: 'P360-stale',
    });
    assert.deepEqual(notReported, {
      ...decision.answers,
      decidedAt: '2026-09-11T12:30:00.000Z',
      ivoNotification: 'no',
    });

    const reported = {
      ...decision.answers,
      ivoNotification: 'yes',
      ivoCaseNumber: 'IVO-1',
      public360CaseNumber: 'P360-1',
    };
    assert.deepEqual(normalizeInvestigationFormData(decision.key, decision.schema, reported), reported);

    const unanswered = normalizeInvestigationFormData(decision.key, decision.schema, {
      ...decision.answers,
      ivoCaseNumber: 'IVO-early',
      public360CaseNumber: 'P360-early',
      unknown: 1,
    });
    assert.deepEqual(unanswered, decision.answers);
  });

  test(`the ${decision.key} rendering schema hides the case numbers the normalization drops`, () => {
    const fields = (formData: Record<string, unknown>) =>
      Object.keys(getInvestigationRenderingSchema(decision.key, decision.schema, formData).properties ?? {});
    const allFields = Object.keys(decision.schema.properties ?? {});
    const withoutCaseNumbers = allFields.filter(
      (field) => field !== 'ivoCaseNumber' && field !== 'public360CaseNumber'
    );

    assert.deepEqual(fields({}), withoutCaseNumbers);
    assert.deepEqual(fields({ ivoNotification: 'no' }), withoutCaseNumbers);
    assert.deepEqual(fields({ ivoNotification: 'yes' }), allFields);
    // The source schema is not touched.
    assert.ok(decision.schema.properties && 'public360CaseNumber' in decision.schema.properties);
  });
}

test('the HSL investigation keeps only the IVO case number rule, for documents still bound to 1.0', () => {
  const legacyHsl: RJSFSchema = {
    type: 'object',
    properties: {
      ivoNotification: { type: 'string' },
      ivoCaseNumber: { type: 'string' },
      public360CaseNumber: { type: 'string' },
    },
  };
  assert.deepEqual(
    normalizeInvestigationFormData('utredning-hsl', legacyHsl, {
      ivoNotification: 'no',
      ivoCaseNumber: 'IVO-stale',
      public360CaseNumber: 'P360-kept',
    }),
    { ivoNotification: 'no', public360CaseNumber: 'P360-kept' }
  );
});

test('reports the server-stamped timestamps the schema declares and the document carries', () => {
  assert.deepEqual(getInvestigationServerTimestamps(solLssDecisionSchema, {}), []);
  assert.deepEqual(
    getInvestigationServerTimestamps(solLssDecisionSchema, {
      decidedAt: '2026-09-11T12:30:00.000Z',
      updatedAt: '2026-09-12T08:00:00.000Z',
      revisions: [{ savedAt: '2026-09-12T08:00:00.000Z', savedBy: 'iaf.test' }],
    }),
    [
      { name: 'decidedAt', label: 'Beslutat', value: '2026-09-11T12:30:00.000Z' },
      { name: 'updatedAt', label: 'Senast ändrat', value: '2026-09-12T08:00:00.000Z' },
    ]
  );
  assert.deepEqual(
    getInvestigationServerTimestamps(solLssDecisionSchema, { decidedAt: '  ', ivoNotification: 'no' }),
    []
  );
  assert.deepEqual(getInvestigationServerTimestamps(choiceSchema, { answer: 'yes' }), []);
});
