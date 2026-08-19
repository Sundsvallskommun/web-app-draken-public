import type { LabelFilterGroupDefinition } from '../filters/label-filter-projector';
import type {
  InvestigationClassificationPolicy,
  ReportedMisconductLabelTree,
} from './investigation-classification-policy';

export type {
  InvestigationClassificationLegalBaseRule,
  InvestigationClassificationPolicy,
  ReportedMisconductInvestigationClassificationPolicy,
  ReportedMisconductLabelTree,
} from './investigation-classification-policy';

export const INVESTIGATION_PROFILE_STATES = ['active', 'inactive', 'unavailable'] as const;
export type InvestigationProfileState = (typeof INVESTIGATION_PROFILE_STATES)[number];

export interface InvestigationProfileDocument {
  readonly key: string;
  readonly schemaName: string;
  readonly tabLabel: string;
  readonly ownerLabel: string;
  readonly permissions: { readonly canRead: boolean; readonly canWrite: boolean };
}

export interface InvestigationProfile {
  readonly application: string;
  readonly state: InvestigationProfileState;
  readonly documents: readonly InvestigationProfileDocument[];
  readonly registration: { readonly mode: 'enabled' | 'disabled' };
  readonly classificationPolicy?: InvestigationClassificationPolicy;
  readonly labelFilter?: { readonly groups: readonly LabelFilterGroupDefinition[] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRequiredString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Utredningsprofilen saknar ett giltigt värde för ${path}.`);
  }

  return value.trim();
}

const profileIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function readProfileIdentifier(value: unknown, path: string): string {
  const identifier = readRequiredString(value, path);
  if (!profileIdentifierPattern.test(identifier)) {
    throw new Error(`Utredningsprofilens ${path} måste vara ett lowercase kebab-case-id.`);
  }

  return identifier;
}

function assertUnique(values: readonly string[], path: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Utredningsprofilen innehåller duplicerade ${path}.`);
  }
}

function readDocument(value: unknown, index: number): InvestigationProfileDocument {
  if (!isRecord(value)) {
    throw new Error(`Utredningsprofilens documents[${index}] är ogiltigt.`);
  }

  if (
    !isRecord(value.permissions) ||
    typeof value.permissions.canRead !== 'boolean' ||
    typeof value.permissions.canWrite !== 'boolean' ||
    (value.permissions.canWrite && !value.permissions.canRead)
  ) {
    throw new Error(`Utredningsprofilens documents[${index}].permissions är ogiltig.`);
  }

  return Object.freeze({
    key: readProfileIdentifier(value.key, `documents[${index}].key`),
    schemaName: readProfileIdentifier(value.schemaName, `documents[${index}].schemaName`),
    tabLabel: readRequiredString(value.tabLabel, `documents[${index}].tabLabel`),
    ownerLabel: readRequiredString(value.ownerLabel, `documents[${index}].ownerLabel`),
    permissions: Object.freeze({ canRead: value.permissions.canRead, canWrite: value.permissions.canWrite }),
  });
}

const labelResourcePathPattern = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/u;
const labelClassificationPattern = /^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*$/u;

function readStringArray(
  value: unknown,
  path: string,
  { allowEmpty = false }: { readonly allowEmpty?: boolean } = {}
): readonly string[] {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`Utredningsprofilens ${path} är ogiltig.`);
  }
  return Object.freeze(value.map((candidate, index) => readRequiredString(candidate, `${path}[${index}]`)));
}

function assertSemanticUniqueness(
  values: readonly string[],
  path: string,
  normalize: (value: string) => string = (value) => value.trim().toUpperCase()
): void {
  if (new Set(values.map(normalize)).size !== values.length) {
    throw new Error(`Utredningsprofilens ${path} innehåller duplicerade värden.`);
  }
}

function readClassificationResourcePaths(value: unknown, path: string, allowEmpty = false): readonly string[] {
  const values = readStringArray(value, path, { allowEmpty });
  if (values.some((candidate) => !labelResourcePathPattern.test(candidate))) {
    throw new Error(`Utredningsprofilens ${path} är ogiltig.`);
  }
  assertSemanticUniqueness(values, path, (candidate) => candidate.trim().toUpperCase());
  return values;
}

