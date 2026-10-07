import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { describe, expect, test } from 'vitest';

import {
  findLabelByResourcePath,
  findLabelPath,
  getCategorizationStructure,
  getClassificationDepth,
  getClassificationDisplayName,
  getLabelsAtDepth,
  getSelectableGroupedLabels,
  getSelectableTypesForCategory,
  labelCategoryRequiresType,
  replaceCategorizationLabels,
  resolveLabelPath,
  sortLabelsByDisplayName,
} from './support-label-service';
import type { SupportMetadata } from './support-metadata-service';

const label = (id: string, classification: string, labels: Label[] = [], deprecated = false): Label => ({
  id,
  classification,
  resourceName: id,
  resourcePath: id,
  displayName: id,
  labels,
  ...(deprecated && { deprecated }),
});

const subType = (id: string, deprecated = false) => label(id, 'SUBTYPE', [], deprecated);
const type = (id: string, children: Label[] = [], deprecated = false) => label(id, 'TYPE', children, deprecated);
const category = (id: string, types: Label[] = [], deprecated = false) => label(id, 'CATEGORY', types, deprecated);
const department = (id: string, categories: Label[] = [], deprecated = false) =>
  label(id, 'DEPARTMENT', categories, deprecated);

const ids = (labels: Label[] | undefined) => (labels ?? []).map((l) => l.id);

// KS: DEPARTMENT > CATEGORY > TYPE. LOP: CATEGORY > TYPE > SUBTYPE.
const ksTree = () => [
  department('KSK', [category('SERVICE', [type('S1'), type('S2')]), category('LEAF', [])]),
  department('BOU', [category('SCHOOL', [type('B1')])]),
  department('EMPTY', []),
];
const lopTree = () => [
  category('SALARY', [type('PAYSLIP', [subType('MISSING'), subType('WRONG')]), type('OTHER')]),
  category('PENSION', [type('GENERAL')]),
];

describe('getSelectableGroupedLabels', () => {
  test('keeps parents, their children and grandchildren that can be picked', () => {
    const result = getSelectableGroupedLabels(ksTree());

    expect(ids(result)).toEqual(['KSK', 'BOU', 'EMPTY']);
    expect(ids(result[0].labels)).toEqual(['SERVICE', 'LEAF']);
    expect(ids(result[0].labels?.[0].labels)).toEqual(['S1', 'S2']);
  });

  test('drops deprecated parents and children, leaving the levels below to the next combobox', () => {
    const tree = [
      department('OLD', [category('A', [type('A1')])], true),
      department('KSK', [
        category('GONE', [type('G1')], true),
        category('SERVICE', [type('S1'), type('S2', [], true)]),
      ]),
    ];

    const result = getSelectableGroupedLabels(tree);

    expect(ids(result)).toEqual(['KSK']);
    expect(ids(result[0].labels)).toEqual(['SERVICE']);
    expect(ids(result[0].labels?.[0].labels)).toEqual(['S1', 'S2']);
    expect(ids(getSelectableTypesForCategory(result[0].labels?.[0]))).toEqual(['S1']);
  });

  test('keeps childless parents as leaves and drops parents whose children are all deprecated', () => {
    const tree = [
      department('EMPTY', []),
      department('LEAF_ONLY', [category('NO_TYPES', [])]),
      department('ALL_DEPRECATED', [category('C', [type('T')], true)]),
      department('KSK', [category('SERVICE', [type('S1')])]),
    ];

    const result = getSelectableGroupedLabels(tree);

    expect(ids(result)).toEqual(['EMPTY', 'LEAF_ONLY', 'KSK']);
    expect(ids(result[0].labels)).toEqual([]);
    expect(ids(result[1].labels)).toEqual(['NO_TYPES']);
  });

  test('keeps the labels already set on the errand even when deprecated', () => {
    const tree = [
      department('OLD', [category('A', [type('A1'), type('A2')])], true),
      department('KSK', [category('GONE', [type('G1')], true), category('SERVICE', [type('S1')])]),
    ];

    const result = getSelectableGroupedLabels(tree, ['OLD', 'A', 'A1']);

    expect(ids(result)).toEqual(['OLD', 'KSK']);
    expect(ids(result[0].labels)).toEqual(['A']);
    expect(ids(result[1].labels)).toEqual(['SERVICE']);
  });

  test('only keeps the errand labels below a deprecated level above the parents', () => {
    const tree = department('OLD', [category('A', [type('A1'), type('A2')]), category('B', [type('B1')])], true);

    expect(ids(getSelectableTypesForCategory(tree.labels?.[0], ['A1']))).toEqual(['A1', 'A2']);
    const result = getSelectableGroupedLabels(tree.labels, ['A', 'A1'], true);
    expect(ids(result)).toEqual(['A']);
    expect(ids(result[0].labels)).toEqual(['A1']);
  });

  test('is what getSelectableTypesForCategory applies one level down', () => {
    const salary = lopTree()[0];

    const types = getSelectableTypesForCategory(salary);

    expect(ids(types)).toEqual(['PAYSLIP', 'OTHER']);
    expect(ids(types[0].labels)).toEqual(['MISSING', 'WRONG']);
    expect(ids(types[1].labels)).toEqual([]);
  });

  test('does not mutate the metadata', () => {
    const tree = [department('KSK', [category('SERVICE', [type('S1', [], true)])])];
    getSelectableGroupedLabels(tree);
    expect(ids(tree[0].labels?.[0].labels)).toEqual(['S1']);
  });
});

