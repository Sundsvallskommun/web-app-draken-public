import type { SupportLabelTreeProfile } from '../services/support-label-classification-projector';
import { normalizeSupportManagementResourcePath } from '../services/supportmanagement-path';
import type { SupportErrandClassificationPlacement } from './classification-placement';

export interface IafVofInvestigationClassificationLegalBaseRule {
  readonly legalBase: string;
  readonly allowedClassificationCategories: readonly string[];
}

export interface IafVofInvestigationClassificationLabelTree extends SupportLabelTreeProfile {
  readonly root: Readonly<{
    readonly resource: string;
    readonly classification: string;
  }>;
  readonly ownerClassification: string;
}

export const IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY = Object.freeze({
  defaultOwnerSchemaName: 'utredning-enhetschef',
  reportedMisconductOwnerSchemaName: 'utredning-sol-lss',
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
  }) satisfies IafVofInvestigationClassificationLabelTree,
  forcedLegalBases: Object.freeze(['SOL', 'LSS']),
  legalBasesPointer: '/legalBases',
  legalBaseRules: Object.freeze([
    Object.freeze({ legalBase: 'HSL', allowedClassificationCategories: Object.freeze(['CATEGORY/HSL']) }),
    Object.freeze({ legalBase: 'SOL', allowedClassificationCategories: Object.freeze(['CATEGORY/SOL_LSS']) }),
    Object.freeze({ legalBase: 'LSS', allowedClassificationCategories: Object.freeze(['CATEGORY/SOL_LSS']) }),
  ]) satisfies readonly IafVofInvestigationClassificationLegalBaseRule[],
});

type IafVofClassificationPolicy = typeof IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY;
type ResolvedIafVofClassificationPolicy = IafVofClassificationPolicy &
  Readonly<{
    defaultOwnerDocumentKey: string;
    reportedMisconductOwnerDocumentKey: string;
  }>;

/**
 * The avvikelse placement. Structurally a SupportErrandClassificationPlacement, plus the policy
 * payload that only avvikelse code reads - which is why shared consumers take the shared type and
 * never see this one.
 */
export type IafVofClassificationPlacement = SupportErrandClassificationPlacement &
  (
    | Readonly<{ owner: 'basics' | 'unavailable'; policy: IafVofClassificationPolicy }>
    | Readonly<{ owner: 'investigation'; policy: ResolvedIafVofClassificationPolicy }>
  ) &
  Readonly<{ labelTree: IafVofInvestigationClassificationLabelTree }>;

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
    readonly resourcePath?: string;
    readonly resourceName?: string;
  }[];
}

const iafVofBasicsPlacement: IafVofClassificationPlacement = Object.freeze({
  owner: 'basics',
  labelTree: IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.labelTree,
  policy: IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY,
});
const iafVofUnavailablePlacement: IafVofClassificationPlacement = Object.freeze({
  owner: 'unavailable',
  labelTree: IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.labelTree,
  policy: IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY,
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
}: ResolveClassificationPlacementOptions): IafVofClassificationPlacement {
  const normalizedApplication = normalizeApplication(application);
  if (!profile || profile.state === 'unavailable') return iafVofUnavailablePlacement;
  // Not a capability decision: the enabling flag already made that. This only catches a BFF
  // handing back another deployment's profile, which no local flag could detect.
  if (normalizeApplication(profile.application) !== normalizedApplication) return iafVofUnavailablePlacement;
  if (profile.state !== 'active') return iafVofBasicsPlacement;

  const defaultOwnerDocumentKey = findUniqueDocumentKey(
    profile.documents,
    IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.defaultOwnerSchemaName
  );
  const reportedMisconductOwnerDocumentKey = findUniqueDocumentKey(
    profile.documents,
    IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.reportedMisconductOwnerSchemaName
  );
  if (!defaultOwnerDocumentKey || !reportedMisconductOwnerDocumentKey) return iafVofBasicsPlacement;

  return Object.freeze({
    owner: 'investigation',
    labelTree: IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.labelTree,
    policy: Object.freeze({
      ...IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY,
      defaultOwnerDocumentKey,
      reportedMisconductOwnerDocumentKey,
    }),
  });
}

const normalizeCode = (value: string): string => value.trim().toUpperCase();
const normalizeResourcePath = (value: string): string => normalizeSupportManagementResourcePath(value);

export const isIafVofReportedMisconductErrand = (errand: ClassificationOwnerErrand | undefined): boolean => {
  if (!errand) return false;
  const selector = IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.reportedMisconductSelector;
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

export const resolveIafVofInvestigationClassificationOwnerDocumentKey = (
  placement: Extract<IafVofClassificationPlacement, { owner: 'investigation' }>,
  errand: ClassificationOwnerErrand
): string =>
  isIafVofReportedMisconductErrand(errand)
    ? placement.policy.reportedMisconductOwnerDocumentKey
    : placement.policy.defaultOwnerDocumentKey;