function readClassificationToken(value: unknown, path: string): string {
  const token = readRequiredString(value, path);
  if (!labelClassificationPattern.test(token)) {
    throw new Error(`Utredningsprofilens ${path} är ogiltig.`);
  }
  return token;
}

const normalizeClassificationToken = (value: string): string => value.replaceAll('_', '-').toUpperCase();
const normalizeLabelResourcePath = (value: string): string => value.toUpperCase();

function readReportedMisconductLabelTree(value: unknown): ReportedMisconductLabelTree {
  if (!isRecord(value) || !isRecord(value.root)) {
    throw new Error('Utredningsprofilens classificationPolicy.labelTree är ogiltig.');
  }
  const rootResource = readRequiredString(value.root.resource, 'classificationPolicy.labelTree.root.resource');
  if (!labelResourcePathPattern.test(rootResource)) {
    throw new Error('Utredningsprofilens classificationPolicy.labelTree.root.resource är ogiltig.');
  }
  const labelTree = Object.freeze({
    root: Object.freeze({
      resource: rootResource,
      classification: readClassificationToken(
        value.root.classification,
        'classificationPolicy.labelTree.root.classification'
      ),
    }),
    ownerClassification: readClassificationToken(
      value.ownerClassification,
      'classificationPolicy.labelTree.ownerClassification'
    ),
    categoryClassification: readClassificationToken(
      value.categoryClassification,
      'classificationPolicy.labelTree.categoryClassification'
    ),
    typeClassification: readClassificationToken(
      value.typeClassification,
      'classificationPolicy.labelTree.typeClassification'
    ),
  });
  const classifications = [
    labelTree.root.classification,
    labelTree.ownerClassification,
    labelTree.categoryClassification,
    labelTree.typeClassification,
  ].map(normalizeClassificationToken);
  if (new Set(classifications).size !== classifications.length) {
    throw new Error('Utredningsprofilens classificationPolicy.labelTree måste använda unika klassificeringar.');
  }
  return labelTree;
}

const decodeJsonPointerSegment = (segment: string): string => segment.replaceAll('~1', '/').replaceAll('~0', '~');

function readJsonPointer(value: unknown, path: string): string {
  const pointer = readRequiredString(value, path);
  if (!pointer.startsWith('/') || /~(?![01])/u.test(pointer)) {
    throw new Error(`Utredningsprofilens ${path} är ogiltig.`);
  }
  const segments = pointer.slice(1).split('/').map(decodeJsonPointerSegment);
  if (segments.some((segment) => segment.length === 0 || ['__proto__', 'prototype', 'constructor'].includes(segment))) {
    throw new Error(`Utredningsprofilens ${path} är ogiltig.`);
  }
  return pointer;
}

