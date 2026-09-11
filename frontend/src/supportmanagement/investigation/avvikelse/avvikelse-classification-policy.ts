import type { SupportLabelTreeProfile } from '../../services/support-label-classification-projector';
import { normalizeSupportManagementResourcePath } from '../../services/supportmanagement-path';
import type { SupportErrandClassificationPlacement } from '../classification-placement';

export interface AvvikelseClassificationLegalBaseRule {
  readonly legalBase: string;
  readonly allowedClassificationCategories: readonly string[];
}

export interface AvvikelseClassificationLabelTree extends SupportLabelTreeProfile {
  readonly root: Readonly<{
    readonly resource: string;
    readonly classification: string;
  }>;
  readonly ownerClassification: string;
}

export const AVVIKELSE_CLASSIFICATION_POLICY = Object.freeze({
  defaultOwnerSchemaName: 'utredning-enhetschef',
  reportedMisconductOwnerSchemaName: 'utredning-sol-lss',
  reportedMisconductSelector: Object.freeze({
    parameter: Object.freeze({ key: 'eventType', values: Object.freeze(['MISSFORHALLANDE']) }),
    labels: Object.freeze({
      resourcePaths: Object.freeze(['REPORT_TYPE/ABUSE', 'REPORT_TYPE/ADVERSE_INCIDENT']),
      resourceNames: Object.freeze(['ABUSE', 'ADVERSE_INCIDENT']),
    }),
  }),
  /** The errand's legal base labels; an HSL label marks the errand for the HSL decision. */
  hslLegalBaseSelector: Object.freeze({
    labels: Object.freeze({
      classification: 'PROVISION',
      resourcePaths: Object.freeze(['PROVISION/HSL']),
      resourceNames: Object.freeze(['HSL']),
    }),
  }),
  labelTree: Object.freeze({
    root: Object.freeze({ resource: 'CATEGORY', classification: 'CATEGORY_ROOT' }),
    ownerClassification: 'PROVISION_CATEGORY',
    categoryClassification: 'CATEGORY',
    typeClassification: 'TYPE',
  }) satisfies AvvikelseClassificationLabelTree,
  forcedLegalBases: Object.freeze(['SOL', 'LSS']),
  legalBasesPointer: '/legalBases',
  legalBaseRules: Object.freeze([
    Object.freeze({ legalBase: 'HSL', allowedClassificationCategories: Object.freeze(['CATEGORY/HSL']) }),
    Object.freeze({ legalBase: 'SOL', allowedClassificationCategories: Object.freeze(['CATEGORY/SOL_LSS']) }),
    Object.freeze({ legalBase: 'LSS', allowedClassificationCategories: Object.freeze(['CATEGORY/SOL_LSS']) }),
  ]) satisfies readonly AvvikelseClassificationLegalBaseRule[],
});

type AvvikelseClassificationPolicy = typeof AVVIKELSE_CLASSIFICATION_POLICY;
type ResolvedAvvikelseClassificationPolicy = AvvikelseClassificationPolicy &
  Readonly<{
    defaultOwnerDocumentKey: string;
    reportedMisconductOwnerDocumentKey: string;
  }>;

/**
 * The avvikelse placement. Structurally a SupportErrandClassificationPlacement, plus the policy
 * payload that only avvikelse code reads - which is why shared consumers take the shared type and
 * never see this one.
 */
export type AvvikelseClassificationPlacement = SupportErrandClassificationPlacement &
  (
    | Readonly<{ owner: 'basics' | 'unavailable'; policy: AvvikelseClassificationPolicy }>
    | Readonly<{ owner: 'investigation'; policy: ResolvedAvvikelseClassificationPolicy }>
  ) &
  Readonly<{ labelTree: AvvikelseClassificationLabelTree }>;

interface ClassificationPolicyProfile {
  readonly application: string;
  readonly state: 'active' | 'inactive' | 'unavailable';
  readonly documents: readonly Readonly<{ key: string; schemaName: string }>[];
}

interface ResolveClassificationPlacementOptions {
  readonly application?: string;
  readonly profile: ClassificationPolicyProfile | null | undefined;
}

interface ClassificationOwnerErrand {
  readonly parameters?: readonly {
    readonly key: string;
    readonly values?: readonly string[];
  }[];
  readonly labels?: readonly {
    readonly classification?: string;
    readonly resourcePath?: string;
    readonly resourceName?: string;
  }[];
}

/**
 * Which decision an errand takes, if any. Reported misconduct always takes the lex Sarah decision,
 * whatever its legal bases; an ordinary deviation takes the HSL decision when HSL is one of its
 * legal bases; every other errand takes none. One decision per errand, never two.
 */
export type AvvikelseDocumentApplicability = 'reported-misconduct' | 'hsl-deviation';

const iafVofBasicsPlacement: AvvikelseClassificationPlacement = Object.freeze({
  owner: 'basics',
  labelTree: AVVIKELSE_CLASSIFICATION_POLICY.labelTree,
  policy: AVVIKELSE_CLASSIFICATION_POLICY,
});
const iafVofUnavailablePlacement: AvvikelseClassificationPlacement = Object.freeze({
  owner: 'unavailable',
  labelTree: AVVIKELSE_CLASSIFICATION_POLICY.labelTree,
  policy: AVVIKELSE_CLASSIFICATION_POLICY,
});

