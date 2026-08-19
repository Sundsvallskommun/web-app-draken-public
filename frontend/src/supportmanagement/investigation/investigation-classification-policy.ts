export interface InvestigationClassificationLegalBaseRule {
  readonly legalBase: string;
  readonly allowedClassificationCategories: readonly string[];
}

/**
 * The Support Management label-tree vocabulary consumed by the
 * `reported-misconduct` strategy. That strategy intentionally persists the
 * owner in classification.category, the category in classification.type and
 * the selected type as a label.
 */
export interface ReportedMisconductLabelTree {
  readonly root: Readonly<{
    readonly resource: string;
    readonly classification: string;
  }>;
  readonly ownerClassification: string;
  readonly categoryClassification: string;
  readonly typeClassification: string;
}

export interface ReportedMisconductInvestigationClassificationPolicy {
  readonly strategy: 'reported-misconduct';
  readonly defaultOwnerDocumentKey: string;
  readonly reportedMisconductOwnerDocumentKey: string;
  readonly reportedMisconductSelector: Readonly<{
    parameter: Readonly<{ key: string; values: readonly string[] }>;
    labels: Readonly<{ resourcePaths: readonly string[]; resourceNames: readonly string[] }>;
  }>;
  readonly labelTree: ReportedMisconductLabelTree;
  readonly forcedLegalBases: readonly string[];
  readonly legalBasesPointer: string;
  readonly legalBaseRules: readonly InvestigationClassificationLegalBaseRule[];
}

export type InvestigationClassificationPolicy = ReportedMisconductInvestigationClassificationPolicy;

export type SupportErrandClassificationPlacement =
  | Readonly<{
      owner: 'basics';
      categorization: 'default';
      policy?: undefined;
    }>
  | Readonly<{
      owner: 'basics';
      categorization: 'reported-misconduct';
      policy: ReportedMisconductInvestigationClassificationPolicy;
    }>
  | Readonly<{
      owner: 'investigation';
      categorization: 'reported-misconduct';
      policy: ReportedMisconductInvestigationClassificationPolicy;
    }>
  | Readonly<{
      owner: 'unavailable';
      categorization: 'reported-misconduct';
      policy: ReportedMisconductInvestigationClassificationPolicy;
    }>;

interface ClassificationPolicyProfile {
  readonly state: 'active' | 'inactive' | 'unavailable';
  readonly classificationPolicy?: InvestigationClassificationPolicy;
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

const defaultBasicsPlacement: SupportErrandClassificationPlacement = Object.freeze({
  owner: 'basics',
  categorization: 'default',
});

/** Feature flags and application rules are already folded into the BFF-owned
 * profile. The browser derives placement from that one canonical state. */
export function resolveSupportErrandClassificationPlacement(
  profile: ClassificationPolicyProfile | null | undefined
): SupportErrandClassificationPlacement {
  const policy = profile?.classificationPolicy;
  if (!policy) return defaultBasicsPlacement;
  if (profile.state === 'unavailable') {
    return Object.freeze({ owner: 'unavailable', categorization: 'reported-misconduct', policy });
  }
  if (profile.state !== 'active') {
    return Object.freeze({ owner: 'basics', categorization: 'reported-misconduct', policy });
  }
  return Object.freeze({ owner: 'investigation', categorization: 'reported-misconduct', policy });
}

const normalizeCode = (value: string): string => value.trim().toUpperCase();
const normalizeResourcePath = (value: string): string => normalizeCode(value).replace(/^\/+|\/+$/gu, '');

const matchesReportedMisconductParameter = (
  policy: ReportedMisconductInvestigationClassificationPolicy,
  errand: ClassificationOwnerErrand
): boolean => {
  const selector = policy.reportedMisconductSelector.parameter;
  const selectedValues = new Set(selector.values.map(normalizeCode));
  return (
    errand.parameters?.some(
      (parameter) =>
        parameter.key.trim() === selector.key.trim() &&
        parameter.values?.some((candidate) => selectedValues.has(normalizeCode(candidate)))
    ) ?? false
  );
};

const matchesReportedMisconductLabel = (
  policy: ReportedMisconductInvestigationClassificationPolicy,
  errand: ClassificationOwnerErrand
): boolean => {
  const selector = policy.reportedMisconductSelector.labels;
  const selectedPaths = new Set(selector.resourcePaths.map(normalizeResourcePath));
  const selectedNames = new Set(selector.resourceNames.map(normalizeCode));
  return (
    errand.labels?.some((label) => {
      const resourcePath = label.resourcePath?.trim();
      if (resourcePath) return selectedPaths.has(normalizeResourcePath(resourcePath));
      return typeof label.resourceName === 'string' && selectedNames.has(normalizeCode(label.resourceName));
    }) ?? false
  );
};

export const isReportedMisconductErrandForPolicy = (
  policy: InvestigationClassificationPolicy,
  errand: ClassificationOwnerErrand | undefined
): boolean =>
  Boolean(
    errand && (matchesReportedMisconductParameter(policy, errand) || matchesReportedMisconductLabel(policy, errand))
  );

/** Mirrors the backend owner resolver, including authoritative resourcePath
 * handling and resourceName fallback only when a path is absent. */
export const resolveSupportInvestigationClassificationOwnerDocumentKey = (
  policy: InvestigationClassificationPolicy,
  errand: ClassificationOwnerErrand
): string => {
  switch (policy.strategy) {
    case 'reported-misconduct':
      return isReportedMisconductErrandForPolicy(policy, errand)
        ? policy.reportedMisconductOwnerDocumentKey
        : policy.defaultOwnerDocumentKey;
  }
};
