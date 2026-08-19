import { createIafVofInvestigationClassificationPolicy } from '@/config/iaf-vof-investigation-classification';
import { createSupportManagementLabelFilterProfile } from '@/config/supportmanagement-label-filter-profile';
import { SupportInvestigationProfileDto, SupportManagementLabelFilterProfileDto } from '@/dtos/support-investigation-profile.dto';
import type {
  ReportedMisconductInvestigationClassificationPolicy,
  SupportInvestigationClassificationLegalBaseRule,
  SupportInvestigationClassificationPolicy,
} from '@/services/support-investigation-classification-owner';

import { SUPPORT_MANAGEMENT_API_TARGETS, SupportManagementApiTarget } from './api-config';

export interface SupportInvestigationProfile extends SupportInvestigationProfileDto {
  readonly requiredSupportManagementApiTarget?: SupportManagementApiTarget;
  readonly classificationPolicy?: SupportInvestigationClassificationPolicy;
  readonly labelFilter?: SupportManagementLabelFilterProfileDto;
}

export type SupportInvestigationProfileInput = SupportInvestigationProfileDto &
  Readonly<{
    requiredSupportManagementApiTarget?: SupportManagementApiTarget;
    classificationPolicy?: SupportInvestigationClassificationPolicy;
    labelFilter?: SupportManagementLabelFilterProfileDto;
  }>;

const requireNonEmptyProfileField = (value: string, field: string): string => {
  const canonical = value.trim();
  if (canonical.length === 0) {
    throw new Error(`Support investigation profile field ${field} must not be empty`);
  }
  return canonical;
};

// Document keys are used as URL path segments and schema names are embedded in
// JsonSchema identifiers. Keeping both in one conservative, canonical format
// makes profile additions safe without requiring application-specific escaping.
const SUPPORT_INVESTIGATION_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SUPPORT_MANAGEMENT_RESOURCE_PATH_PATTERN = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/u;
const SUPPORT_MANAGEMENT_CLASSIFICATION_PATTERN = /^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*$/u;

const requireProfileIdentifier = (value: string, field: string): string => {
  const canonical = requireNonEmptyProfileField(value, field);
  if (!SUPPORT_INVESTIGATION_IDENTIFIER_PATTERN.test(canonical)) {
    throw new Error(`Support investigation profile field ${field} must be a lowercase kebab-case identifier`);
  }
  return canonical;
};

const requireResourcePath = (value: string, field: string): string => {
  const canonical = requireNonEmptyProfileField(value, field);
  if (!SUPPORT_MANAGEMENT_RESOURCE_PATH_PATTERN.test(canonical)) {
    throw new Error(`Support investigation profile field ${field} must be a safe resourcePath`);
  }
  return canonical;
};

const requireClassification = (value: string, field: string): string => {
  const canonical = requireNonEmptyProfileField(value, field);
  if (!SUPPORT_MANAGEMENT_CLASSIFICATION_PATTERN.test(canonical)) {
    throw new Error(`Support investigation profile field ${field} must be a safe Support Management classification`);
  }
  return canonical;
};

const normalizeClassification = (value: string): string => value.replace(/_/gu, '-').toUpperCase();
const normalizeResourcePath = (value: string): string => value.toUpperCase();

const cloneProfileStrings = (
  values: readonly string[],
  field: string,
  canonicalize: (value: string, field: string) => string = requireNonEmptyProfileField,
  options: Readonly<{ allowEmpty?: boolean }> = {},
): readonly string[] => {
  if (!options.allowEmpty && values.length === 0) {
    throw new Error(`Support investigation profile field ${field} must contain at least one value`);
  }
  const seen = new Set<string>();
  const cloned = values.map((value, index) => {
    const canonical = canonicalize(value, `${field}[${index}]`);
    const identity = canonical.toUpperCase();
    if (seen.has(identity)) throw new Error(`Support investigation profile field ${field} contains duplicate value ${canonical}`);
    seen.add(identity);
    return canonical;
  });
  return Object.freeze(cloned);
};

