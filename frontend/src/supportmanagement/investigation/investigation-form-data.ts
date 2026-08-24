import type { RJSFSchema } from '@rjsf/utils';

import type { InvestigationFormData } from './investigation-document';

interface CalculationMetadata {
  formula: 'probability * severity';
  inputs: readonly [string, string];
  result: string;
}

const managerInvestigationTemplates = ['sol_lss', 'hsl', 'sol_lss_hsl'] as const;
type ManagerInvestigationTemplate = (typeof managerInvestigationTemplates)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: string): boolean {
  return Object.hasOwn(value, key);
}

function resolveLocalReference(schema: RJSFSchema | boolean, rootSchema: RJSFSchema): RJSFSchema | boolean {
  if (typeof schema === 'boolean' || typeof schema.$ref !== 'string' || !schema.$ref.startsWith('#/$defs/')) {
    return schema;
  }

  const definitionName = schema.$ref.slice('#/$defs/'.length);
  const definition = rootSchema.$defs?.[definitionName];
  if (!isRecord(definition)) return schema;

  const { $ref: _reference, ...schemaSiblings } = schema;
  return { ...definition, ...schemaSiblings };
}

function pruneArrayToSchema(schema: RJSFSchema, value: unknown[], rootSchema: RJSFSchema): unknown[] {
  const { items } = schema;
  if (Array.isArray(items)) {
    return value.map((item, index) =>
      items[index] === undefined ? item : pruneValueToSchema(items[index], item, rootSchema)
    );
  }
  if (typeof items === 'boolean' || isRecord(items)) {
    return value.map((item) => pruneValueToSchema(items, item, rootSchema));
  }
  return value;
}

function pruneRecordToSchema(
  properties: Record<string, RJSFSchema | boolean>,
  value: Record<string, unknown>,
  rootSchema: RJSFSchema
): Record<string, unknown> {
  const prunedValue: Record<string, unknown> = {};
  for (const [propertyName, propertySchema] of Object.entries(properties)) {
    if (!hasOwn(value, propertyName)) continue;
    const prunedPropertyValue = pruneValueToSchema(propertySchema, value[propertyName], rootSchema);
    if (prunedPropertyValue !== undefined) prunedValue[propertyName] = prunedPropertyValue;
  }
  return prunedValue;
}

function pruneValueToSchema(schema: RJSFSchema | boolean, value: unknown, rootSchema: RJSFSchema): unknown {
  const resolvedSchema = resolveLocalReference(schema, rootSchema);
  if (resolvedSchema === false) return undefined;
  if (resolvedSchema === true) return value;
  if (Array.isArray(value)) return pruneArrayToSchema(resolvedSchema, value, rootSchema);
  if (isRecord(value) && isRecord(resolvedSchema.properties)) {
    return pruneRecordToSchema(resolvedSchema.properties, value, rootSchema);
  }
  return value;
}

function getManagerLegalBaseFlags(formData: InvestigationFormData) {
  const legalBases = new Set(
    Array.isArray(formData.legalBases)
      ? formData.legalBases.filter((value): value is string => typeof value === 'string')
      : []
  );

  return {
    hasHsl: legalBases.has('HSL'),
    hasSolOrLss: legalBases.has('SOL') || legalBases.has('LSS'),
  };
}

function getAllowedManagerTemplates(formData: InvestigationFormData): ManagerInvestigationTemplate[] {
  const { hasHsl, hasSolOrLss } = getManagerLegalBaseFlags(formData);

  if (hasHsl && hasSolOrLss) return [...managerInvestigationTemplates];
  if (hasHsl) return ['hsl'];
  if (hasSolOrLss) return ['sol_lss'];
  return [];
}

function normalizeManagerConditions(formData: InvestigationFormData): InvestigationFormData {
  const normalizedData = { ...formData };
  const { hasHsl, hasSolOrLss } = getManagerLegalBaseFlags(normalizedData);

  if (!hasHsl) delete normalizedData.riskAssessmentHsl;
  if (!hasSolOrLss) {
    delete normalizedData.riskAssessmentSolLss;
    delete normalizedData.suspectedMisconduct;
  }

  const allowedTemplates = getAllowedManagerTemplates(normalizedData);
  const selectedTemplate = normalizedData.investigationTemplate;
  const selectedTemplateIsAllowed =
    typeof selectedTemplate === 'string' && (allowedTemplates as readonly string[]).includes(selectedTemplate);
  if (!selectedTemplateIsAllowed) {
    if (allowedTemplates.length === 1) {
      normalizedData.investigationTemplate = allowedTemplates[0];
    } else {
      delete normalizedData.investigationTemplate;
    }
  }

  return normalizedData;
}

