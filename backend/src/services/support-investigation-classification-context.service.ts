import type {
  IafVofInvestigationClassificationOwnerSelection,
  IafVofInvestigationClassificationPolicy,
} from '@/config/iaf-vof-investigation-classification';
import { normalizeSupportManagementResourcePath } from '@/config/supportmanagement-path';
import { HttpException } from '@/exceptions/HttpException';

import { JsonObject } from './schema-bound-json.service';

interface RequestedClassification {
  readonly category: string;
  readonly type: string;
}

const readJsonPointer = (value: JsonObject, pointer: string): unknown =>
  pointer
    .slice(1)
    .split('/')
    .map(segment => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>(
      (current, segment) =>
        typeof current === 'object' && current !== null && !Array.isArray(current)
          ? (current as Readonly<Record<string, unknown>>)[segment]
          : undefined,
      value,
    );

/**
 * Enforces the policy-owned legal-base invariant at the backend write boundary, and returns the
 * classification group of each requested classification, in request order.
 * Metadata still resolves the complete CATEGORY path; this rule decides which owning category paths
 * the exact versioned document allows. Every group one of its legal bases belongs to is classified
 * exactly once - no group is left out, and none is classified twice.
 */
export const assertSupportInvestigationClassificationContext = (
  policy: IafVofInvestigationClassificationPolicy,
  owner: IafVofInvestigationClassificationOwnerSelection,
  documentKey: string,
  documentValue: JsonObject,
  classifications: readonly RequestedClassification[],
): string[] => {
  if (documentKey !== owner.documentKey) {
    throw new HttpException(409, 'The selected investigation document does not own classification for this errand');
  }

  const rawLegalBases = readJsonPointer(documentValue, policy.legalBasesPointer);
  if (!Array.isArray(rawLegalBases) || rawLegalBases.length === 0 || rawLegalBases.some(value => typeof value !== 'string')) {
    throw new HttpException(409, 'The investigation document must contain at least one supported legal base');
  }

  const normalizedLegalBases = (rawLegalBases as string[]).map(legalBase => legalBase.trim().toUpperCase());
  if (new Set(normalizedLegalBases).size !== normalizedLegalBases.length) {
    throw new HttpException(409, 'The investigation document contains duplicate legal bases');
  }

  if (owner.mode === 'reported-misconduct') {
    const forcedLegalBases = new Set(policy.forcedLegalBases.map(legalBase => legalBase.trim().toUpperCase()));
    const actualLegalBases = new Set(normalizedLegalBases);
    if (actualLegalBases.size !== forcedLegalBases.size || [...forcedLegalBases].some(legalBase => !actualLegalBases.has(legalBase))) {
      throw new HttpException(409, 'The reported-misconduct investigation document must contain exactly the policy-forced legal bases');
    }
  }

  const rules = new Map(policy.legalBaseRules.map(rule => [rule.legalBase.toUpperCase(), rule]));
  const groupByLegalBase = new Map(
    policy.classificationGroups.flatMap(group => group.legalBases.map(legalBase => [legalBase.trim().toUpperCase(), group.key] as const)),
  );
  // The group each category the document's legal bases allow is chosen in.
  const groupByAllowedCategory = new Map<string, string>();
  for (const [index, normalizedLegalBase] of normalizedLegalBases.entries()) {
    const rule = rules.get(normalizedLegalBase);
    const group = groupByLegalBase.get(normalizedLegalBase);
    if (!rule || !group) {
      throw new HttpException(409, `The investigation document contains unsupported legal base ${(rawLegalBases as string[])[index]}`);
    }
    rule.allowedClassificationCategories.forEach(category => groupByAllowedCategory.set(normalizeSupportManagementResourcePath(category), group));
  }

  const groups = classifications.map(classification => {
    const group = groupByAllowedCategory.get(normalizeSupportManagementResourcePath(classification.category));
    if (!group) {
      throw new HttpException(409, 'The requested classification is incompatible with the investigation legal bases');
    }
    return group;
  });
  if (new Set(groups).size !== groups.length) {
    throw new HttpException(409, 'The investigation takes only one classification per legal base group');
  }
  if ([...new Set(groupByAllowedCategory.values())].some(group => !groups.includes(group))) {
    throw new HttpException(409, 'The investigation legal bases require a classification in every legal base group');
  }
  return groups;
};

/**
 * Which of the requested classifications fills the errand's own classification field, which holds only
 * one: the one in the group the policy ranks first. The others are kept as labels.
 */
export const selectErrandClassificationIndex = (
  policy: Pick<IafVofInvestigationClassificationPolicy, 'errandClassificationGroupPriority'>,
  groups: readonly string[],
): number => {
  const rank = (group: string) => {
    const index = policy.errandClassificationGroupPriority.indexOf(group);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return groups.reduce((best, group, index) => (rank(group) < rank(groups[best]) ? index : best), 0);
};