function readClassificationPolicy(
  value: unknown,
  documents: readonly InvestigationProfileDocument[]
): InvestigationClassificationPolicy | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || value.strategy !== 'reported-misconduct') {
    throw new Error('Utredningsprofilens classificationPolicy är ogiltig.');
  }

  const defaultOwnerDocumentKey = readProfileIdentifier(
    value.defaultOwnerDocumentKey,
    'classificationPolicy.defaultOwnerDocumentKey'
  );
  const reportedMisconductOwnerDocumentKey = readProfileIdentifier(
    value.reportedMisconductOwnerDocumentKey,
    'classificationPolicy.reportedMisconductOwnerDocumentKey'
  );
  const documentKeys = new Set(documents.map(({ key }) => key));
  if (!documentKeys.has(defaultOwnerDocumentKey) || !documentKeys.has(reportedMisconductOwnerDocumentKey)) {
    throw new Error('Utredningsprofilens classificationPolicy refererar till ett okänt dokument.');
  }

  if (!isRecord(value.reportedMisconductSelector)) {
    throw new Error('Utredningsprofilens classificationPolicy.reportedMisconductSelector är ogiltig.');
  }
  const { parameter, labels } = value.reportedMisconductSelector;
  if (!isRecord(parameter) || !isRecord(labels)) {
    throw new Error('Utredningsprofilens classificationPolicy.reportedMisconductSelector är ogiltig.');
  }
  const parameterKey = readRequiredString(
    parameter.key,
    'classificationPolicy.reportedMisconductSelector.parameter.key'
  );
  const parameterValues = readStringArray(
    parameter.values,
    'classificationPolicy.reportedMisconductSelector.parameter.values'
  );
  assertSemanticUniqueness(parameterValues, 'classificationPolicy.reportedMisconductSelector.parameter.values');
  const resourcePaths = readClassificationResourcePaths(
    labels.resourcePaths,
    'classificationPolicy.reportedMisconductSelector.labels.resourcePaths',
    true
  );
  const resourceNames = readStringArray(
    labels.resourceNames,
    'classificationPolicy.reportedMisconductSelector.labels.resourceNames',
    { allowEmpty: true }
  );
  assertSemanticUniqueness(resourceNames, 'classificationPolicy.reportedMisconductSelector.labels.resourceNames');
  if (resourcePaths.length === 0 && resourceNames.length === 0) {
    throw new Error('Utredningsprofilens classificationPolicy.reportedMisconductSelector.labels är tom.');
  }

  const labelTree = readReportedMisconductLabelTree(value.labelTree);
  const legalBasesPointer = readJsonPointer(value.legalBasesPointer, 'classificationPolicy.legalBasesPointer');
  if (!Array.isArray(value.legalBaseRules) || value.legalBaseRules.length === 0) {
    throw new Error('Utredningsprofilens classificationPolicy.legalBaseRules är ogiltig.');
  }
  const legalBaseRules = value.legalBaseRules.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`Utredningsprofilens classificationPolicy.legalBaseRules[${index}] är ogiltig.`);
    }
    const legalBase = readRequiredString(
      candidate.legalBase,
      `classificationPolicy.legalBaseRules[${index}].legalBase`
    );
    const allowedClassificationCategories = readClassificationResourcePaths(
      candidate.allowedClassificationCategories,
      `classificationPolicy.legalBaseRules[${index}].allowedClassificationCategories`
    );
    return Object.freeze({ legalBase, allowedClassificationCategories });
  });
  assertSemanticUniqueness(
    legalBaseRules.map(({ legalBase }) => legalBase),
    'classificationPolicy.legalBaseRules'
  );
  const normalizedRootResource = normalizeLabelResourcePath(labelTree.root.resource);
  if (
    legalBaseRules.some(({ allowedClassificationCategories }) =>
      allowedClassificationCategories.some((category) => {
        const normalizedCategory = normalizeLabelResourcePath(category);
        return (
          normalizedCategory !== normalizedRootResource && !normalizedCategory.startsWith(`${normalizedRootResource}/`)
        );
      })
    )
  ) {
    throw new Error('Utredningsprofilens classificationPolicy.legalBaseRules refererar utanför labelTree-roten.');
  }

  const forcedLegalBases = readStringArray(value.forcedLegalBases, 'classificationPolicy.forcedLegalBases');
  assertSemanticUniqueness(forcedLegalBases, 'classificationPolicy.forcedLegalBases');
  const supportedLegalBases = new Set(legalBaseRules.map(({ legalBase }) => legalBase.trim().toUpperCase()));
  if (forcedLegalBases.some((legalBase) => !supportedLegalBases.has(legalBase.trim().toUpperCase()))) {
    throw new Error('Utredningsprofilens classificationPolicy.forcedLegalBases innehåller ett lagrum utan regel.');
  }

  return Object.freeze({
    strategy: 'reported-misconduct',
    defaultOwnerDocumentKey,
    reportedMisconductOwnerDocumentKey,
    reportedMisconductSelector: Object.freeze({
      parameter: Object.freeze({ key: parameterKey, values: parameterValues }),
      labels: Object.freeze({ resourcePaths, resourceNames }),
    }),
    labelTree,
    forcedLegalBases,
    legalBasesPointer,
    legalBaseRules: Object.freeze(legalBaseRules),
  });
}

