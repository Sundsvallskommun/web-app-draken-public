import { createSupportManagementLabelFilterProfile } from '@/config/supportmanagement-label-filter-profile';
import {
  SUPPORT_INVESTIGATION_DOCUMENT_APPLICABILITIES,
  SUPPORT_INVESTIGATION_DOCUMENT_PLACEMENTS,
  SupportInvestigationProfileDto,
  SupportManagementLabelFilterProfileDto,
} from '@/dtos/support-investigation-profile.dto';

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

const requireProfileChoice = <T extends string>(value: T | undefined, choices: readonly T[], field: string): T | undefined => {
  if (value === undefined) return undefined;
  if (!choices.includes(value)) {
    throw new Error(`Support investigation profile field ${field} must be one of ${choices.join(', ')}`);
  }
  return value;
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
    const placement = requireProfileChoice(document.placement, SUPPORT_INVESTIGATION_DOCUMENT_PLACEMENTS, `documents[${index}].placement`);
    const appliesTo = requireProfileChoice(document.appliesTo, SUPPORT_INVESTIGATION_DOCUMENT_APPLICABILITIES, `documents[${index}].appliesTo`);
    const prerequisiteDocumentKey =
      document.prerequisiteDocumentKey === undefined
        ? undefined
        : requireProfileIdentifier(document.prerequisiteDocumentKey, `documents[${index}].prerequisiteDocumentKey`);
    // The optional fields are only carried when configured, so a profile that never mentions them
    // serializes exactly as before and their defaults stay a reader's decision.
    const canonicalDocument = {
      key: requireProfileIdentifier(document.key, `documents[${index}].key`),
      schemaName: requireProfileIdentifier(document.schemaName, `documents[${index}].schemaName`),
      tabLabel: requireNonEmptyProfileField(document.tabLabel, `documents[${index}].tabLabel`),
      ownerLabel: requireNonEmptyProfileField(document.ownerLabel, `documents[${index}].ownerLabel`),
      ...(placement ? { placement } : {}),
      ...(appliesTo ? { appliesTo } : {}),
      ...(prerequisiteDocumentKey ? { prerequisiteDocumentKey } : {}),
    };

    if (documentKeys.has(canonicalDocument.key)) {
      throw new Error(`Support investigation profile contains duplicate document key ${canonicalDocument.key}`);
    }
    documentKeys.add(canonicalDocument.key);

    return Object.freeze(canonicalDocument);
  });
  // A prerequisite names another document of the same profile, so the reference is checked once
  // every key is known.
  documents.forEach((document, index) => {
    if (document.prerequisiteDocumentKey === undefined) return;
    if (document.prerequisiteDocumentKey === document.key || !documentKeys.has(document.prerequisiteDocumentKey)) {
      throw new Error(`Support investigation profile field documents[${index}].prerequisiteDocumentKey must name another document in the profile`);
    }
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
      ownerLabel: 'Lex Sarah',
    },
    {
      key: 'utredning-hsl',
      schemaName: 'utredning-hsl',
      tabLabel: 'Utredning HSL',
      ownerLabel: 'MAS/MAR',
    },
    // The decisions. Rendered on the Beslut tab rather than under Utredning, and each offered only
    // on the errands the IAF/VOF classification policy resolves for it: the IVO decision on an
    // ordinary deviation under HSL, the lex Sarah decision on a reported misconduct. The policy
    // resolves one kind per errand, so an errand never gets both. The lex Sarah decision answers
    // the SoL/LSS investigation, so that investigation has to be saved first.
    {
      key: 'beslut-hsl',
      schemaName: 'beslut-hsl',
      tabLabel: 'Beslut HSL',
      ownerLabel: 'MAS/MAR',
      placement: 'decision',
      appliesTo: 'hsl-deviation',
    },
    {
      key: 'beslut-sol-lss',
      schemaName: 'beslut-sol-lss',
      tabLabel: 'Beslut SoL/LSS',
      ownerLabel: 'LEX-ansvarig',
      placement: 'decision',
      appliesTo: 'reported-misconduct',
      prerequisiteDocumentKey: 'utredning-sol-lss',
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