function normalizeHslConditions(formData: InvestigationFormData): InvestigationFormData {
  if (formData.ivoNotification === 'yes') return formData;

  const normalizedData = { ...formData };
  delete normalizedData.ivoCaseNumber;
  return normalizedData;
}

function readCalculationMetadata(value: unknown): CalculationMetadata | undefined {
  if (!isRecord(value)) return undefined;
  if (value.formula !== 'probability * severity' || !Array.isArray(value.inputs) || value.inputs.length !== 2) {
    return undefined;
  }
  if (!value.inputs.every((input) => typeof input === 'string') || typeof value.result !== 'string') return undefined;

  return {
    formula: value.formula,
    inputs: [value.inputs[0], value.inputs[1]],
    result: value.result,
  };
}

function applyDeclaredCalculations(schema: RJSFSchema, formData: InvestigationFormData): InvestigationFormData {
  let normalizedData = formData;

  for (const [propertyName, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (!isRecord(propertySchema)) continue;

    const calculation = readCalculationMetadata(propertySchema['x-calculation']);
    const calculationTarget = normalizedData[propertyName];
    if (!calculation || !isRecord(calculationTarget)) continue;

    const [leftInput, rightInput] = calculation.inputs;
    const leftValue = calculationTarget[leftInput];
    const rightValue = calculationTarget[rightInput];
    const nextTarget = { ...calculationTarget };

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      nextTarget[calculation.result] = leftValue * rightValue;
    } else {
      delete nextTarget[calculation.result];
    }

    if (normalizedData === formData) normalizedData = { ...formData };
    normalizedData[propertyName] = nextTarget;
  }

  return normalizedData;
}

/**
 * Canonical adapter from untrusted browser/RJSF values to one investigation
 * document. Unknown and conditionally inapplicable values are removed before
 * calculations declared by the schema are applied.
 */
export function normalizeInvestigationFormData(
  schemaName: string,
  schema: RJSFSchema,
  formData: InvestigationFormData
): InvestigationFormData {
  const prunedData = pruneValueToSchema(schema, formData, schema);
  const schemaOwnedData = isRecord(prunedData) ? prunedData : {};
  let conditionallyNormalizedData = schemaOwnedData;
  if (schemaName === 'utredning-enhetschef') conditionallyNormalizedData = normalizeManagerConditions(schemaOwnedData);
  if (schemaName === 'utredning-hsl') conditionallyNormalizedData = normalizeHslConditions(schemaOwnedData);

  return applyDeclaredCalculations(schema, conditionallyNormalizedData);
}

/**
 * Narrows presentation choices to those that the canonical manager schema
 * accepts for the selected legal bases. The source schema remains untouched.
 */
export function getInvestigationRenderingSchema(
  schemaName: string,
  schema: RJSFSchema,
  formData: InvestigationFormData
): RJSFSchema {
  if (schemaName !== 'utredning-enhetschef') return schema;

  const properties = { ...schema.properties };
  const { hasHsl, hasSolOrLss } = getManagerLegalBaseFlags(formData);
  if (!hasHsl) delete properties.riskAssessmentHsl;
  if (!hasSolOrLss) {
    delete properties.riskAssessmentSolLss;
    delete properties.suspectedMisconduct;
  }

  const templateSchema = properties.investigationTemplate;
  if (!isRecord(templateSchema) || !Array.isArray(templateSchema.oneOf)) {
    return { ...schema, properties };
  }

  const allowedTemplates = new Set<unknown>(getAllowedManagerTemplates(formData));
  if (allowedTemplates.size === 0) {
    delete properties.investigationTemplate;

    return {
      ...schema,
      properties,
    };
  }

  const filteredOptions = templateSchema.oneOf.filter(
    (option) => isRecord(option) && allowedTemplates.has(option.const)
  );

  return {
    ...schema,
    properties: {
      ...properties,
      investigationTemplate: {
        ...templateSchema,
        oneOf: filteredOptions,
      },
    },
  };
}

export function getHslRiskValue(formData: InvestigationFormData): number | undefined {
  const riskAssessment = formData.riskAssessmentHsl;
  if (!isRecord(riskAssessment)) return undefined;

  return typeof riskAssessment.calculatedRiskValue === 'number' ? riskAssessment.calculatedRiskValue : undefined;
}
