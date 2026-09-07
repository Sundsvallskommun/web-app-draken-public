import { createSupportManagementLabelFilterProfile } from '@/config/supportmanagement-label-filter-profile';
import { SupportApplicationProfileDto, SupportManagementLabelFilterProfileDto } from '@/dtos/support-application-profile.dto';

import { SUPPORT_MANAGEMENT_API_TARGETS, SupportManagementApiTarget } from './api-config';
import type { SupportInvestigationClassificationPolicy } from './support-investigation-classification';

export type LabelSpec = Readonly<{ category: string; type: string; subType?: string }>;

interface NewErrandDefaults {
  readonly classification?: Readonly<{ category: string; type: string }>;
  readonly labels?: LabelSpec;
  readonly parameters?: readonly Readonly<{ key: string; displayName?: string; values?: readonly string[] }>[];
}

/** An application explicitly enables registration with its taxonomy, or explicitly disables it. */
type SupportRegistrationPolicy = Readonly<{ mode: 'enabled'; defaults: NewErrandDefaults }> | Readonly<{ mode: 'disabled' }>;

export interface SupportApplicationProfile extends SupportApplicationProfileDto {
  readonly registration: SupportRegistrationPolicy;
  /** Server-only business policy. The runtime DTO never serializes this contract. */
  readonly classificationPolicy?: SupportInvestigationClassificationPolicy;
  readonly requiredSupportManagementApiTarget?: SupportManagementApiTarget;
  readonly labelFilter?: SupportManagementLabelFilterProfileDto;
}

export type SupportApplicationProfileInput = SupportApplicationProfileDto &
  Readonly<{
    registration: SupportRegistrationPolicy;
    requiredSupportManagementApiTarget?: SupportManagementApiTarget;
    labelFilter?: SupportManagementLabelFilterProfileDto;
  }>;

const requireNonEmptyProfileField = (value: string, field: string): string => {
  const canonical = value.trim();
  if (canonical.length === 0) {
    throw new Error(`Support application profile field ${field} must not be empty`);
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
    throw new Error(`Support application profile field ${field} must be a lowercase kebab-case identifier`);
  }
  return canonical;
};

const createSupportRegistrationPolicy = (policy: SupportRegistrationPolicy): SupportRegistrationPolicy => {
  if (!policy || !['enabled', 'disabled'].includes(policy.mode)) {
    throw new Error('Support application profile must explicitly enable or disable registration');
  }
  if (policy.mode === 'disabled') return Object.freeze({ mode: 'disabled' });
  const defaults = policy.defaults;
  if (!defaults) throw new Error('Enabled support registration requires explicit defaults');
  return Object.freeze({
    mode: 'enabled',
    defaults: Object.freeze({
      ...(defaults.classification ? { classification: Object.freeze({ ...defaults.classification }) } : {}),
      ...(defaults.labels ? { labels: Object.freeze({ ...defaults.labels }) } : {}),
      ...(defaults.parameters
        ? {
            parameters: Object.freeze(
              defaults.parameters.map(parameter =>
                Object.freeze({
                  key: parameter.key,
                  ...(parameter.displayName === undefined ? {} : { displayName: parameter.displayName }),
                  ...(parameter.values ? { values: Object.freeze([...parameter.values]) } : {}),
                }),
              ),
            ),
          }
        : {}),
    }),
  });
};

/**
 * Canonical owner for application documents, registration, label filters and transport requirements.
 * The optional server-only classification contract is attached by the business module,
 * after the shared application profile has been validated.
 */
export const createSupportApplicationProfile = (profile: SupportApplicationProfileInput): SupportApplicationProfile => {
  const application = requireNonEmptyProfileField(profile.application, 'application').toUpperCase();
  const requiredSupportManagementApiTarget = profile.requiredSupportManagementApiTarget;
  if (
    requiredSupportManagementApiTarget !== undefined &&
    !(SUPPORT_MANAGEMENT_API_TARGETS as readonly string[]).includes(requiredSupportManagementApiTarget)
  ) {
    throw new Error(`Support application profile requires unsupported Support Management API target ${requiredSupportManagementApiTarget}`);
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
      throw new Error(`Support application profile contains duplicate document key ${canonicalDocument.key}`);
    }
    documentKeys.add(canonicalDocument.key);

    return Object.freeze(canonicalDocument);
  });
  const frozenDocuments = Object.freeze(documents);
  const labelFilter = profile.labelFilter ? createSupportManagementLabelFilterProfile(profile.labelFilter) : undefined;
  const registration = createSupportRegistrationPolicy(profile.registration);

  return Object.freeze({
    application,
    documents: frozenDocuments,
    registration,
    ...(requiredSupportManagementApiTarget ? { requiredSupportManagementApiTarget } : {}),
    ...(labelFilter ? { labelFilter } : {}),
  });
};

let configuredProfile: SupportApplicationProfile | undefined;

/** Called by the selected dragon before controllers are instantiated. */
export const configureSupportApplicationProfile = (profile: SupportApplicationProfile): void => {
  configuredProfile = profile;
};

export const getSupportApplicationProfile = (application: string | undefined): SupportApplicationProfile => {
  const identity = application?.trim().toUpperCase() ?? '';
  if (configuredProfile?.application === identity) return configuredProfile;
  return Object.freeze({ application: identity, documents: Object.freeze([]), registration: Object.freeze({ mode: 'disabled' }) });
};
