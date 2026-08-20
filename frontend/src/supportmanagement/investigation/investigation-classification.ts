import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';

import {
  type IafVofInvestigationClassificationLegalBaseRule,
  isIafVofReportedMisconductErrand,
  resolveIafVofInvestigationClassificationOwnerDocumentKey,
  type SupportErrandClassificationPlacement,
} from './iaf-vof-investigation-classification-policy';
import { getSupportErrandClassificationPlacement } from './investigation-classification-ownership';
import type { InvestigationDocumentKey, InvestigationFormData } from './investigation-document';
import { normalizeInvestigationFormData } from './investigation-form-data';

export const INVESTIGATION_CLASSIFICATION_EXTERNAL_FIELD = 'errandClassification';
export const INVESTIGATION_CLASSIFICATION_SLOT = `$external:${INVESTIGATION_CLASSIFICATION_EXTERNAL_FIELD}`;

interface InvestigationExternalFieldDefinition {
  kind?: unknown;
  legalBasesPointer?: unknown;
  required?: unknown;
}

interface InvestigationSchemaExtensions extends RJSFSchema {
  'x-draken-external-fields'?: Record<string, InvestigationExternalFieldDefinition>;
}

const isClassificationDocumentKey = (
  key: InvestigationDocumentKey,
  policy: Extract<SupportErrandClassificationPlacement, { owner: 'investigation' }>['policy']
): boolean => {
  return policy.defaultOwnerDocumentKey === key || policy.reportedMisconductOwnerDocumentKey === key;
};

const hasClassificationDeclaration = (
  schema: RJSFSchema,
  policy: Extract<SupportErrandClassificationPlacement, { owner: 'investigation' }>['policy']
): boolean => {
  const definition = (schema as InvestigationSchemaExtensions)['x-draken-external-fields']?.[
    INVESTIGATION_CLASSIFICATION_EXTERNAL_FIELD
  ];
  return (
    definition?.kind === 'supportManagementLabelClassification' &&
    definition.legalBasesPointer === policy.legalBasesPointer &&
    definition.required === true
  );
};

export type InvestigationClassificationSchemaContract = 'declared' | 'legacy-fallback' | 'missing-declaration';

const isLegacyClassificationSchema = (schema: RJSFSchema): boolean => {
  if (typeof schema.$id !== 'string') return true;
  const version = schema.$id.match(/(?:\/|_)(\d+)\.(\d+)$/u);
  if (!version) return false;
  const major = Number(version[1]);
  const minor = Number(version[2]);
  return major < 1 || (major === 1 && minor === 0);
};

export const getInvestigationClassificationSchemaContract = (
  key: InvestigationDocumentKey,
  schema: RJSFSchema
): InvestigationClassificationSchemaContract | undefined => {
  const placement = getSupportErrandClassificationPlacement();
  if (placement.owner !== 'investigation' || !isClassificationDocumentKey(key, placement.policy)) return undefined;
  if (hasClassificationDeclaration(schema, placement.policy)) return 'declared';
  return isLegacyClassificationSchema(schema) ? 'legacy-fallback' : 'missing-declaration';
};

const jsonPointerSegments = (pointer: string): string[] =>
  pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));

const readJsonPointer = (value: unknown, pointer: string): unknown =>
  jsonPointerSegments(pointer).reduce<unknown>(
    (current, segment) =>
      typeof current === 'object' && current !== null && !Array.isArray(current)
        ? (current as Record<string, unknown>)[segment]
        : undefined,
    value
  );

export const getInvestigationLegalBases = (formData: InvestigationFormData): string[] => {
  const policy = getSupportErrandClassificationPlacement().policy;
  if (!policy) return [];

  const legalBases = readJsonPointer(formData, policy.legalBasesPointer);
  if (!Array.isArray(legalBases)) return [];

  const rulesByLegalBase = new Map(
    policy.legalBaseRules.map((rule) => [rule.legalBase.trim().toUpperCase(), rule.legalBase])
  );
  return [
    ...new Set(
      legalBases.flatMap((legalBase) => {
        if (typeof legalBase !== 'string') return [];
        const configuredLegalBase = rulesByLegalBase.get(legalBase.trim().toUpperCase());
        return configuredLegalBase ? [configuredLegalBase] : [];
      })
    ),
  ];
};

export const getInvestigationLegalBaseRules = (): readonly IafVofInvestigationClassificationLegalBaseRule[] =>
  getSupportErrandClassificationPlacement().policy?.legalBaseRules ?? [];

export const isReportedMisconductErrand = (errand: SupportErrand | undefined): boolean => {
  const placement = getSupportErrandClassificationPlacement();
  return placement.categorization === 'iaf-vof' ? isIafVofReportedMisconductErrand(errand) : false;
};

export const getInvestigationClassificationOwner = (
  errand: SupportErrand | undefined
): InvestigationDocumentKey | undefined => {
  const placement = getSupportErrandClassificationPlacement();
  if (placement.owner !== 'investigation') return undefined;
  return resolveIafVofInvestigationClassificationOwnerDocumentKey(placement, errand ?? {});
};