const cloneLegalBaseRules = (
  rules: readonly SupportInvestigationClassificationLegalBaseRule[],
): readonly SupportInvestigationClassificationLegalBaseRule[] => {
  if (rules.length === 0) {
    throw new Error('Support investigation profile field classificationPolicy.legalBaseRules must contain at least one rule');
  }
  const legalBases = new Set<string>();
  return Object.freeze(
    rules.map((rule, index) => {
      const legalBase = requireNonEmptyProfileField(rule.legalBase, `classificationPolicy.legalBaseRules[${index}].legalBase`);
      const identity = legalBase.toUpperCase();
      if (legalBases.has(identity)) {
        throw new Error(`Support investigation profile classificationPolicy contains duplicate legal-base rule ${legalBase}`);
      }
      legalBases.add(identity);
      return Object.freeze({
        legalBase,
        allowedClassificationCategories: cloneProfileStrings(
          rule.allowedClassificationCategories,
          `classificationPolicy.legalBaseRules[${index}].allowedClassificationCategories`,
          requireResourcePath,
        ),
      });
    }),
  );
};

const cloneReportedMisconductPolicy = (
  policy: ReportedMisconductInvestigationClassificationPolicy,
  documentKeys: ReadonlySet<string>,
): ReportedMisconductInvestigationClassificationPolicy => {
  const defaultOwnerDocumentKey = requireProfileIdentifier(policy.defaultOwnerDocumentKey, 'classificationPolicy.defaultOwnerDocumentKey');
  const reportedMisconductOwnerDocumentKey = requireProfileIdentifier(
    policy.reportedMisconductOwnerDocumentKey,
    'classificationPolicy.reportedMisconductOwnerDocumentKey',
  );

  [defaultOwnerDocumentKey, reportedMisconductOwnerDocumentKey].forEach(ownerDocumentKey => {
    if (!documentKeys.has(ownerDocumentKey)) {
      throw new Error(`Support investigation profile classification owner ${ownerDocumentKey} is not a configured document key`);
    }
  });

  const legalBasesPointer = requireNonEmptyProfileField(policy.legalBasesPointer, 'classificationPolicy.legalBasesPointer');
  const decodedPointerSegments = legalBasesPointer
    .slice(1)
    .split('/')
    .map(segment => segment.replace(/~1/gu, '/').replace(/~0/gu, '~'));
  if (
    !legalBasesPointer.startsWith('/') ||
    /~(?![01])/u.test(legalBasesPointer) ||
    decodedPointerSegments.some(segment => segment.length === 0 || ['__proto__', 'prototype', 'constructor'].includes(segment))
  ) {
    throw new Error('Support investigation profile field classificationPolicy.legalBasesPointer must be a safe absolute JSON pointer');
  }

  const resourcePaths = cloneProfileStrings(
    policy.reportedMisconductSelector.labels.resourcePaths,
    'classificationPolicy.selector.labels.resourcePaths',
    requireResourcePath,
    { allowEmpty: true },
  );
  const resourceNames = cloneProfileStrings(
    policy.reportedMisconductSelector.labels.resourceNames,
    'classificationPolicy.selector.labels.resourceNames',
    requireNonEmptyProfileField,
    { allowEmpty: true },
  );
  if (resourcePaths.length === 0 && resourceNames.length === 0) {
    throw new Error('Support investigation profile field classificationPolicy.selector.labels must contain at least one selector');
  }

  if (!policy.labelTree || !policy.labelTree.root) {
    throw new Error('Support investigation profile field classificationPolicy.labelTree must be configured');
  }
  const labelTree = Object.freeze({
    root: Object.freeze({
      resource: requireResourcePath(policy.labelTree.root.resource, 'classificationPolicy.labelTree.root.resource'),
      classification: requireClassification(policy.labelTree.root.classification, 'classificationPolicy.labelTree.root.classification'),
    }),
    ownerClassification: requireClassification(policy.labelTree.ownerClassification, 'classificationPolicy.labelTree.ownerClassification'),
    categoryClassification: requireClassification(policy.labelTree.categoryClassification, 'classificationPolicy.labelTree.categoryClassification'),
    typeClassification: requireClassification(policy.labelTree.typeClassification, 'classificationPolicy.labelTree.typeClassification'),
  });
  const classificationTokens = [
    labelTree.root.classification,
    labelTree.ownerClassification,
    labelTree.categoryClassification,
    labelTree.typeClassification,
  ].map(normalizeClassification);
  if (new Set(classificationTokens).size !== classificationTokens.length) {
    throw new Error('Support investigation profile field classificationPolicy.labelTree must use distinct classification tokens');
  }

  const legalBaseRules = cloneLegalBaseRules(policy.legalBaseRules);
  const normalizedRootResource = normalizeResourcePath(labelTree.root.resource);
  const outsideConfiguredRoot = legalBaseRules
    .flatMap(rule => rule.allowedClassificationCategories)
    .find(category => {
      const normalizedCategory = normalizeResourcePath(category);
      return normalizedCategory !== normalizedRootResource && !normalizedCategory.startsWith(`${normalizedRootResource}/`);
    });
  if (outsideConfiguredRoot) {
    throw new Error(
      `Support investigation profile classification category ${outsideConfiguredRoot} is outside configured label-tree root ${labelTree.root.resource}`,
    );
  }
  const forcedLegalBases = cloneProfileStrings(policy.forcedLegalBases, 'classificationPolicy.forcedLegalBases');
  const supportedLegalBases = new Set(legalBaseRules.map(rule => rule.legalBase.toUpperCase()));
  const unsupportedForcedLegalBase = forcedLegalBases.find(legalBase => !supportedLegalBases.has(legalBase.toUpperCase()));
  if (unsupportedForcedLegalBase) {
    throw new Error(`Support investigation profile forced legal base ${unsupportedForcedLegalBase} has no legal-base rule`);
  }

  return Object.freeze({
    strategy: 'reported-misconduct',
    defaultOwnerDocumentKey,
    reportedMisconductOwnerDocumentKey,
    reportedMisconductSelector: Object.freeze({
      parameter: Object.freeze({
        key: requireNonEmptyProfileField(policy.reportedMisconductSelector.parameter.key, 'classificationPolicy.selector.parameter.key'),
        values: cloneProfileStrings(policy.reportedMisconductSelector.parameter.values, 'classificationPolicy.selector.parameter.values'),
      }),
      labels: Object.freeze({
        resourcePaths,
        resourceNames,
      }),
    }),
    labelTree,
    forcedLegalBases,
    legalBasesPointer,
    legalBaseRules,
  });
};

