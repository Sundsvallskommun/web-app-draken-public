import type { LabelFilterGroupDefinition } from '../filters/label-filter-projector';

export const INVESTIGATION_PROFILE_STATES = ['active', 'inactive', 'unavailable'] as const;
export type InvestigationState = (typeof INVESTIGATION_PROFILE_STATES)[number];

export interface SupportApplicationProfileDocument {
  readonly key: string;
  readonly schemaName: string;
  readonly tabLabel: string;
  readonly ownerLabel: string;
}

export interface SupportApplicationProfile {
  readonly application: string;
  /** State of investigation; registration/filtering are independent application capabilities. */
  readonly state: InvestigationState;
  readonly documents: readonly SupportApplicationProfileDocument[];
  readonly registration: { readonly mode: 'enabled' | 'disabled' };
  readonly labelFilter?: { readonly groups: readonly LabelFilterGroupDefinition[] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Applikationsprofilen saknar ett giltigt värde för ${path}.`);
  }

  return value.trim();
}

const profileIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function readProfileIdentifier(value: unknown, path: string): string {
  const identifier = readRequiredString(value, path);
  if (!profileIdentifierPattern.test(identifier)) {
    throw new Error(`Applikationsprofilens ${path} måste vara ett lowercase kebab-case-id.`);
  }

  return identifier;
}

function assertUnique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Applikationsprofilen innehåller duplicerade ${path}.`);
  }
}

function readDocument(value: unknown, index: number): SupportApplicationProfileDocument {
  if (!isRecord(value)) {
    throw new Error(`Applikationsprofilens documents[${index}] är ogiltigt.`);
  }

  return Object.freeze({
    key: readProfileIdentifier(value.key, `documents[${index}].key`),
    schemaName: readProfileIdentifier(value.schemaName, `documents[${index}].schemaName`),
    tabLabel: readRequiredString(value.tabLabel, `documents[${index}].tabLabel`),
    ownerLabel: readRequiredString(value.ownerLabel, `documents[${index}].ownerLabel`),
  });
}

const labelResourcePathPattern = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/u;

function readLabelFilter(value: unknown): SupportApplicationProfile['labelFilter'] {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !Array.isArray(value.groups) || value.groups.length === 0) {
    throw new Error('Applikationsprofilens labelFilter är ogiltigt.');
  }

  const groupKeys = new Set<string>();
  const rootResourcePaths = new Set<string>();
  const groups = value.groups.map((candidate, groupIndex) => {
    if (!isRecord(candidate) || !Array.isArray(candidate.fields) || candidate.fields.length === 0) {
      throw new Error(`Applikationsprofilens labelFilter.groups[${groupIndex}] är ogiltig.`);
    }
    const key = readProfileIdentifier(candidate.key, `labelFilter.groups[${groupIndex}].key`);
    const label = readRequiredString(candidate.label, `labelFilter.groups[${groupIndex}].label`);
    const rootResourcePath = readRequiredString(
      candidate.rootResourcePath,
      `labelFilter.groups[${groupIndex}].rootResourcePath`
    );
    if (!labelResourcePathPattern.test(rootResourcePath)) {
      throw new Error(`Applikationsprofilens labelFilter.groups[${groupIndex}].rootResourcePath är ogiltig.`);
    }
    if (groupKeys.has(key) || rootResourcePaths.has(rootResourcePath)) {
      throw new Error('Applikationsprofilens labelFilter innehåller duplicerade grupper eller rötter.');
    }
    groupKeys.add(key);
    rootResourcePaths.add(rootResourcePath);

    const fieldKeys = new Set<string>();
    const classifications = new Set<string>();
    const fields = candidate.fields.map((fieldCandidate, fieldIndex) => {
      if (!isRecord(fieldCandidate)) {
        throw new Error(`Applikationsprofilens labelFilter.groups[${groupIndex}].fields[${fieldIndex}] är ogiltig.`);
      }
      const fieldKey = readProfileIdentifier(
        fieldCandidate.key,
        `labelFilter.groups[${groupIndex}].fields[${fieldIndex}].key`
      );
      const fieldLabel = readRequiredString(
        fieldCandidate.label,
        `labelFilter.groups[${groupIndex}].fields[${fieldIndex}].label`
      );
      const classification = readRequiredString(
        fieldCandidate.classification,
        `labelFilter.groups[${groupIndex}].fields[${fieldIndex}].classification`
      );
      const normalizedClassification = classification.replaceAll('_', '-').toUpperCase();
      if (fieldKeys.has(fieldKey) || classifications.has(normalizedClassification)) {
        throw new Error(`Applikationsprofilens labelFilter-grupp ${key} innehåller duplicerade fält.`);
      }
      fieldKeys.add(fieldKey);
      classifications.add(normalizedClassification);
      return Object.freeze({ key: fieldKey, label: fieldLabel, classification });
    });

    return Object.freeze({ key, label, rootResourcePath, fields: Object.freeze(fields) });
  });

  return Object.freeze({ groups: Object.freeze(groups) });
}

const normalizeApplication = (application: string): string => application.trim().toUpperCase();

/**
 * Converts the untrusted BFF response to the canonical runtime profile. Invalid
 * or cross-application data throws so the initializer can fail closed.
 */
export function parseSupportApplicationProfile(
  value: unknown,
  expectedApplication?: string
): SupportApplicationProfile {
  if (!isRecord(value) || !Array.isArray(value.documents)) {
    throw new Error('Applikationsprofilen är ogiltig.');
  }

  const application = normalizeApplication(readRequiredString(value.application, 'application'));
  const state = readRequiredString(value.state, 'state');
  if (!INVESTIGATION_PROFILE_STATES.includes(state as InvestigationState)) {
    throw new Error('Applikationsprofilens state är ogiltig.');
  }
  const normalizedExpectedApplication = expectedApplication ? normalizeApplication(expectedApplication) : '';
  if (normalizedExpectedApplication && application !== normalizedExpectedApplication) {
    throw new Error(`Applikationsprofilen gäller ${application}, men klienten kör ${normalizedExpectedApplication}.`);
  }

  const documents = value.documents.map((document, index) => readDocument(document, index));
  if (
    !isRecord(value.registration) ||
    (value.registration.mode !== 'enabled' && value.registration.mode !== 'disabled')
  ) {
    throw new Error('Applikationsprofilens registration är ogiltig.');
  }
  const registration = Object.freeze({ mode: value.registration.mode });
  const labelFilter = readLabelFilter(value.labelFilter);
  assertUnique(
    documents.map(({ key }) => key),
    'document keys'
  );
  return Object.freeze({
    application,
    state: state as InvestigationState,
    documents: Object.freeze(documents),
    registration,
    ...(labelFilter ? { labelFilter } : {}),
  });
}

export const isSupportRegistrationEnabled = (profile: SupportApplicationProfile | null | undefined): boolean =>
  profile?.registration.mode === 'enabled';
