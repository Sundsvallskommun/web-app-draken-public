import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';
import type { SupportInvestigationProfileDto } from '@/dtos/support-investigation-profile.dto';

export interface IafVofInvestigationClassificationLegalBaseRule {
  readonly legalBase: string;
  readonly allowedClassificationCategories: readonly string[];
}

export interface IafVofInvestigationClassificationLabelTree {
  readonly root: Readonly<{
    readonly resource: string;
    readonly classification: string;
  }>;
  readonly ownerClassification: string;
  readonly categoryClassification: string;
  readonly typeClassification: string;
}

export interface IafVofInvestigationClassificationPolicy {
  readonly defaultOwnerDocumentKey: string;
  readonly reportedMisconductOwnerDocumentKey: string;
  readonly labelTree: IafVofInvestigationClassificationLabelTree;
  readonly forcedLegalBases: readonly string[];
  readonly legalBasesPointer: string;
  readonly legalBaseRules: readonly IafVofInvestigationClassificationLegalBaseRule[];
}

export type IafVofInvestigationClassificationOwnerSelection = Readonly<{
  mode: 'default' | 'reported-misconduct';
  documentKey: string;
}>;

type ClassificationOwnerErrand = Pick<Errand, 'parameters' | 'labels'>;

const IAF_VOF_APPLICATIONS = new Set(['IAF', 'VOF']);
const DEFAULT_OWNER_SCHEMA_NAME = 'utredning-enhetschef';
const REPORTED_MISCONDUCT_OWNER_SCHEMA_NAME = 'utredning-sol-lss';
const REPORTED_MISCONDUCT_PARAMETER = Object.freeze({ key: 'eventType', values: Object.freeze(['MISSFORHALLANDE']) });
const REPORTED_MISCONDUCT_LABELS = Object.freeze({
  resourcePaths: Object.freeze(['REPORT_TYPE/ABUSE', 'REPORT_TYPE/ADVERSE_INCIDENT']),
  resourceNames: Object.freeze(['ABUSE', 'ADVERSE_INCIDENT']),
});

export const IAF_VOF_INVESTIGATION_CLASSIFICATION_LABEL_TREE: IafVofInvestigationClassificationLabelTree = Object.freeze({
  root: Object.freeze({ resource: 'CATEGORY', classification: 'CATEGORY_ROOT' }),
  ownerClassification: 'PROVISION_CATEGORY',
  categoryClassification: 'CATEGORY',
  typeClassification: 'TYPE',
});

export const IAF_VOF_INVESTIGATION_CLASSIFICATION_LEGAL_BASE_RULES: readonly IafVofInvestigationClassificationLegalBaseRule[] = Object.freeze([
  Object.freeze({ legalBase: 'HSL', allowedClassificationCategories: Object.freeze(['CATEGORY/HSL']) }),
  Object.freeze({ legalBase: 'SOL', allowedClassificationCategories: Object.freeze(['CATEGORY/SOL_LSS']) }),
  Object.freeze({ legalBase: 'LSS', allowedClassificationCategories: Object.freeze(['CATEGORY/SOL_LSS']) }),
]);

export const IAF_VOF_INVESTIGATION_LEGAL_BASES_POINTER = '/legalBases';
export const IAF_VOF_REPORTED_MISCONDUCT_FORCED_LEGAL_BASES = Object.freeze(['SOL', 'LSS']);

const resolveUniqueDocumentKey = (profile: SupportInvestigationProfileDto, schemaName: string): string | undefined => {
  const matches = profile.documents.filter(document => document.schemaName === schemaName);
  return matches.length === 1 ? matches[0].key : undefined;
};

/**
 * Resolves the fixed IAF/VOF business rule to the profile's persistence keys.
 * Other applications deliberately have no investigation classification policy.
 */
export const resolveIafVofInvestigationClassificationPolicy = (
  profile: SupportInvestigationProfileDto,
): IafVofInvestigationClassificationPolicy | undefined => {
  if (!IAF_VOF_APPLICATIONS.has(profile.application.trim().toUpperCase())) return undefined;

  const defaultOwnerDocumentKey = resolveUniqueDocumentKey(profile, DEFAULT_OWNER_SCHEMA_NAME);
  const reportedMisconductOwnerDocumentKey = resolveUniqueDocumentKey(profile, REPORTED_MISCONDUCT_OWNER_SCHEMA_NAME);
  if (!defaultOwnerDocumentKey || !reportedMisconductOwnerDocumentKey) return undefined;

  return Object.freeze({
    defaultOwnerDocumentKey,
    reportedMisconductOwnerDocumentKey,
    labelTree: IAF_VOF_INVESTIGATION_CLASSIFICATION_LABEL_TREE,
    forcedLegalBases: IAF_VOF_REPORTED_MISCONDUCT_FORCED_LEGAL_BASES,
    legalBasesPointer: IAF_VOF_INVESTIGATION_LEGAL_BASES_POINTER,
    legalBaseRules: IAF_VOF_INVESTIGATION_CLASSIFICATION_LEGAL_BASE_RULES,
  });
};

const normalizeCode = (value: string): string => value.trim().toUpperCase();
const normalizeResourcePath = (value: string): string => normalizeCode(value).replace(/^\/+|\/+$/gu, '');
const matchesSelectorParameterKey = (parameterKey: string): boolean => parameterKey.trim() === REPORTED_MISCONDUCT_PARAMETER.key;

const isReportedMisconduct = (errand: ClassificationOwnerErrand): boolean => {
  const selectedValues = new Set(REPORTED_MISCONDUCT_PARAMETER.values.map(normalizeCode));
  const matchesParameter =
    errand.parameters?.some(
      parameter => matchesSelectorParameterKey(parameter.key) && parameter.values?.some(value => selectedValues.has(normalizeCode(value))),
    ) ?? false;
  if (matchesParameter) return true;

  const selectedPaths = new Set(REPORTED_MISCONDUCT_LABELS.resourcePaths.map(normalizeResourcePath));
  const selectedNames = new Set(REPORTED_MISCONDUCT_LABELS.resourceNames.map(normalizeCode));
  return (
    errand.labels?.some(label => {
      const resourcePath = label.resourcePath?.trim();
      if (resourcePath) return selectedPaths.has(normalizeResourcePath(resourcePath));
      return typeof label.resourceName === 'string' && selectedNames.has(normalizeCode(label.resourceName));
    }) ?? false
  );
};

export const resolveIafVofInvestigationClassificationOwner = (
  policy: IafVofInvestigationClassificationPolicy,
  errand: ClassificationOwnerErrand,
): IafVofInvestigationClassificationOwnerSelection => {
  const reportedMisconduct = isReportedMisconduct(errand);
  return {
    mode: reportedMisconduct ? 'reported-misconduct' : 'default',
    documentKey: reportedMisconduct ? policy.reportedMisconductOwnerDocumentKey : policy.defaultOwnerDocumentKey,
  };
};

const selectorParameterSnapshot = (parameters: Errand['parameters']): string =>
  JSON.stringify(
    (parameters ?? [])
      .filter(parameter => matchesSelectorParameterKey(parameter.key))
      .map(parameter => ({ key: parameter.key, values: parameter.values ?? [] })),
  );

/** Prevents generic parameter writes from moving IAF/VOF classification to another owner document. */
export const preservesIafVofInvestigationClassificationOwnerParameter = (
  currentParameters: Errand['parameters'],
  requestedParameters: Errand['parameters'],
): boolean => selectorParameterSnapshot(currentParameters) === selectorParameterSnapshot(requestedParameters);