const cloneClassificationPolicy = (
  policy: SupportInvestigationClassificationPolicy,
  documentKeys: ReadonlySet<string>,
): SupportInvestigationClassificationPolicy => {
  switch (policy.strategy) {
    case 'reported-misconduct':
      return cloneReportedMisconductPolicy(policy, documentKeys);
  }
};

/**
 * Canonical owner for all static investigation capabilities. Consumers receive
 * one deeply immutable profile and never need to infer capabilities from an
 * application name.
 */
export const createSupportInvestigationProfile = (profile: SupportInvestigationProfileInput): SupportInvestigationProfile => {
  const application = requireNonEmptyProfileField(profile.application, 'application').toUpperCase();
  const requiredSupportManagementApiTarget = profile.requiredSupportManagementApiTarget;
  if (
    requiredSupportManagementApiTarget !== undefined &&
    !(SUPPORT_MANAGEMENT_API_TARGETS as readonly string[]).includes(requiredSupportManagementApiTarget)
  ) {
    throw new Error(`Support investigation profile requires unsupported Support Management API target ${requiredSupportManagementApiTarget}`);
  }
  const documentKeys = new Set<string>();
  const documents = profile.documents.map((document, index) => {
    const canonicalDocument = {
      key: requireProfileIdentifier(document.key, `documents[${index}].key`),
      schemaName: requireProfileIdentifier(document.schemaName, `documents[${index}].schemaName`),
      tabLabel: requireNonEmptyProfileField(document.tabLabel, `documents[${index}].tabLabel`),
      ownerLabel: requireNonEmptyProfileField(document.ownerLabel, `documents[${index}].ownerLabel`),
    };

    if (documentKeys.has(canonicalDocument.key)) {
      throw new Error(`Support investigation profile contains duplicate document key ${canonicalDocument.key}`);
    }
    documentKeys.add(canonicalDocument.key);

    return Object.freeze(canonicalDocument);
  });
  const frozenDocuments = Object.freeze(documents);
  const classificationPolicy = profile.classificationPolicy ? cloneClassificationPolicy(profile.classificationPolicy, documentKeys) : undefined;
  const labelFilter = profile.labelFilter ? createSupportManagementLabelFilterProfile(profile.labelFilter) : undefined;

  return Object.freeze({
    application,
    documents: frozenDocuments,
    ...(requiredSupportManagementApiTarget ? { requiredSupportManagementApiTarget } : {}),
    ...(classificationPolicy ? { classificationPolicy } : {}),
    ...(labelFilter ? { labelFilter } : {}),
  });
};

