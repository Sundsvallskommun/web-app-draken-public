import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { IAF_LEGAL_BASE } from '@supportmanagement/investigation/label-classification';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';

import { investigationOwnsSupportErrandClassification } from './investigation-classification-ownership';
import type { InvestigationDocumentKey, InvestigationFormData } from './investigation-document';
import { normalizeInvestigationFormData } from './investigation-form-data';

export const INVESTIGATION_CLASSIFICATION_EXTERNAL_FIELD = 'errandClassification';
export const INVESTIGATION_CLASSIFICATION_SLOT = `$external:${INVESTIGATION_CLASSIFICATION_EXTERNAL_FIELD}`;

const classificationDocumentKeys = ['utredning-enhetschef', 'utredning-sol-lss'] as const;
const socialLegalBases = [IAF_LEGAL_BASE.SOL, IAF_LEGAL_BASE.LSS] as const;
const supportedLegalBases = new Set<string>([IAF_LEGAL_BASE.HSL, ...socialLegalBases]);

interface InvestigationExternalFieldDefinition {
  kind?: unknown;
  legalBasesPointer?: unknown;
  required?: unknown;
}

interface InvestigationSchemaExtensions extends RJSFSchema {
  'x-draken-external-fields'?: Record<string, InvestigationExternalFieldDefinition>;
}

const isClassificationDocumentKey = (
  key: InvestigationDocumentKey
): key is (typeof classificationDocumentKeys)[number] =>
  classificationDocumentKeys.some((candidate) => candidate === key);

const hasClassificationDeclaration = (schema: RJSFSchema): boolean => {
  const definition = (schema as InvestigationSchemaExtensions)['x-draken-external-fields']?.[
    INVESTIGATION_CLASSIFICATION_EXTERNAL_FIELD
  ];
  return (
    definition?.kind === 'supportManagementLabelClassification' &&
    definition.legalBasesPointer === '/legalBases' &&
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
  if (!isClassificationDocumentKey(key)) return undefined;
  if (hasClassificationDeclaration(schema)) return 'declared';
  return isLegacyClassificationSchema(schema) ? 'legacy-fallback' : 'missing-declaration';
};

export const getInvestigationLegalBases = (formData: InvestigationFormData): string[] =>
  Array.isArray(formData.legalBases)
    ? formData.legalBases.filter(
        (legalBase): legalBase is string => typeof legalBase === 'string' && supportedLegalBases.has(legalBase)
      )
    : [];

const hasReportedMisconductParameter = (errand: SupportErrand | undefined): boolean =>
  errand?.parameters?.some(
    (parameter) => parameter.key === 'eventType' && parameter.values?.some((value) => value === 'MISSFORHALLANDE')
  ) ?? false;

const hasReportedMisconductLabel = (errand: SupportErrand | undefined): boolean =>
  errand?.labels?.some((label) => {
    const resourceName = label.resourceName?.toUpperCase();
    const resourcePath = label.resourcePath?.toUpperCase();
    const reportType = resourcePath?.split('/').at(-1) ?? resourceName;
    return reportType === 'ABUSE' || reportType === 'ADVERSE_INCIDENT';
  }) ?? false;

export const isReportedMisconductErrand = (errand: SupportErrand | undefined): boolean =>
  hasReportedMisconductParameter(errand) || hasReportedMisconductLabel(errand);

export const getInvestigationClassificationOwner = (
  errand: SupportErrand | undefined
): (typeof classificationDocumentKeys)[number] =>
  isReportedMisconductErrand(errand) ? 'utredning-sol-lss' : 'utredning-enhetschef';

export const isInvestigationClassificationOwner = (
  key: InvestigationDocumentKey,
  errand: SupportErrand | undefined
): boolean => investigationOwnsSupportErrandClassification() && getInvestigationClassificationOwner(errand) === key;

export const normalizeContextualInvestigationFormData = (
  key: InvestigationDocumentKey,
  schema: RJSFSchema,
  formData: InvestigationFormData,
  reportedMisconduct: boolean
): InvestigationFormData => {
  const normalized = normalizeInvestigationFormData(key, schema, formData);
  const schemaHasLegalBases = Boolean(
    schema.properties && typeof schema.properties === 'object' && 'legalBases' in schema.properties
  );
  const forceSocialLegalBases =
    schemaHasLegalBases && (key === 'utredning-sol-lss' || (reportedMisconduct && key === 'utredning-enhetschef'));

  return forceSocialLegalBases
    ? normalizeInvestigationFormData(key, schema, { ...normalized, legalBases: [...socialLegalBases] })
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
  const legalBasesUi = (uiSchema.legalBases ?? {}) as UiSchema;
  const contextualUiSchema: UiSchema =
    reportedMisconduct && key === 'utredning-enhetschef'
      ? { ...uiSchema, legalBases: { ...legalBasesUi, 'ui:readonly': true } }
      : uiSchema;

  if (!isClassificationDocumentKey(key)) return contextualUiSchema;

  const targetSectionId = key === 'utredning-enhetschef' ? 'categorization-and-documentation' : 'categorization';
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
          ? insertAfter(fieldsWithoutClassification, 'legalBases', INVESTIGATION_CLASSIFICATION_SLOT)
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
