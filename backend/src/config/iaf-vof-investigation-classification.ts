import type {
  ReportedMisconductInvestigationClassificationPolicy,
  SupportInvestigationClassificationLegalBaseRule,
} from '@/services/support-investigation-classification-owner';

interface IafVofInvestigationClassificationOwners {
  readonly defaultOwnerDocumentKey: string;
  readonly reportedMisconductOwnerDocumentKey: string;
}

const LEGAL_BASES_POINTER = '/legalBases';

const createLegalBaseRules = (): readonly SupportInvestigationClassificationLegalBaseRule[] =>
  Object.freeze([
    Object.freeze({ legalBase: 'HSL', allowedClassificationCategories: Object.freeze(['CATEGORY/HSL']) }),
    Object.freeze({ legalBase: 'SOL', allowedClassificationCategories: Object.freeze(['CATEGORY/SOL_LSS']) }),
    Object.freeze({ legalBase: 'LSS', allowedClassificationCategories: Object.freeze(['CATEGORY/SOL_LSS']) }),
  ]);

/**
 * Builds the IAF/VOF classification capability from concrete profile keys.
 * Application selection and schema-role mapping belong to the canonical
 * investigation profile; the generic classification engine consumes only the
 * returned declarative policy.
 */
export const createIafVofInvestigationClassificationPolicy = (
  owners: IafVofInvestigationClassificationOwners,
): ReportedMisconductInvestigationClassificationPolicy =>
  Object.freeze({
    strategy: 'reported-misconduct',
    defaultOwnerDocumentKey: owners.defaultOwnerDocumentKey,
    reportedMisconductOwnerDocumentKey: owners.reportedMisconductOwnerDocumentKey,
    reportedMisconductSelector: Object.freeze({
      parameter: Object.freeze({ key: 'eventType', values: Object.freeze(['MISSFORHALLANDE']) }),
      labels: Object.freeze({
        resourcePaths: Object.freeze(['REPORT_TYPE/ABUSE', 'REPORT_TYPE/ADVERSE_INCIDENT']),
        resourceNames: Object.freeze(['ABUSE', 'ADVERSE_INCIDENT']),
      }),
    }),
    labelTree: Object.freeze({
      root: Object.freeze({ resource: 'CATEGORY', classification: 'CATEGORY_ROOT' }),
      ownerClassification: 'PROVISION_CATEGORY',
      categoryClassification: 'CATEGORY',
      typeClassification: 'TYPE',
    }),
    forcedLegalBases: Object.freeze(['SOL', 'LSS']),
    legalBasesPointer: LEGAL_BASES_POINTER,
    legalBaseRules: createLegalBaseRules(),
  });
