import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import Ajv2020 from 'ajv/dist/2020.js';
import { test } from 'vitest';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const artifacts = [
  {
    name: 'utredning-enhetschef',
    version: '1.1',
    hasErrandClassification: true,
    schemaFile: 'utredning-enhetschef.schema-request.json',
    uiSchemaFile: 'utredning-enhetschef.ui-schema-request.json',
  },
  {
    name: 'utredning-sol-lss',
    version: '1.1',
    hasErrandClassification: true,
    schemaFile: 'utredning-sol-lss.schema-request.json',
    uiSchemaFile: 'utredning-sol-lss.ui-schema-request.json',
  },
  {
    name: 'utredning-hsl',
    version: '1.1',
    hasErrandClassification: false,
    schemaFile: 'utredning-hsl.schema-request.json',
    uiSchemaFile: 'utredning-hsl.ui-schema-request.json',
  },
  {
    name: 'beslut-hsl',
    version: '1.2',
    hasErrandClassification: false,
    schemaFile: 'beslut-hsl.schema-request.json',
    uiSchemaFile: 'beslut-hsl.ui-schema-request.json',
  },
  {
    name: 'beslut-sol-lss',
    version: '1.3',
    hasErrandClassification: false,
    schemaFile: 'beslut-sol-lss.schema-request.json',
    uiSchemaFile: 'beslut-sol-lss.ui-schema-request.json',
  },
];

const decisionArtifacts = artifacts.filter(({ name }) => name.startsWith('beslut-'));

// The artifacts are arbitrary JSON documents that the assertions walk structurally,
// so the traversal helpers below are deliberately untyped.
function readJson(relativePath: string) {
  return JSON.parse(readFileSync(join(currentDirectory, relativePath), 'utf8'));
}

function createValidator(schema: any) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  ajv.addFormat('date', /^\d{4}-\d{2}-\d{2}$/u);
  ajv.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u);
  return { ajv, validate: ajv.compile(schema) };
}

function assertCalculatedRisk(riskAssessment: any, label: string) {
  assert.equal(
    riskAssessment.calculatedRiskValue,
    riskAssessment.probability * riskAssessment.severity,
    `${label} must equal probability * severity`
  );
}

function collectPropertyNames(schema: any, result: string[] = []): string[] {
  if (!schema || typeof schema !== 'object') return result;

  if (schema.properties && typeof schema.properties === 'object') {
    for (const [name, propertySchema] of Object.entries(schema.properties)) {
      result.push(name);
      collectPropertyNames(propertySchema, result);
    }
  }

  if (schema.items && typeof schema.items === 'object') {
    collectPropertyNames(schema.items, result);
  }

  if (schema.$defs && typeof schema.$defs === 'object') {
    for (const definition of Object.values(schema.$defs)) {
      collectPropertyNames(definition, result);
    }
  }

  return result;
}

function collectObjectKeys(value: any, result = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') return result;

  if (Array.isArray(value)) {
    for (const item of value) collectObjectKeys(item, result);
    return result;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    result.add(key);
    collectObjectKeys(nestedValue, result);
  }

  return result;
}

const fixtures = readJson('fixtures/investigation-schema-cases.json');

test('WSO2 request artifacts have the expected envelope and matching schema names', () => {
  for (const artifact of artifacts) {
    const schemaRequest = readJson(artifact.schemaFile);
    const uiSchemaRequest = readJson(artifact.uiSchemaFile);

    assert.deepEqual(Object.keys(schemaRequest).sort(), ['description', 'name', 'value', 'version']);
    assert.deepEqual(Object.keys(uiSchemaRequest).sort(), ['description', 'value']);
    assert.equal(schemaRequest.name, artifact.name);
    assert.equal(schemaRequest.version, artifact.version);
    assert.equal(schemaRequest.value.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schemaRequest.value.type, 'object');
    assert.equal(schemaRequest.value.additionalProperties, false);
    assert.equal(schemaRequest.value.$id, `https://schemas.sundsvall.se/2281/${artifact.name}/${artifact.version}`);
  }
});