const normalizeApplication = (application: string | undefined): string => application?.trim().toUpperCase() ?? '';

const findUniqueDocumentKey = (
  documents: ClassificationPolicyProfile['documents'],
  schemaName: string
): string | undefined => {
  const matches = documents.filter((document) => document.schemaName === schemaName);
  return matches.length === 1 ? matches[0].key : undefined;
};

/**
 * The runtime profile decides whether investigation is active and maps fixed
 * IAF/VOF schema roles to persistence keys. It cannot redefine the business rule.
 */
export function resolveSupportErrandClassificationPlacement({
  application,
  profile,
}: ResolveClassificationPlacementOptions): AvvikelseClassificationPlacement {
  const normalizedApplication = normalizeApplication(application);
  if (!profile || profile.state === 'unavailable') return iafVofUnavailablePlacement;
  // Not a capability decision: the enabling flag already made that. This only catches a BFF
  // handing back another deployment's profile, which no local flag could detect.
  if (normalizeApplication(profile.application) !== normalizedApplication) return iafVofUnavailablePlacement;
  if (profile.state !== 'active') return iafVofBasicsPlacement;

  const defaultOwnerDocumentKey = findUniqueDocumentKey(
    profile.documents,
    AVVIKELSE_CLASSIFICATION_POLICY.defaultOwnerSchemaName
  );
  const reportedMisconductOwnerDocumentKey = findUniqueDocumentKey(
    profile.documents,
    AVVIKELSE_CLASSIFICATION_POLICY.reportedMisconductOwnerSchemaName
  );
  if (!defaultOwnerDocumentKey || !reportedMisconductOwnerDocumentKey) return iafVofBasicsPlacement;

  return Object.freeze({
    owner: 'investigation',
    labelTree: AVVIKELSE_CLASSIFICATION_POLICY.labelTree,
    policy: Object.freeze({
      ...AVVIKELSE_CLASSIFICATION_POLICY,
      defaultOwnerDocumentKey,
      reportedMisconductOwnerDocumentKey,
    }),
  });
}

const normalizeCode = (value: string): string => value.trim().toUpperCase();
const normalizeResourcePath = (value: string): string => normalizeSupportManagementResourcePath(value);

export const isAvvikelseReportedMisconductErrand = (errand: ClassificationOwnerErrand | undefined): boolean => {
  if (!errand) return false;
  const selector = AVVIKELSE_CLASSIFICATION_POLICY.reportedMisconductSelector;
  const selectedValues = new Set<string>(selector.parameter.values);
  const matchesParameter =
    errand.parameters?.some(
      (parameter) =>
        parameter.key.trim() === selector.parameter.key &&
        parameter.values?.some((candidate) => selectedValues.has(normalizeCode(candidate)))
    ) ?? false;
  if (matchesParameter) return true;

  const selectedPaths = new Set<string>(selector.labels.resourcePaths);
  const selectedNames = new Set<string>(selector.labels.resourceNames);
  return (
    errand.labels?.some((label) => {
      const resourcePath = label.resourcePath?.trim();
      if (resourcePath) return selectedPaths.has(normalizeResourcePath(resourcePath));
      return typeof label.resourceName === 'string' && selectedNames.has(normalizeCode(label.resourceName));
    }) ?? false
  );
};

const hasAvvikelseHslLegalBase = (errand: ClassificationOwnerErrand): boolean => {
  const selector = AVVIKELSE_CLASSIFICATION_POLICY.hslLegalBaseSelector.labels;
  const selectedPaths = new Set<string>(selector.resourcePaths);
  const selectedNames = new Set<string>(selector.resourceNames);
  return (
    errand.labels?.some((label) => {
      const resourcePath = label.resourcePath?.trim();
      if (resourcePath) return selectedPaths.has(normalizeResourcePath(resourcePath));
      // Without a path the name alone is ambiguous - CATEGORY/HSL is also named HSL - so the
      // fallback also requires the label to be a legal base.
      return (
        typeof label.classification === 'string' &&
        normalizeCode(label.classification) === selector.classification &&
        typeof label.resourceName === 'string' &&
        selectedNames.has(normalizeCode(label.resourceName))
      );
    }) ?? false
  );
};

export const resolveAvvikelseDocumentApplicability = (
  errand: ClassificationOwnerErrand | undefined
): AvvikelseDocumentApplicability | undefined => {
  if (!errand) return undefined;
  if (isAvvikelseReportedMisconductErrand(errand)) return 'reported-misconduct';
  return hasAvvikelseHslLegalBase(errand) ? 'hsl-deviation' : undefined;
};

export const resolveAvvikelseClassificationOwnerDocumentKey = (
  placement: Extract<AvvikelseClassificationPlacement, { owner: 'investigation' }>,
  errand: ClassificationOwnerErrand
): string =>
  isAvvikelseReportedMisconductErrand(errand)
    ? placement.policy.reportedMisconductOwnerDocumentKey
    : placement.policy.defaultOwnerDocumentKey;