function readLabelFilter(value: unknown): InvestigationProfile['labelFilter'] {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !Array.isArray(value.groups) || value.groups.length === 0) {
    throw new Error('Utredningsprofilens labelFilter är ogiltigt.');
  }

  const groupKeys = new Set<string>();
  const rootResourcePaths = new Set<string>();
  const groups = value.groups.map((candidate, groupIndex) => {
    if (!isRecord(candidate) || !Array.isArray(candidate.fields) || candidate.fields.length === 0) {
      throw new Error(`Utredningsprofilens labelFilter.groups[${groupIndex}] är ogiltig.`);
    }
    const key = readProfileIdentifier(candidate.key, `labelFilter.groups[${groupIndex}].key`);
    const label = readRequiredString(candidate.label, `labelFilter.groups[${groupIndex}].label`);
    const rootResourcePath = readRequiredString(
      candidate.rootResourcePath,
      `labelFilter.groups[${groupIndex}].rootResourcePath`
    );
    if (!labelResourcePathPattern.test(rootResourcePath)) {
      throw new Error(`Utredningsprofilens labelFilter.groups[${groupIndex}].rootResourcePath är ogiltig.`);
    }
    if (groupKeys.has(key) || rootResourcePaths.has(rootResourcePath)) {
      throw new Error('Utredningsprofilens labelFilter innehåller duplicerade grupper eller rötter.');
    }
    groupKeys.add(key);
    rootResourcePaths.add(rootResourcePath);

    const fieldKeys = new Set<string>();
    const classifications = new Set<string>();
    const fields = candidate.fields.map((fieldCandidate, fieldIndex) => {
      if (!isRecord(fieldCandidate)) {
        throw new Error(`Utredningsprofilens labelFilter.groups[${groupIndex}].fields[${fieldIndex}] är ogiltig.`);
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
        throw new Error(`Utredningsprofilens labelFilter-grupp ${key} innehåller duplicerade fält.`);
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
export function parseInvestigationProfile(value: unknown, expectedApplication?: string): InvestigationProfile {
  if (!isRecord(value) || !Array.isArray(value.documents)) {
    throw new Error('Utredningsprofilen är ogiltig.');
  }

  const application = normalizeApplication(readRequiredString(value.application, 'application'));
  const state = readRequiredString(value.state, 'state');
  if (!INVESTIGATION_PROFILE_STATES.some((candidate) => candidate === state)) {
    throw new Error('Utredningsprofilens state är ogiltig.');
  }
  const normalizedExpectedApplication = expectedApplication ? normalizeApplication(expectedApplication) : '';
  if (normalizedExpectedApplication && application !== normalizedExpectedApplication) {
    throw new Error(`Utredningsprofilen gäller ${application}, men klienten kör ${normalizedExpectedApplication}.`);
  }

  const documents = value.documents.map(readDocument);
  if (
    !isRecord(value.registration) ||
    (value.registration.mode !== 'enabled' && value.registration.mode !== 'disabled')
  ) {
    throw new Error('Utredningsprofilens registration är ogiltig.');
  }
  const registration = Object.freeze({ mode: value.registration.mode });
  const classificationPolicy = readClassificationPolicy(value.classificationPolicy, documents);
  const labelFilter = readLabelFilter(value.labelFilter);
  assertUnique(
    documents.map(({ key }) => key),
    'document keys'
  );
  return Object.freeze({
    application,
    state: state as InvestigationProfileState,
    documents: Object.freeze(documents),
    registration,
    ...(classificationPolicy ? { classificationPolicy } : {}),
    ...(labelFilter ? { labelFilter } : {}),
  });
}

export function hasInvestigationDocuments(
  profile: InvestigationProfile | null | undefined
): profile is InvestigationProfile {
  return Boolean(profile?.documents.length);
}

export function isInvestigationActive(
  profile: InvestigationProfile | null | undefined
): profile is InvestigationProfile {
  return profile?.state === 'active' && hasInvestigationDocuments(profile);
}

export const isSupportRegistrationEnabled = (profile: InvestigationProfile | null | undefined): boolean =>
  profile?.registration.mode === 'enabled';
