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
 * Enforces the policy-owned legal-base invariant at the backend write boundary.
 * Metadata still resolves the complete CATEGORY path; this rule decides which
 * owning category paths are allowed by the exact versioned document.
 */
export const assertSupportInvestigationClassificationContext = (
  policy: IafVofInvestigationClassificationPolicy,
  owner: IafVofInvestigationClassificationOwnerSelection,
  documentKey: string,
  documentValue: JsonObject,
  classification: RequestedClassification,
): void => {
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
  const allowedCategories = new Set<string>();
  for (const [index, normalizedLegalBase] of normalizedLegalBases.entries()) {
    const rule = rules.get(normalizedLegalBase);
    if (!rule) {
      throw new HttpException(409, `The investigation document contains unsupported legal base ${(rawLegalBases as string[])[index]}`);
    }
    rule.allowedClassificationCategories.forEach(category => allowedCategories.add(normalizeSupportManagementResourcePath(category)));
  }

  if (!allowedCategories.has(normalizeSupportManagementResourcePath(classification.category))) {
    throw new HttpException(409, 'The requested classification is incompatible with the investigation legal bases');
  }
};