describe('getClassificationDepth and getCategorizationStructure', () => {
  test('finds the CATEGORY level under a department level and at the top', () => {
    expect(getClassificationDepth(ksTree(), 'CATEGORY')).toBe(1);
    expect(getClassificationDepth(lopTree(), 'CATEGORY')).toBe(0);
    expect(getClassificationDepth(lopTree(), 'SUBTYPE')).toBe(2);
    expect(getClassificationDepth(ksTree(), 'SUBTYPE')).toBeUndefined();
    expect(getClassificationDepth(undefined, 'CATEGORY')).toBeUndefined();
  });

  test('leaves the other label sets out of the categorization', () => {
    const tree = [label('TAGS', 'TAG', [label('URGENT', 'TAG')]), ...lopTree(), label('ACCESS', 'ACCESS')];

    expect(ids(getCategorizationStructure(tree))).toEqual(['SALARY', 'PENSION']);
    expect(getCategorizationStructure(undefined)).toEqual([]);
  });
});

describe('findLabelPath and resolveLabelPath', () => {
  test('finds the path to a label at any depth', () => {
    expect(ids(findLabelPath(ksTree(), 'S2'))).toEqual(['KSK', 'SERVICE', 'S2']);
    expect(ids(findLabelPath(ksTree(), 'BOU'))).toEqual(['BOU']);
    expect(ids(findLabelPath(lopTree(), 'WRONG'))).toEqual(['SALARY', 'PAYSLIP', 'WRONG']);
    expect(findLabelPath(ksTree(), 'NOPE')).toEqual([]);
    expect(findLabelPath(ksTree(), undefined)).toEqual([]);
    expect(findLabelPath(undefined, 'S1')).toEqual([]);
  });

  test('resolves the errand labels to the path of the deepest one, in tree order', () => {
    const errandLabels = [type('S1'), department('KSK'), category('SERVICE')].reverse();

    expect(ids(resolveLabelPath(ksTree(), errandLabels))).toEqual(['KSK', 'SERVICE', 'S1']);
    expect(ids(resolveLabelPath(lopTree(), [subType('WRONG'), type('PAYSLIP'), category('SALARY')]))).toEqual([
      'SALARY',
      'PAYSLIP',
      'WRONG',
    ]);
  });

  test('fills in ancestors the errand lacks and ignores labels outside the categorization', () => {
    expect(ids(resolveLabelPath(ksTree(), [category('SCHOOL'), label('ROOT', 'ROOT'), label('X', 'TAG')]))).toEqual([
      'BOU',
      'SCHOOL',
    ]);
    expect(resolveLabelPath(ksTree(), [label('ROOT', 'ROOT')])).toEqual([]);
    expect(resolveLabelPath(ksTree(), [type('DELETED')])).toEqual([]);
    expect(resolveLabelPath(ksTree(), undefined)).toEqual([]);
  });
});

