import assert from 'node:assert/strict';

import { getDefaultFormState, type RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { test } from 'vitest';

import {
  getInvestigationCompletion,
  getInvestigationRenderingSchema,
  getInvestigationReports,
  getInvestigationServerTimestamps,
  investigationDefaultFormStateBehavior,
  isInvestigationCompleted,
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
  // No empty object is defaulted for the unanswered risk, so it is the object itself that is missing.
  assert(result.errors.some((error) => error.name === 'required' && error.params.missingProperty === 'risk'));
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
    // The server's timestamp is dropped along with the case numbers; the BFF stamps it anew.
    assert.deepEqual(notReported, {
      ...decision.answers,
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

test('reads the completion declaration, the completed state and the report log the schema declares', () => {
  const schema: RJSFSchema = {
    type: 'object',
    'x-draken-completion': { field: 'completed', reportsField: 'reports' },
    properties: { completed: { type: 'string' }, reports: { type: 'array' } },
  } as RJSFSchema;
  const report = { generatedAt: '2026-09-11T12:30:00.000Z', generatedBy: 'iaf.test', fileName: 'Utredning HSL_1.pdf' };

  assert.deepEqual(getInvestigationCompletion(schema), { field: 'completed', reportsField: 'reports' });
  assert.equal(getInvestigationCompletion(choiceSchema), undefined);
  assert.equal(isInvestigationCompleted(schema, { completed: 'yes' }), true);
  assert.equal(isInvestigationCompleted(schema, { completed: 'no' }), false);
  assert.equal(isInvestigationCompleted(schema, {}), false);
  assert.equal(isInvestigationCompleted(choiceSchema, { completed: 'yes' }), false);
  assert.deepEqual(getInvestigationReports(schema, {}), []);
  assert.deepEqual(
    getInvestigationReports(schema, { reports: [report, { fileName: 'broken' }, { ...report, attachmentId: 'a-1' }] }),
    [report, { ...report, attachmentId: 'a-1' }]
  );
  assert.deepEqual(getInvestigationReports(choiceSchema, { reports: [report] }), []);
});

// The server's own properties never ride along in the form: RJSF would default the report log to
// an empty list and the BFF would strip it again, which read as an unsaved change after every save.
test('normalization drops server-controlled properties, whatever the form or the server holds', () => {
  const schema: RJSFSchema = {
    type: 'object',
    properties: {
      note: { type: 'string' },
      reports: { type: 'array', 'x-draken-server-owned': true },
      decidedAt: { type: 'string', 'x-draken-server-timestamp': 'created' },
      revisions: { type: 'array', 'x-draken-server-revisions': true },
    },
  } as RJSFSchema;
  assert.deepEqual(
    normalizeInvestigationFormData('utredning-hsl', schema, {
      note: 'kept',
      reports: [],
      decidedAt: '2026-09-11T12:30:00.000Z',
      revisions: [{ savedAt: 'x', savedBy: 'y' }],
    }),
    { note: 'kept' }
  );
  assert.deepEqual(
    normalizeInvestigationFormData('utredning-hsl', solLssDecisionSchema, { ivoNotification: 'no', reports: [] }),
    {
      ivoNotification: 'no',
    }
  );
});

// Untouched multi-selects emit [] on mount; a stored document without those keys must not read
// as changed, so an empty list normalizes to no answer at all.
test('normalization drops empty root arrays and keeps answered ones', () => {
  const schema: RJSFSchema = {
    type: 'object',
    properties: {
      causeAreas: { type: 'array', items: { type: 'string' } },
      legalBases: { type: 'array', items: { type: 'string' } },
      note: { type: 'string' },
    },
  };
  assert.deepEqual(
    normalizeInvestigationFormData('utredning-hsl', schema, { causeAreas: [], legalBases: ['HSL'], note: '' }),
    {
      legalBases: ['HSL'],
      note: '',
    }
  );
});
