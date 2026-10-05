import { Label, MetadataResponse } from '@/data-contracts/supportmanagement/data-contracts';
import { selectCategorizationLabels, withCategorizationLabels } from '@/utils/categorization-labels';

const label = (classification: string, resourceName: string, labels: Label[] = []): Label => ({ classification, resourceName, labels });

const department = () => label('DEPARTMENT', 'KSK', [label('CATEGORY', 'SERVICE_CENTER', [label('TYPE', 'GENERAL')])]);
const tagRoot = () => label('ROOT', 'TAGROOT', [label('TAG', 'INTERNAL_INSPECTION')]);
const categorizationRoot = () => label('ROOT', 'CATEGORIZATION_ROOT', [department()]);

const status = (fn: () => unknown): number | undefined => {
  try {
    fn();
    return undefined;
  } catch (e) {
    return (e as { status?: number }).status;
  }
};

describe('selectCategorizationLabels', () => {
  it('returns the levels below the configured root and leaves the other roots out', () => {
    const subtree = selectCategorizationLabels([tagRoot(), categorizationRoot()], 'CATEGORIZATION_ROOT');

    expect(subtree?.map(entry => entry.resourceName)).toEqual(['KSK']);
    expect(subtree?.[0].labels?.[0].labels?.[0].resourceName).toBe('GENERAL');
  });

  it('leaves a structure without roots untouched, whether or not a root is configured', () => {
    const structure = [department()];

    expect(selectCategorizationLabels(structure, 'CATEGORIZATION_ROOT')).toBe(structure);
    expect(selectCategorizationLabels(structure, undefined)).toBe(structure);
    expect(selectCategorizationLabels(undefined, undefined)).toBeUndefined();
  });

  it('fails with 500 when the structure has roots but no root is configured', () => {
    expect(status(() => selectCategorizationLabels([categorizationRoot()], undefined))).toBe(500);
  });

  it('fails with 502 when the configured root is missing or duplicated', () => {
    expect(status(() => selectCategorizationLabels([tagRoot()], 'CATEGORIZATION_ROOT'))).toBe(502);
    expect(status(() => selectCategorizationLabels([categorizationRoot(), categorizationRoot()], 'CATEGORIZATION_ROOT'))).toBe(502);
  });

  it('only matches roots by resourceName, not by resourcePath or displayName', () => {
    const root: Label = { ...categorizationRoot(), resourceName: 'OTHER', resourcePath: 'CATEGORIZATION_ROOT', displayName: 'CATEGORIZATION_ROOT' };

    expect(status(() => selectCategorizationLabels([root], 'CATEGORIZATION_ROOT'))).toBe(502);
  });
});

describe('withCategorizationLabels', () => {
  it('keeps the rest of the metadata and the labels object as is', () => {
    const metadata = { categories: [{ name: 'A' }], labels: { created: 'now', labelStructure: [department()] } };

    const result = withCategorizationLabels(metadata, 'CATEGORIZATION_ROOT');

    expect(result.categories).toBe(metadata.categories);
    expect(result.labels.created).toBe('now');
    expect(result.labels.labelStructure).toBe(metadata.labels.labelStructure);
    expect(withCategorizationLabels({ categories: [] } as MetadataResponse, undefined)).toEqual({ categories: [] });
  });

  it('replaces the structure with the levels below the given root', () => {
    const metadata = { labels: { labelStructure: [tagRoot(), categorizationRoot()] } };

    const result = withCategorizationLabels(metadata, 'CATEGORIZATION_ROOT');

    expect(result.labels.labelStructure?.map(entry => entry.resourceName)).toEqual(['KSK']);
    expect(status(() => withCategorizationLabels(metadata, undefined))).toBe(500);
  });
});