describe('labelCategoryRequiresType', () => {
  const metadata = { labels: { labelStructure: ksTree() } } as unknown as SupportMetadata;

  test('requires a type unless the category is a leaf', () => {
    expect(labelCategoryRequiresType(metadata, 'SERVICE')).toBe(true);
    expect(labelCategoryRequiresType(metadata, 'LEAF')).toBe(false);
    expect(labelCategoryRequiresType(metadata, 'EMPTY')).toBe(false);
  });

  test('requires a type for unknown categories and missing metadata', () => {
    expect(labelCategoryRequiresType(metadata, 'NOPE')).toBe(true);
    expect(labelCategoryRequiresType(metadata, undefined)).toBe(true);
    expect(labelCategoryRequiresType(undefined, 'LEAF')).toBe(true);
  });

  test('finds labels at any depth by resource path', () => {
    expect(findLabelByResourcePath(metadata.labels?.labelStructure, 'S1')?.classification).toBe('TYPE');
    expect(findLabelByResourcePath(metadata.labels?.labelStructure, 'KSK')?.classification).toBe('DEPARTMENT');
  });
});

describe('getLabelsAtDepth and getClassificationDisplayName', () => {
  test('flattens the labels at a depth across the whole structure', () => {
    const tree = ksTree();
    expect(ids(getLabelsAtDepth(tree, 1))).toEqual(['KSK', 'BOU', 'EMPTY']);
    expect(ids(getLabelsAtDepth(tree, 2))).toEqual(['SERVICE', 'LEAF', 'SCHOOL']);
    expect(ids(getLabelsAtDepth(tree, 3))).toEqual(['S1', 'S2', 'B1']);
    expect(getLabelsAtDepth(tree, 4)).toEqual([]);
    expect(getLabelsAtDepth(undefined, 1)).toEqual([]);
  });

  test('uses the first classificationDisplayName found, otherwise the fallback', () => {
    const named = [type('T1'), { ...type('T2'), classificationDisplayName: 'Ärendetyp' }];
    expect(getClassificationDisplayName(named, 'Typ')).toBe('Ärendetyp');
    expect(getClassificationDisplayName([type('T1')], 'Typ')).toBe('Typ');
    expect(getClassificationDisplayName([], 'Typ')).toBe('Typ');
  });
});

describe('sortLabelsByDisplayName', () => {
  test('sorts a copy by display name', () => {
    const labels = [label('b', 'TYPE'), label('a', 'TYPE'), { ...label('c', 'TYPE'), displayName: undefined }];
    const sorted = sortLabelsByDisplayName(labels);
    expect(sorted.map((l) => l.id)).toEqual(['c', 'a', 'b']);
    expect(labels.map((l) => l.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('replaceCategorizationLabels', () => {
  test('replaces the categorization of the errand and keeps its other labels', () => {
    const errandLabels = [label('ROOT', 'ROOT'), department('KSK'), category('SERVICE'), type('S1'), label('X', 'TAG')];

    expect(ids(replaceCategorizationLabels(errandLabels, [department('BOU'), category('SCHOOL'), type('B1')]))).toEqual(
      ['ROOT', 'X', 'BOU', 'SCHOOL', 'B1']
    );
  });

  test('gives just the path for an errand without labels', () => {
    expect(ids(replaceCategorizationLabels([], [category('SALARY'), type('PAYSLIP')]))).toEqual(['SALARY', 'PAYSLIP']);
    expect(ids(replaceCategorizationLabels(undefined, [category('SALARY')]))).toEqual(['SALARY']);
  });
});