test('UI schemas group every root field once and disable unsaved section completion state', () => {
  for (const artifact of artifacts) {
    const schema = readJson(artifact.schemaFile).value;
    const uiSchema = readJson(artifact.uiSchemaFile).value;
    const propertyNames = Object.keys(schema.properties);
    const orderedFields = uiSchema['ui:order'];
    const sectionFields = uiSchema['ui:sections']
      .flatMap((section: any) => section.fields)
      .filter((fieldName: string) => !fieldName.startsWith('$external:'));

    assert.equal(uiSchema['ui:options'].showSectionCompletion, false);
    assert.deepEqual(new Set(orderedFields), new Set(propertyNames));
    assert.deepEqual(new Set(sectionFields), new Set(propertyNames));
    assert.equal(
      sectionFields.length,
      new Set(sectionFields).size,
      `${artifact.name} contains duplicate section fields`
    );
  }
});

test('every investigation section starts open', () => {
  const assertOpenSections = (value: unknown, path: string): void => {
    if (typeof value !== 'object' || value === null) return;
    for (const [key, child] of Object.entries(value)) {
      if (key === 'ui:sections') {
        assert(Array.isArray(child), `${path}.${key} must be an array`);
        for (const section of child) {
          assert.equal(section.defaultOpen, true, `${path}.${section.id} must start open`);
        }
      }
      assertOpenSections(child, `${path}.${key}`);
    }
  };
  for (const artifact of artifacts) assertOpenSections(readJson(artifact.uiSchemaFile).value, artifact.name);
});

test('schemas contain investigation data only, without action plans or working notes', () => {
  for (const artifact of artifacts) {
    const schema = readJson(artifact.schemaFile).value;
    const propertyNames = collectPropertyNames(schema);

    for (const propertyName of propertyNames) {
      assert.doesNotMatch(propertyName, /^(actions?|actionPlan|workingNotes|arbetsanteckningar)$/iu);
    }
  }
});

test('schemas declare errand classification externally only where it is edited', () => {
  const expectedDeclaration = {
    kind: 'supportManagementLabelClassification',
    legalBasesPointer: '/legalBases',
    required: true,
  };

  for (const artifact of artifacts) {
    const schema = readJson(artifact.schemaFile).value;
    const uiSchema = readJson(artifact.uiSchemaFile).value;
    const externalFields = uiSchema['ui:sections']
      .flatMap((section: any) => section.fields)
      .filter((fieldName: string) => fieldName.startsWith('$external:'));

    if (artifact.hasErrandClassification) {
      assert.deepEqual(schema['x-draken-external-fields'], {
        errandClassification: expectedDeclaration,
      });
      assert.deepEqual(externalFields, ['$external:errandClassification']);
    } else {
      assert.equal(schema['x-draken-external-fields'], undefined);
      assert.deepEqual(externalFields, []);
    }
  }
});

test('errand classification values stay outside investigation JSON properties and fixtures', () => {
  const classificationValueFields = [
    'category',
    'classification',
    'deviationSubtype',
    'deviationType',
    'errandClassification',
    'labels',
    'subType',
    'type',
  ];
  const fixtureKeys = new Set<string>();

  collectObjectKeys(fixtures, fixtureKeys);

  for (const fieldName of classificationValueFields) {
    assert.equal(fixtureKeys.has(fieldName), false, `fixtures contain errand classification field ${fieldName}`);
  }

  for (const artifact of artifacts) {
    const propertyNames = new Set(collectPropertyNames(readJson(artifact.schemaFile).value));

    for (const fieldName of classificationValueFields) {
      assert.equal(
        propertyNames.has(fieldName),
        false,
        `${artifact.name} persists errand classification field ${fieldName}`
      );
    }
  }
});

