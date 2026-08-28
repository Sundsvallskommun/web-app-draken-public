import { createSupportManagementLabelFilterProfile } from '@/config/supportmanagement-label-filter-profile';
import { SupportInvestigationProfileDto, SupportManagementLabelFilterProfileDto } from '@/dtos/support-investigation-profile.dto';

import { SUPPORT_MANAGEMENT_API_TARGETS, SupportManagementApiTarget } from './api-config';

export interface SupportInvestigationProfile extends SupportInvestigationProfileDto {
  readonly requiredSupportManagementApiTarget?: SupportManagementApiTarget;
  readonly labelFilter?: SupportManagementLabelFilterProfileDto;
}

export type SupportInvestigationProfileInput = SupportInvestigationProfileDto &
  Readonly<{
    requiredSupportManagementApiTarget?: SupportManagementApiTarget;
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

const requireProfileIdentifier = (value: string, field: string): string => {
  const canonical = requireNonEmptyProfileField(value, field);
  if (!SUPPORT_INVESTIGATION_IDENTIFIER_PATTERN.test(canonical)) {
    throw new Error(`Support investigation profile field ${field} must be a lowercase kebab-case identifier`);
  }
  return canonical;
};

/**
 * Canonical owner for static investigation documents and transport requirements.
 * Application-specific classification behavior deliberately lives outside this
 * generic profile.
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
  const labelFilter = profile.labelFilter ? createSupportManagementLabelFilterProfile(profile.labelFilter) : undefined;

  return Object.freeze({
    application,
    documents: frozenDocuments,
    ...(requiredSupportManagementApiTarget ? { requiredSupportManagementApiTarget } : {}),
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