const iafVofInvestigationProfileBase = {
  requiredSupportManagementApiTarget: 'sprint',
  documents: [
    {
      key: 'utredning-enhetschef',
      schemaName: 'utredning-enhetschef',
      tabLabel: 'Utredning enhetschef',
      ownerLabel: 'Enhetschef',
    },
    {
      key: 'utredning-sol-lss',
      schemaName: 'utredning-sol-lss',
      tabLabel: 'Utredning SoL/LSS',
      ownerLabel: 'LEX-utredare',
    },
    {
      key: 'utredning-hsl',
      schemaName: 'utredning-hsl',
      tabLabel: 'Utredning HSL',
      ownerLabel: 'MAS/MAR',
    },
  ],
  classificationPolicy: createIafVofInvestigationClassificationPolicy({
    defaultOwnerDocumentKey: 'utredning-enhetschef',
    reportedMisconductOwnerDocumentKey: 'utredning-sol-lss',
  }),
  labelFilter: {
    groups: [
      {
        key: 'provision',
        label: 'Lagrum',
        rootResourcePath: 'PROVISION',
        fields: [{ key: 'provision', label: 'Lagrum', classification: 'PROVISION' }],
      },
      {
        key: 'report-type',
        label: 'Rapporttyp',
        rootResourcePath: 'REPORT_TYPE',
        fields: [{ key: 'report-type', label: 'Rapporttyp', classification: 'REPORT_TYPE' }],
      },
      {
        key: 'classification',
        label: 'Klassificering',
        rootResourcePath: 'CATEGORY',
        fields: [
          { key: 'category', label: 'Avvikelsetyp', classification: 'CATEGORY' },
          { key: 'type', label: 'Underkategori', classification: 'TYPE' },
        ],
      },
    ],
  },
} as const satisfies Omit<SupportInvestigationProfileInput, 'application'>;

const createIafVofInvestigationProfile = (application: 'IAF' | 'VOF'): SupportInvestigationProfile =>
  createSupportInvestigationProfile({ application, ...iafVofInvestigationProfileBase });

export const IAF_SUPPORT_INVESTIGATION_PROFILE = createIafVofInvestigationProfile('IAF');
export const VOF_SUPPORT_INVESTIGATION_PROFILE = createIafVofInvestigationProfile('VOF');

const supportInvestigationProfileRegistry: Readonly<Record<string, SupportInvestigationProfile>> = Object.freeze({
  IAF: IAF_SUPPORT_INVESTIGATION_PROFILE,
  VOF: VOF_SUPPORT_INVESTIGATION_PROFILE,
});

const createEmptySupportInvestigationProfile = (application: string): SupportInvestigationProfile =>
  Object.freeze({ application, documents: Object.freeze([]) });

export const getSupportInvestigationProfile = (application: string | undefined): SupportInvestigationProfile => {
  const normalizedApplication = application?.trim().toUpperCase() ?? '';
  const configuredProfile = supportInvestigationProfileRegistry[normalizedApplication];

  if (configuredProfile) return configuredProfile;

  return createEmptySupportInvestigationProfile(normalizedApplication);
};
