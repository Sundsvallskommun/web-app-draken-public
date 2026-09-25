import { describe, expect, it } from 'vitest';

import { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { selectCategorizationLabels, withCategorizationLabels } from '@/utils/categorization-labels';

const label = (classification: string, resourceName: string, resourcePath: string, labels: Label[] = []): Label => ({
  classification,
  resourceName,
  resourcePath,
  displayName: resourceName,
  labels,
});

const alcohol = () =>
  label('CATEGORY', 'ALCOHOL', 'CATEGORYROOT/ALCOHOL', [
    label('TYPE', 'SERVING_PERMIT_APPLICATION', 'CATEGORYROOT/ALCOHOL/SERVING_PERMIT_APPLICATION', [
      label('SUBTYPE', 'PERMANENT_SERVING', 'CATEGORYROOT/ALCOHOL/SERVING_PERMIT_APPLICATION/PERMANENT_SERVING'),
    ]),
  ]);

const tagRoot = () => label('ROOT', 'TAGROOT', 'TAGROOT', [label('TAG', 'INTERNAL_INSPECTION', 'TAGROOT/INTERNAL_INSPECTION')]);

const categoryRoot = (children: Label[] = [alcohol()]) => label('ROOT', 'CATEGORYROOT', 'CATEGORYROOT', children);

const rootedStructure = (): Label[] => [tagRoot(), categoryRoot()];

const rootlessStructure = (): Label[] => [
  label('CATEGORY', 'ADMINISTRATION', 'ADMINISTRATION', [label('TYPE', 'PERMISSION', 'ADMINISTRATION/PERMISSION')]),
];

describe('selectCategorizationLabels', () => {
  it('leaves a structure without root nodes untouched', () => {
    const structure = rootlessStructure();

    expect(selectCategorizationLabels(structure)).toBe(structure);
  });

  it('leaves an undefined structure untouched', () => {
    expect(selectCategorizationLabels(undefined)).toBeUndefined();
  });

  it('returns the children of the categorization root', () => {
    const subtree = selectCategorizationLabels(rootedStructure());

    expect(subtree?.map(entry => entry.resourceName)).toEqual(['ALCOHOL']);
  });

  it('keeps the free tags out of what the frontend sees', () => {
    const subtree = selectCategorizationLabels(rootedStructure());

    expect(JSON.stringify(subtree)).not.toContain('TAGROOT');
  });

  it('keeps the levels below the category', () => {
    const [category] = selectCategorizationLabels(rootedStructure()) ?? [];
    const [type] = category.labels ?? [];

    expect(type.resourceName).toBe('SERVING_PERMIT_APPLICATION');
    expect(type.labels?.[0].resourceName).toBe('PERMANENT_SERVING');
  });

  it('fails when roots exist but none of them is the categorization root', () => {
    expect(() => selectCategorizationLabels([tagRoot()])).toThrow(/found 0/);
  });

  it('fails when the categorization root is ambiguous', () => {
    expect(() => selectCategorizationLabels([categoryRoot(), categoryRoot()])).toThrow(/found 2/);
  });

  it('fails when the tree is deeper than the categorization can render', () => {
    const tooDeep = categoryRoot([
      label('CATEGORY', 'ALCOHOL', 'CATEGORYROOT/ALCOHOL', [
        label('TYPE', 'T', 'CATEGORYROOT/ALCOHOL/T', [
          label('SUBTYPE', 'S', 'CATEGORYROOT/ALCOHOL/T/S', [label('EXTRA', 'X', 'CATEGORYROOT/ALCOHOL/T/S/X')]),
        ]),
      ]),
    ]);

    expect(() => selectCategorizationLabels([tooDeep])).toThrow(/4 levels deep/);
  });
});

describe('withCategorizationLabels', () => {
  it('replaces only the label structure', () => {
    const metadata = { statuses: [{ name: 'NEW' }], labels: { labelStructure: rootedStructure() } };

    const result = withCategorizationLabels(metadata);

    expect(result.statuses).toBe(metadata.statuses);
    expect(result.labels.labelStructure?.map(entry => entry.resourceName)).toEqual(['ALCOHOL']);
  });

  it('leaves metadata without a label structure untouched', () => {
    const metadata = { statuses: [{ name: 'NEW' }], labels: {} };

    expect(withCategorizationLabels(metadata)).toBe(metadata);
  });
});