test('UI schemas keep the agreed Draken accordion structure', () => {
  const expectedSections: Record<string, { id: string; title: string }[]> = {
    'utredning-enhetschef': [{ id: 'categorization-and-documentation', title: 'Kategorisering och dokumentation' }],
    'utredning-sol-lss': [
      { id: 'categorization', title: 'Kategorisering' },
      { id: 'event-information', title: 'Information om händelsen' },
      { id: 'assessment-and-decision-proposal', title: 'Bedömning och förslag till beslut' },
    ],
    'utredning-hsl': [
      { id: 'assignment', title: 'Uppdrag' },
      { id: 'analysis-team-participants', title: 'Deltagare i analysteam' },
      { id: 'methodology', title: 'Metodik' },
      { id: 'result', title: 'Resultat' },
      { id: 'commissioner-comment', title: 'Uppdragsgivarens kommentar' },
    ],
    'beslut-hsl': [{ id: 'decision', title: 'Beslut' }],
    'beslut-sol-lss': [
      { id: 'decision', title: 'Beslut om missförhållande' },
      { id: 'ivo-report', title: 'Anmälan till IVO' },
    ],
  };

  for (const artifact of artifacts) {
    const uiSchema = readJson(artifact.uiSchemaFile).value;
    assert.deepEqual(
      uiSchema['ui:sections'].map(({ id, title }: { id: string; title: string }) => ({ id, title })),
      expectedSections[artifact.name]
    );
  }

  // The IVO question comes first; its case number and the Public 360 number follow it.
  for (const artifact of decisionArtifacts) {
    const order: string[] = readJson(artifact.uiSchemaFile).value['ui:order'];
    assert.ok(order.indexOf('ivoNotification') < order.indexOf('ivoCaseNumber'), artifact.name);
    assert.ok(order.indexOf('ivoCaseNumber') < order.indexOf('public360CaseNumber'), artifact.name);
  }
});

test('valid fixtures satisfy their draft 2020-12 schemas', () => {
  for (const artifact of artifacts) {
    const schema = readJson(artifact.schemaFile).value;
    const { ajv, validate } = createValidator(schema);
    const valid = validate(fixtures[artifact.name].valid);

    assert.equal(valid, true, ajv.errorsText(validate.errors, { separator: '\n' }));
  }
});

test('invalid fixtures are rejected by their schemas', () => {
  for (const artifact of artifacts) {
    const schema = readJson(artifact.schemaFile).value;
    const { validate } = createValidator(schema);

    for (const invalidFixture of fixtures[artifact.name].invalid) {
      assert.equal(
        validate(invalidFixture.value),
        false,
        `${artifact.name} accepted invalid fixture: ${invalidFixture.description}`
      );
    }
  }
});

test('unit manager risk objects expose the agreed formula metadata and readonly result fields', () => {
  const schema = readJson('utredning-enhetschef.schema-request.json').value;
  const uiSchema = readJson('utredning-enhetschef.ui-schema-request.json').value;
  const validFixture = fixtures['utredning-enhetschef'].valid;
  const { validate } = createValidator(schema);

  assert.equal(schema.$defs.riskValueConsistency.allOf.length, 16);

  for (const riskKey of ['riskAssessmentHsl', 'riskAssessmentSolLss']) {
    const riskSchema = schema.properties[riskKey];
    assert.equal(riskSchema['x-calculation'].formula, 'probability * severity');
    assert.deepEqual(riskSchema['x-calculation'].inputs, ['probability', 'severity']);
    assert.equal(riskSchema['x-calculation'].result, 'calculatedRiskValue');
    assert.equal(riskSchema.properties.calculatedRiskValue.readOnly, true);
    assert.equal(riskSchema.$ref, '#/$defs/riskValueConsistency');
    assert.equal(uiSchema[riskKey]['ui:options'].showObjectFieldset, true);
    assert.equal(uiSchema[riskKey].calculatedRiskValue['ui:readonly'], true);
    assertCalculatedRisk(validFixture[riskKey], riskKey);
  }

  for (const scaleKey of ['probability', 'severity']) {
    assert.equal(schema.$defs[scaleKey].minimum, 1);
    assert.equal(schema.$defs[scaleKey].maximum, 4);
  }

  const inconsistentRiskFixture = structuredClone(validFixture);
  inconsistentRiskFixture.riskAssessmentHsl.calculatedRiskValue = 16;
  assert.equal(validate(inconsistentRiskFixture), false, 'schema accepted an inconsistent calculated HSL risk value');
});

