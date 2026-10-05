import { describe, expect, it } from 'vitest';

import { Label } from '@/data-contracts/supportmanagement/data-contracts';
import { withCategorizationLabels } from '@/utils/categorization-labels';

const label = (classification: string, resourceName: string, resourcePath: string, labels: Label[] = []): Label => ({
  classification,
  resourceName,
  resourcePath,
  displayName: resourceName,
  labels,
});

const ksk = () =>
  label('DEPARTMENT', 'KSK', 'CATEGORIZATION_ROOT/KSK', [
    label('CATEGORY', 'KONTAKT_SUNDSVALL', 'CATEGORIZATION_ROOT/KSK/KONTAKT_SUNDSVALL', [
      label('TYPE', 'SILENT_CALL', 'CATEGORIZATION_ROOT/KSK/KONTAKT_SUNDSVALL/SILENT_CALL'),
    ]),
  ]);

const tagRoot = () => label('ROOT', 'TAGROOT', 'TAGROOT', [label('TAG', 'INTERNAL_INSPECTION', 'TAGROOT/INTERNAL_INSPECTION')]);

const categorizationRoot = (children: Label[] = [ksk()]) => ({
  ...label('ROOT', 'CATEGORIZATION_ROOT', 'CATEGORIZATION_ROOT', children),
  classificationDisplayName: 'Kategorisering',
});

interface Metadata {
  categories?: unknown[];
  labels?: { labelStructure?: Label[]; classificationDisplayName?: string };
}

const metadataWith = (labelStructure: Label[]): Metadata => ({ categories: [], labels: { labelStructure } });

describe('withCategorizationLabels', () => {
  it('hands on a structure without root labels untouched', () => {
    const metadata = metadataWith([
      label('CATEGORY', 'ADMINISTRATION', 'ADMINISTRATION', [label('TYPE', 'PERMISSION', 'ADMINISTRATION/PERMISSION')]),
    ]);

    expect(withCategorizationLabels(metadata)).toBe(metadata);
  });

  it('hands on metadata without labels untouched', () => {
    const metadata: Metadata = { categories: [] };

    expect(withCategorizationLabels(metadata)).toBe(metadata);
  });

  it('keeps only the labels below the categorization root', () => {
    const result = withCategorizationLabels(metadataWith([tagRoot(), categorizationRoot()]));

    expect(result.labels?.labelStructure?.map(department => department.resourcePath)).toEqual(['CATEGORIZATION_ROOT/KSK']);
    expect(result.labels?.labelStructure?.[0].labels?.[0].labels?.[0].resourceName).toBe('SILENT_CALL');
    expect(result.categories).toEqual([]);
  });

  it("hands on the root's classification display name", () => {
    const result = withCategorizationLabels(metadataWith([categorizationRoot()]));

    expect(result.labels?.classificationDisplayName).toBe('Kategorisering');
  });

  it('fails when roots exist but none of them is the categorization root', () => {
    expect(() => withCategorizationLabels(metadataWith([tagRoot()]))).toThrow(/found 0/);
  });

  it('fails when the categorization root is ambiguous', () => {
    expect(() => withCategorizationLabels(metadataWith([categorizationRoot(), categorizationRoot()]))).toThrow(/found 2/);
  });

  it('fails when the tree is deeper than the categorization can render', () => {
    const tooDeep = categorizationRoot([
      label('DEPARTMENT', 'KSK', 'CATEGORIZATION_ROOT/KSK', [
        label('CATEGORY', 'C', 'CATEGORIZATION_ROOT/KSK/C', [
          label('TYPE', 'T', 'CATEGORIZATION_ROOT/KSK/C/T', [label('EXTRA', 'X', 'CATEGORIZATION_ROOT/KSK/C/T/X')]),
        ]),
      ]),
    ]);

    expect(() => withCategorizationLabels(metadataWith([tooDeep]))).toThrow(/4 levels deep/);
  });
});