export const isInvestigationClassificationOwner = (
  key: InvestigationDocumentKey,
  errand: SupportErrand | undefined
): boolean => getInvestigationClassificationOwner(errand) === key;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const schemaContainsDataPointer = (schema: RJSFSchema, pointer: string): boolean => {
  let current: RJSFSchema | boolean = schema;
  for (const segment of jsonPointerSegments(pointer)) {
    if (typeof current === 'boolean' || !isRecord(current.properties)) return false;
    const nextSchema: RJSFSchema | boolean | undefined = current.properties[segment];
    if (nextSchema === undefined) return false;
    current = nextSchema;
  }
  return true;
};

const setJsonPointer = (value: InvestigationFormData, pointer: string, nextValue: unknown): InvestigationFormData => {
  const setAtPath = (current: unknown, segments: readonly string[]): unknown => {
    const [segment, ...remaining] = segments;
    if (!segment) return nextValue;
    const currentRecord = isRecord(current) ? current : {};
    return {
      ...currentRecord,
      [segment]: remaining.length === 0 ? nextValue : setAtPath(currentRecord[segment], remaining),
    };
  };

  return setAtPath(value, jsonPointerSegments(pointer)) as InvestigationFormData;
};

export const normalizeContextualInvestigationFormData = (
  documentKey: InvestigationDocumentKey,
  schemaName: string,
  schema: RJSFSchema,
  formData: InvestigationFormData,
  reportedMisconduct: boolean
): InvestigationFormData => {
  const normalized = normalizeInvestigationFormData(schemaName, schema, formData);
  const placement = getSupportErrandClassificationPlacement();
  if (placement.owner !== 'investigation') return normalized;

  const { policy } = placement;
  const schemaHasLegalBases = schemaContainsDataPointer(schema, policy.legalBasesPointer);
  const isDistinctReportedMisconductDocument =
    documentKey === policy.reportedMisconductOwnerDocumentKey &&
    policy.reportedMisconductOwnerDocumentKey !== policy.defaultOwnerDocumentKey;
  const forceSocialLegalBases =
    schemaHasLegalBases &&
    (isDistinctReportedMisconductDocument || (reportedMisconduct && documentKey === policy.defaultOwnerDocumentKey));

  return forceSocialLegalBases
    ? normalizeInvestigationFormData(
        schemaName,
        schema,
        setJsonPointer(normalized, policy.legalBasesPointer, [...policy.forcedLegalBases])
      )
    : normalized;
};

const insertAfter = (values: readonly string[], after: string, value: string): string[] => {
  if (values.includes(value)) return [...values];
  const afterIndex = values.indexOf(after);
  if (afterIndex < 0) return [value, ...values];
  return [...values.slice(0, afterIndex + 1), value, ...values.slice(afterIndex + 1)];
};

export const getInvestigationClassificationUiSchema = (
  key: InvestigationDocumentKey,
  schema: RJSFSchema,
  uiSchema: UiSchema,
  reportedMisconduct: boolean
): UiSchema => {
  const placement = getSupportErrandClassificationPlacement();
  if (placement.owner !== 'investigation') return uiSchema;

  const { policy } = placement;
  const legalBasesSegments = jsonPointerSegments(policy.legalBasesPointer);
  const legalBasesField = legalBasesSegments.at(-1) ?? '';
  const setUiSchemaReadonly = (current: UiSchema, segments: readonly string[]): UiSchema => {
    const [segment, ...remaining] = segments;
    if (!segment) return current;
    const child = (current[segment] ?? {}) as UiSchema;
    return {
      ...current,
      [segment]: remaining.length === 0 ? { ...child, 'ui:readonly': true } : setUiSchemaReadonly(child, remaining),
    };
  };
  const contextualUiSchema: UiSchema =
    reportedMisconduct && key === policy.defaultOwnerDocumentKey
      ? setUiSchemaReadonly(uiSchema, legalBasesSegments)
      : uiSchema;

  if (!isClassificationDocumentKey(key, policy)) return contextualUiSchema;

  const targetSectionId =
    key === policy.defaultOwnerDocumentKey ? 'categorization-and-documentation' : 'categorization';
  const sections = Array.isArray(contextualUiSchema['ui:sections'])
    ? (contextualUiSchema['ui:sections'] as Array<Record<string, unknown>>)
    : [];

  const placedSections = sections.map((section) => {
    if (!Array.isArray(section.fields)) return section;
    const fieldsWithoutClassification = section.fields.filter(
      (field): field is string => typeof field === 'string' && field !== INVESTIGATION_CLASSIFICATION_SLOT
    );
    return {
      ...section,
      fields:
        section.id === targetSectionId
          ? insertAfter(fieldsWithoutClassification, legalBasesField, INVESTIGATION_CLASSIFICATION_SLOT)
          : fieldsWithoutClassification,
    };
  });
  const hasTargetSection = placedSections.some((section) => section.id === targetSectionId);

  return {
    ...contextualUiSchema,
    'ui:sections': hasTargetSection
      ? placedSections
      : [
          {
            id: targetSectionId,
            title: 'Kategorisering',
            icon: 'menu',
            defaultOpen: true,
            fields: [INVESTIGATION_CLASSIFICATION_SLOT],
          },
          ...placedSections,
        ],
  };
};