test('unit manager rejects fields and templates that do not match the selected legal bases', () => {
  const schema = readJson('utredning-enhetschef.schema-request.json').value;
  const { ajv, validate } = createValidator(schema);
  const hslRisk = {
    assessedWith: 'Anna Andersson',
    probability: 1,
    severity: 1,
    calculatedRiskValue: 1,
  };
  const socialRisk = {
    probability: 1,
    severity: 1,
    calculatedRiskValue: 1,
  };
  const hslOnly = {
    legalBases: ['HSL'],
    investigationTemplate: 'hsl',
    riskAssessmentHsl: hslRisk,
  };
  const socialOnly = {
    legalBases: ['SOL'],
    investigationTemplate: 'sol_lss',
    riskAssessmentSolLss: socialRisk,
  };

  assert.equal(validate(hslOnly), true, ajv.errorsText(validate.errors));
  assert.equal(validate({ ...hslOnly, riskAssessmentSolLss: socialRisk }), false);
  assert.equal(validate({ ...hslOnly, suspectedMisconduct: 'yes' }), false);
  assert.equal(validate({ ...hslOnly, investigationTemplate: 'sol_lss' }), false);

  assert.equal(validate(socialOnly), true, ajv.errorsText(validate.errors));
  assert.equal(validate({ ...socialOnly, riskAssessmentHsl: hslRisk }), false);
  assert.equal(validate({ ...socialOnly, investigationTemplate: 'hsl' }), false);

  for (const investigationTemplate of ['sol_lss', 'hsl', 'sol_lss_hsl']) {
    const combined = {
      legalBases: ['HSL', 'SOL'],
      investigationTemplate,
      riskAssessmentHsl: hslRisk,
      riskAssessmentSolLss: socialRisk,
    };
    assert.equal(validate(combined), true, ajv.errorsText(validate.errors));
  }
});

test('the HSL investigation no longer carries the IVO decision', () => {
  const schema = readJson('utredning-hsl.schema-request.json').value;
  const uiSchema = readJson('utredning-hsl.ui-schema-request.json').value;

  for (const field of ['ivoNotification', 'ivoCaseNumber', 'public360CaseNumber']) {
    assert.equal(field in schema.properties, false, `utredning-hsl still declares ${field}`);
    assert.equal(field in uiSchema, false, `utredning-hsl UI schema still configures ${field}`);
  }
  assert.equal(schema.required, undefined);
  assert.equal(schema.allOf, undefined);
});

