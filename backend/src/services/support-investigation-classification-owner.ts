import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';

export interface SupportInvestigationClassificationLegalBaseRule {
  readonly legalBase: string;
  readonly allowedClassificationCategories: readonly string[];
}

export interface ReportedMisconductSelector {
  readonly parameter: Readonly<{
    key: string;
    values: readonly string[];
  }>;
  readonly labels: Readonly<{
    resourcePaths: readonly string[];
    resourceNames: readonly string[];
  }>;
}

/**
 * The exact Support Management label-tree vocabulary used by the
 * `reported-misconduct` strategy. The persistence mapping is intentionally
 * fixed by that strategy: owner -> classification.category, category ->
 * classification.type, and type -> the selected leaf label.
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

export interface SupportInvestigationClassificationPolicyBase<TStrategy extends string> {
  readonly strategy: TStrategy;
  readonly legalBasesPointer: string;
  readonly legalBaseRules: readonly SupportInvestigationClassificationLegalBaseRule[];
}

/**
 * Selects a separate classification owner for reported misconduct. The
 * selector is data, rather than application logic, so this strategy remains
 * reusable when document keys or Support Management metadata change.
 */
export interface ReportedMisconductInvestigationClassificationPolicy extends SupportInvestigationClassificationPolicyBase<'reported-misconduct'> {
  readonly defaultOwnerDocumentKey: string;
  readonly reportedMisconductOwnerDocumentKey: string;
  readonly reportedMisconductSelector: ReportedMisconductSelector;
  readonly labelTree: ReportedMisconductLabelTree;
  readonly forcedLegalBases: readonly string[];
}

/**
 * Discriminated union for supported owner-selection strategies. Keeping the
 * application factory outside this module makes owner selection independent
 * of which Draken instance supplied the policy.
 */
export type SupportInvestigationClassificationPolicy = ReportedMisconductInvestigationClassificationPolicy;

export type SupportInvestigationClassificationOwnerSelection = Readonly<{
  strategy: 'reported-misconduct';
  mode: 'default' | 'reported-misconduct';
  documentKey: string;
}>;

type ClassificationOwnerErrand = Pick<Errand, 'parameters' | 'labels'>;

const normalizeCode = (value: string): string => value.trim().toUpperCase();
const normalizeResourcePath = (value: string): string => normalizeCode(value).replace(/^\/+|\/+$/gu, '');

const matchesSelectorParameterKey = (parameterKey: string, selectorKey: string): boolean => parameterKey.trim() === selectorKey.trim();

const matchesReportedMisconductParameter = (
  policy: ReportedMisconductInvestigationClassificationPolicy,
  errand: ClassificationOwnerErrand,
): boolean => {
  const selector = policy.reportedMisconductSelector.parameter;
  const selectedValues = new Set(selector.values.map(normalizeCode));

  return (
    errand.parameters?.some(
      parameter =>
        matchesSelectorParameterKey(parameter.key, selector.key) && parameter.values?.some(value => selectedValues.has(normalizeCode(value))),
    ) ?? false
  );
};

const matchesReportedMisconductLabel = (policy: ReportedMisconductInvestigationClassificationPolicy, errand: ClassificationOwnerErrand): boolean => {
  const selector = policy.reportedMisconductSelector.labels;
  const selectedPaths = new Set(selector.resourcePaths.map(normalizeResourcePath));
  const selectedNames = new Set(selector.resourceNames.map(normalizeCode));

  return (
    errand.labels?.some(label => {
      const resourcePath = label.resourcePath?.trim();

      // A supplied path is authoritative. Resource-name matching is only a
      // fallback for older Support Management errands that lack resourcePath.
      if (resourcePath) return selectedPaths.has(normalizeResourcePath(resourcePath));
      return typeof label.resourceName === 'string' && selectedNames.has(normalizeCode(label.resourceName));
    }) ?? false
  );
};

/**
 * Resolves the exact profile document key that owns classification for an
 * errand. Application/feature checks belong to the policy factory and caller;
 * this function only evaluates the supplied, already-active policy.
 */
export const resolveSupportInvestigationClassificationOwner = (
  policy: SupportInvestigationClassificationPolicy,
  errand: ClassificationOwnerErrand,
): SupportInvestigationClassificationOwnerSelection => {
  switch (policy.strategy) {
    case 'reported-misconduct': {
      const reportedMisconduct = matchesReportedMisconductParameter(policy, errand) || matchesReportedMisconductLabel(policy, errand);
      return {
        strategy: policy.strategy,
        mode: reportedMisconduct ? 'reported-misconduct' : 'default',
        documentKey: reportedMisconduct ? policy.reportedMisconductOwnerDocumentKey : policy.defaultOwnerDocumentKey,
      };
    }
  }
};

const selectorParameterSnapshot = (policy: SupportInvestigationClassificationPolicy, parameters: Errand['parameters']): string => {
  switch (policy.strategy) {
    case 'reported-misconduct':
      return JSON.stringify(
        (parameters ?? [])
          .filter(parameter => matchesSelectorParameterKey(parameter.key, policy.reportedMisconductSelector.parameter.key))
          .map(parameter => ({ key: parameter.key, values: parameter.values ?? [] })),
      );
  }
};

/**
 * The generic errand PATCH may update unrelated parameters, but it must not
 * add, remove or mutate the parameter that decides which document owns
 * classification while the investigation policy is active.
 */
export const preservesSupportInvestigationClassificationSelectorParameter = (
  policy: SupportInvestigationClassificationPolicy,
  currentParameters: Errand['parameters'],
  requestedParameters: Errand['parameters'],
): boolean => selectorParameterSnapshot(policy, currentParameters) === selectorParameterSnapshot(policy, requestedParameters);
