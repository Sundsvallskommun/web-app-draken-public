import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    version: '1.0',
    hasErrandClassification: false,
    schemaFile: 'utredning-hsl.schema-request.json',
    uiSchemaFile: 'utredning-hsl.ui-schema-request.json',
  },
];

// The artifacts are arbitrary JSON documents that the assertions walk structurally,
// so the traversal helpers below are deliberately untyped.
function readJson(relativePath: string) {
  return JSON.parse(readFileSync(join(currentDirectory, relativePath), 'utf8'));
}

function createValidator(schema: any) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  ajv.addFormat('date', /^\d{4}-\d{2}-\d{2}$/u);
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
      { id: 'notification-and-documentation', title: 'Anmälan och dokumentation' },
      { id: 'commissioner-comment', title: 'Uppdragsgivarens kommentar' },
    ],
  };

  for (const artifact of artifacts) {
    const uiSchema = readJson(artifact.uiSchemaFile).value;
    assert.deepEqual(
      uiSchema['ui:sections'].map(({ id, title }: { id: string; title: string }) => ({ id, title })),
      expectedSections[artifact.name]
    );
  }

  const hslUiSchema = readJson('utredning-hsl.ui-schema-request.json').value;
  assert.ok(
    hslUiSchema['ui:order'].indexOf('public360CaseNumber') < hslUiSchema['ui:order'].indexOf('ivoNotification')
  );
  assert.ok(hslUiSchema['ui:order'].indexOf('ivoNotification') < hslUiSchema['ui:order'].indexOf('ivoCaseNumber'));
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

test('HSL requires Public 360 always and IVO case number only for a positive IVO decision', () => {
  const schema = readJson('utredning-hsl.schema-request.json').value;
  const { ajv, validate } = createValidator(schema);

  assert.ok(schema.required.includes('public360CaseNumber'));
  assert.ok(schema.required.includes('ivoNotification'));

  assert.equal(
    validate({ ivoNotification: 'no', public360CaseNumber: 'P360-1' }),
    true,
    ajv.errorsText(validate.errors)
  );
  assert.equal(validate({ ivoNotification: 'no', ivoCaseNumber: 'IVO-stale', public360CaseNumber: 'P360-1' }), false);
  assert.equal(validate({ ivoNotification: 'yes', public360CaseNumber: 'P360-1' }), false);
  assert.equal(
    validate({ ivoNotification: 'yes', ivoCaseNumber: 'IVO-1', public360CaseNumber: 'P360-1' }),
    true,
    ajv.errorsText(validate.errors)
  );
});

test('all sketch multiselects are represented as unique arrays', () => {
  const expectedMultiselects: Record<string, string[]> = {
    'utredning-enhetschef': ['legalBases', 'causeAreas'],
    'utredning-sol-lss': ['eventTypes', 'causeAreas', 'primaryUnderlyingCauses'],
    'utredning-hsl': ['identifiedCauses', 'underlyingCauses'],
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