// Both decisions share the IVO part: the Ja/Nej answer is required, the IVO case number is always
// optional, and the Public 360 number exists exactly when the errand is reported to IVO - required
// then, refused otherwise, since the field is disabled for a Nej.
for (const artifact of decisionArtifacts) {
  test(`${artifact.name} requires the IVO answer, and Public 360 exactly for a positive one`, () => {
    const schema = readJson(artifact.schemaFile).value;
    const { ajv, validate } = createValidator(schema);
    const base = structuredClone(fixtures[artifact.name].valid);
    delete base.decidedAt;
    delete base.updatedAt;
    delete base.revisions;
    delete base.ivoNotification;
    delete base.ivoCaseNumber;
    delete base.public360CaseNumber;

    assert.ok(schema.required.includes('ivoNotification'));
    assert.equal(schema.required.includes('ivoCaseNumber'), false);
    assert.equal(schema.required.includes('public360CaseNumber'), false);
    assert.equal(schema.required.includes('decidedAt'), false);

    assert.equal(validate({ ...base }), false, 'accepted a decision without an IVO answer');
    assert.equal(validate({ ...base, ivoNotification: 'no' }), true, ajv.errorsText(validate.errors));
    assert.equal(validate({ ...base, ivoNotification: 'no', public360CaseNumber: 'P360-1' }), false);
    assert.equal(validate({ ...base, ivoNotification: 'no', ivoCaseNumber: 'IVO-stale' }), false);
    assert.equal(validate({ ...base, ivoNotification: 'yes' }), false, 'accepted a report to IVO without Public 360');
    assert.equal(validate({ ...base, ivoNotification: 'yes', ivoCaseNumber: 'IVO-1' }), false);
    assert.equal(
      validate({ ...base, ivoNotification: 'yes', public360CaseNumber: 'P360-1' }),
      true,
      ajv.errorsText(validate.errors)
    );
    assert.equal(
      validate({ ...base, ivoNotification: 'yes', ivoCaseNumber: 'IVO-1', public360CaseNumber: 'P360-1' }),
      true,
      ajv.errorsText(validate.errors)
    );
    assert.equal(validate({ ...base, ivoNotification: 'no', decidedAt: '2026-09-11T12:30:00.000Z' }), true);
    assert.equal(validate({ ...base, ivoNotification: 'no', decidedAt: '2026-09-11' }), false);
  });

  // When a decision was made, when it last changed and by whom are the server's to record: the
  // schema marks the properties for the BFF to stamp, and the form never offers them as inputs.
  test(`${artifact.name} leaves the decision timestamps and revisions to the server`, () => {
    const schema = readJson(artifact.schemaFile).value;
    const uiSchema = readJson(artifact.uiSchemaFile).value;
    const { ajv, validate } = createValidator(schema);

    assert.equal(schema.properties.decidedAt['x-draken-server-timestamp'], 'created');
    assert.equal(schema.properties.updatedAt['x-draken-server-timestamp'], 'updated');
    assert.equal(schema.properties.revisions['x-draken-server-revisions'], true);
    for (const name of ['decidedAt', 'updatedAt']) {
      assert.equal(schema.properties[name].type, 'string');
      assert.equal(schema.properties[name].format, 'date-time');
      assert.equal(schema.properties[name].readOnly, true);
      assert.equal(uiSchema[name]['ui:widget'], 'hidden');
    }
    assert.equal(schema.properties.revisions.readOnly, true);
    assert.deepEqual(schema.properties.revisions.items.required, ['savedAt', 'savedBy']);
    assert.equal(schema.properties.revisions.items.additionalProperties, false);
    assert.equal(uiSchema.revisions['ui:widget'], 'hidden');

    const base = { ...fixtures[artifact.name].valid, revisions: [] };
    assert.equal(validate(base), true, ajv.errorsText(validate.errors));
    assert.equal(validate({ ...base, revisions: [{ savedAt: 'igår', savedBy: 'x' }] }), false);
    assert.equal(validate({ ...base, revisions: [{ savedAt: '2026-09-11T12:30:00.000Z', savedBy: '' }] }), false);
    assert.equal(
      validate({ ...base, revisions: [{ savedAt: '2026-09-11T12:30:00.000Z', savedBy: 'x', extra: 1 }] }),
      false
    );
  });
}

test('the lex Sarah decision classifies the report with the same degrees the investigator proposes', () => {
  const schema = readJson('beslut-sol-lss.schema-request.json').value;
  const proposalSchema = readJson('utredning-sol-lss.schema-request.json').value;
  const { ajv, validate } = createValidator(schema);

  assert.deepEqual(schema.required, ['decidedMisconductDegree', 'decisionMotivation', 'ivoNotification']);
  assert.deepEqual(
    schema.properties.decidedMisconductDegree.oneOf,
    proposalSchema.properties.proposedMisconductDegree.oneOf
  );
  assert.equal(schema.properties.decisionMotivation.contentMediaType, 'text/html');

  assert.equal(
    validate({ decidedMisconductDegree: 'no_misconduct', decisionMotivation: '<p>Nej.</p>', ivoNotification: 'no' }),
    true,
    ajv.errorsText(validate.errors)
  );
  assert.equal(validate({ decisionMotivation: '<p>Nej.</p>', ivoNotification: 'no' }), false);
  assert.equal(validate({ decidedMisconductDegree: 'no_misconduct', ivoNotification: 'no' }), false);
  assert.equal(
    validate({ decidedMisconductDegree: 'no_misconduct', decisionMotivation: '', ivoNotification: 'no' }),
    false
  );
  assert.equal(
    validate({ decidedMisconductDegree: 'other', decisionMotivation: '<p>-</p>', ivoNotification: 'no' }),
    false
  );
});

