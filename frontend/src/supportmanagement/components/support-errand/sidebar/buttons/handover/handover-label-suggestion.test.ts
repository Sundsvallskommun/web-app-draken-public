import { Label, LabelMapping, MatchReason } from '@common/data-contracts/supportmanagement/data-contracts';
import { describe, expect, test } from 'vitest';

import { getHandoverLabelSuggestion, isHandoverLabelSuggestionPicked } from './handover-label-suggestion';

// Resource paths deliberately unrelated to the ids: suggestions are resolved by id, never by path.
const label = (id: string, classification: string, labels: Label[] = [], deprecated = false): Label => ({
  id,
  classification,
  resourceName: `NAME_${id}`,
  resourcePath: `PATH/${id}`,
  displayName: id,
  labels,
  ...(deprecated && { deprecated }),
});

const type = (id: string, children: Label[] = [], deprecated = false) => label(id, 'TYPE', children, deprecated);
const category = (id: string, types: Label[] = [], deprecated = false) => label(id, 'CATEGORY', types, deprecated);
const department = (id: string, categories: Label[] = []) => label(id, 'DEPARTMENT', categories);

const suggestion = (suggestedTargetId?: string, matchReason?: MatchReason): LabelMapping => ({
  sourceId: `source-${suggestedTargetId}`,
  suggestedTargetId,
  matchReason,
});

const ids = (labels: Label[] | undefined) => (labels ?? []).map((l) => l.id);

// LOP: CATEGORY > TYPE. KS: DEPARTMENT > CATEGORY > TYPE.
const lopTree = () => [
  category('SALARY', [type('PAYSLIP'), type('OTHER')]),
  category('PENSION', [type('GENERAL')]),
  category('OLD', [type('LEGACY')], true),
];
const ksTree = () => [department('KSK', [category('SERVICE', [type('S1')])])];

describe('getHandoverLabelSuggestion', () => {
  test('suggests the path to the deepest suggested label, with its match reason', () => {
    const result = getHandoverLabelSuggestion(lopTree(), [
      suggestion('SALARY', MatchReason.DISPLAY_NAME_EXACT),
      suggestion('PAYSLIP', MatchReason.RESOURCE_PATH_MATCH),
    ]);

    expect(ids(result?.path)).toEqual(['SALARY', 'PAYSLIP']);
    expect(result?.matchReason).toBe(MatchReason.RESOURCE_PATH_MATCH);
  });

  test('keeps the first suggestion when two are equally deep, even from different branches', () => {
    const result = getHandoverLabelSuggestion(lopTree(), [suggestion('GENERAL'), suggestion('PAYSLIP')]);

    expect(ids(result?.path)).toEqual(['PENSION', 'GENERAL']);
  });

  test('suggests a path that stops at a category, leaving the type to the user', () => {
    expect(ids(getHandoverLabelSuggestion(lopTree(), [suggestion('PENSION')])?.path)).toEqual(['PENSION']);
  });

  test('ignores a path that stops above the first selectable level', () => {
    expect(getHandoverLabelSuggestion(ksTree(), [suggestion('KSK')])).toBeUndefined();
    expect(ids(getHandoverLabelSuggestion(ksTree(), [suggestion('KSK'), suggestion('SERVICE')])?.path)).toEqual([
      'KSK',
      'SERVICE',
    ]);
  });

  test('ignores a path through a deprecated label', () => {
    expect(getHandoverLabelSuggestion(lopTree(), [suggestion('LEGACY')])).toBeUndefined();
    expect(ids(getHandoverLabelSuggestion(lopTree(), [suggestion('LEGACY'), suggestion('OTHER')])?.path)).toEqual([
      'SALARY',
      'OTHER',
    ]);
  });

  test('ignores suggestions that do not resolve in the categorization tree', () => {
    const treeWithRoot = [label('ROOT', 'ROOT', lopTree()), ...lopTree()];

    expect(getHandoverLabelSuggestion(treeWithRoot, [suggestion('ROOT')])).toBeUndefined();
    expect(getHandoverLabelSuggestion(lopTree(), [suggestion('OTHER_NAMESPACE_LABEL')])).toBeUndefined();
    expect(getHandoverLabelSuggestion(lopTree(), [suggestion(undefined)])).toBeUndefined();
    expect(getHandoverLabelSuggestion(lopTree(), [])).toBeUndefined();
    expect(getHandoverLabelSuggestion(lopTree(), undefined)).toBeUndefined();
    expect(getHandoverLabelSuggestion(undefined, [suggestion('PAYSLIP')])).toBeUndefined();
  });
});

describe('isHandoverLabelSuggestionPicked', () => {
  const suggested = { path: [category('SALARY'), type('PAYSLIP')] };

  test('is true only when the picked path is exactly the suggested one', () => {
    expect(isHandoverLabelSuggestionPicked(suggested, [category('SALARY'), type('PAYSLIP')])).toBe(true);
    expect(isHandoverLabelSuggestionPicked(suggested, [category('SALARY'), type('OTHER')])).toBe(false);
    expect(isHandoverLabelSuggestionPicked(suggested, [category('SALARY')])).toBe(false);
    expect(isHandoverLabelSuggestionPicked(suggested, [])).toBe(false);
    expect(isHandoverLabelSuggestionPicked(undefined, [])).toBe(false);
  });
});