test('the HSL decision is the IVO decision alone', () => {
  const schema = readJson('beslut-hsl.schema-request.json').value;

  assert.deepEqual(schema.required, ['ivoNotification']);
  assert.deepEqual(Object.keys(schema.properties), [
    'decidedAt',
    'updatedAt',
    'revisions',
    'ivoNotification',
    'ivoCaseNumber',
    'public360CaseNumber',
  ]);
});

test('all sketch multiselects are represented as unique arrays', () => {
  const expectedMultiselects: Record<string, string[]> = {
    'utredning-enhetschef': ['legalBases', 'causeAreas'],
    'utredning-sol-lss': ['eventTypes', 'causeAreas', 'primaryUnderlyingCauses'],
    'utredning-hsl': ['identifiedCauses', 'underlyingCauses'],
    'beslut-hsl': [],
    'beslut-sol-lss': [],
  };

  for (const artifact of artifacts) {
    const schema = readJson(artifact.schemaFile).value;
    for (const fieldName of expectedMultiselects[artifact.name]) {
      const fieldSchema = schema.properties[fieldName];
      assert.equal(fieldSchema.type, 'array', `${artifact.name}.${fieldName} must be an array`);
      assert.equal(fieldSchema.uniqueItems, true, `${artifact.name}.${fieldName} must reject duplicates`);
    }
  }
});

test('short multiselects use checkboxes while longer cause lists remain searchable', () => {
  const expectedCheckboxes: Record<string, string[]> = {
    'utredning-enhetschef': ['legalBases', 'causeAreas'],
    'utredning-sol-lss': ['eventTypes', 'causeAreas'],
    'utredning-hsl': ['identifiedCauses'],
  };
  const expectedComboboxes: Partial<Record<string, string[]>> = {
    'utredning-sol-lss': ['primaryUnderlyingCauses'],
    'utredning-hsl': ['underlyingCauses'],
  };

  for (const artifact of artifacts) {
    const uiSchema = readJson(artifact.uiSchemaFile).value;

    for (const fieldName of expectedCheckboxes[artifact.name] ?? []) {
      assert.equal(uiSchema[fieldName]['ui:widget'], 'checkboxes');
    }

    for (const fieldName of expectedComboboxes[artifact.name] ?? []) {
      assert.equal(uiSchema[fieldName]['ui:widget'], 'ComboboxWidget');
    }
  }
});

// A section icon the icon map does not know renders as no icon at all, silently.
test('every section icon the UI schemas name exists in the Draken icon map', () => {
  for (const artifact of artifacts) {
    const uiSchema = readJson(artifact.uiSchemaFile).value;
    for (const section of uiSchema['ui:sections']) {
      assert.equal(typeof section.icon, 'string', `${artifact.name}.${section.id} has no icon`);
      assert.ok(section.icon in iconMap, `${artifact.name}.${section.id} names unknown icon ${section.icon}`);
    }
  }
});

// The decision's classification is the form's main choice and spans the form like every other
// field; the investigation's proposal field, which it copies its choices from, is narrower.
test('the lex Sarah classification select takes the full form width', () => {
  const uiSchema = readJson('beslut-sol-lss.ui-schema-request.json').value;
  assert.equal(uiSchema.decidedMisconductDegree['ui:options'].className, 'w-full');
});
