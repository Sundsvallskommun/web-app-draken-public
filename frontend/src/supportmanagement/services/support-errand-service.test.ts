import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { appConfig } from '@config/appconfig';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getClassificationCategoryDisplayName,
  getClassificationTypeDisplayName,
  getSupportErrandById,
  SupportErrand,
  supportErrandIsEmpty,
  updateSupportErrand,
} from './support-errand-service';
import { SupportMetadata } from './support-metadata-service';

vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn(), patch: vi.fn() } }));
// Not used here, and importing them pulls in UI modules with a circular dependency.
vi.mock('./support-attachment-service', () => ({}));
vi.mock('./support-message-service', () => ({}));

const categoryLabel = {
  id: 'category-id',
  classification: 'CATEGORY',
  resourceName: 'PENSION',
  resourcePath: 'PENSION',
};
const typeLabel = {
  id: 'type-id',
  classification: 'TYPE',
  resourceName: 'STATISTICS',
  resourcePath: 'PENSION/STATISTICS',
};
const subTypeLabel = {
  id: 'subtype-id',
  classification: 'SUBTYPE',
  resourceName: 'REPORT',
  resourcePath: 'PENSION/STATISTICS/REPORT',
};
const legacyClassification = { category: 'SALARY', type: 'SALARY.UNCATEGORIZED' };

const givenErrand = (errand: object) =>
  vi.mocked(apiService.get).mockResolvedValue({ data: { id: 'errand-1', stakeholders: [], ...errand } } as never);

const fetchErrand = async () => (await getSupportErrandById('errand-1', '2281')).errand;

const patchedBody = () => vi.mocked(apiService.patch).mock.calls[0]?.[1] as Record<string, unknown>;

const saveErrand = () =>
  updateSupportErrand('2281', {
    id: 'errand-1',
    category: 'PENSION',
    type: 'PENSION/STATISTICS',
    labels: [categoryLabel, typeLabel] as Label[],
  });

const useCategorization = ({ threeLevel = false, labels = false }) => {
  appConfig.features.useThreeLevelCategorization = threeLevel;
  appConfig.features.useLabelsCategorization = labels;
};

const { useThreeLevelCategorization, useLabelsCategorization } = appConfig.features;

beforeEach(() => {
  vi.mocked(apiService.get).mockReset();
  vi.mocked(apiService.patch)
    .mockReset()
    .mockResolvedValue({ data: {} } as never);
});

afterEach(() => {
  useCategorization({ threeLevel: useThreeLevelCategorization, labels: useLabelsCategorization });
});

describe('three-level categorization', () => {
  beforeEach(() => {
    useCategorization({ threeLevel: true });
  });

  test('takes category, type and subtype from the labels of an errand without classification', async () => {
    givenErrand({ classification: { category: null, type: null }, labels: [categoryLabel, typeLabel, subTypeLabel] });

    const errand = await fetchErrand();

    expect(errand.category).toBe('PENSION');
    expect(errand.type).toBe('PENSION/STATISTICS');
    expect(errand.subType).toBe('PENSION/STATISTICS/REPORT');
    expect(supportErrandIsEmpty(errand)).toBe(false);
  });

  test('falls back to the classification for an errand registered before the switch to labels', async () => {
    givenErrand({ classification: legacyClassification, labels: [] });

    const errand = await fetchErrand();

    expect(errand.category).toBe('SALARY');
    expect(errand.type).toBe('SALARY.UNCATEGORIZED');
    expect(supportErrandIsEmpty(errand)).toBe(false);
  });

  test('treats an errand without labels or classification as empty', async () => {
    givenErrand({ classification: { category: null, type: null }, labels: [] });

    expect(supportErrandIsEmpty(await fetchErrand())).toBe(true);
  });

  test('saves the labels without a classification', async () => {
    await saveErrand();

    expect(patchedBody()).not.toHaveProperty('classification');
    expect(patchedBody().labels).toEqual([categoryLabel, typeLabel]);
  });
});

describe('labels categorization', () => {
  beforeEach(() => {
    useCategorization({ labels: true });
  });

  test('leaves category, type and subtype to the categorization', async () => {
    givenErrand({ classification: legacyClassification, labels: [categoryLabel, typeLabel, subTypeLabel] });

    const errand = await fetchErrand();

    expect(errand.category).toBe('');
    expect(errand.type).toBe('');
    expect(errand.subType).toBe('');
    expect(supportErrandIsEmpty(errand)).toBe(false);
  });

  test('treats an errand registered before the switch to labels as registered', async () => {
    givenErrand({ classification: legacyClassification, labels: [] });

    expect(supportErrandIsEmpty(await fetchErrand())).toBe(false);
  });

  test('treats an errand without labels or classification as empty', async () => {
    givenErrand({ classification: { category: null, type: null }, labels: [] });

    expect(supportErrandIsEmpty(await fetchErrand())).toBe(true);
  });

  test('saves the labels without a classification', async () => {
    await saveErrand();

    expect(patchedBody()).not.toHaveProperty('classification');
  });
});

describe('classification display names', () => {
  const metadata = {
    categories: [
      { name: 'SALARY', displayName: 'Lön', types: [{ name: 'SALARY.UNCATEGORIZED', displayName: 'Okategoriserat' }] },
    ],
  } as unknown as SupportMetadata;
  const errandWith = (classification: object) => ({ classification } as unknown as SupportErrand);

  test('resolves the category and type against the categories of the namespace', () => {
    const errand = errandWith(legacyClassification);

    expect(getClassificationCategoryDisplayName(errand, metadata)).toBe('Lön');
    expect(getClassificationTypeDisplayName(errand, metadata)).toBe('Okategoriserat');
  });

  test('shows the raw value when the categories do not describe it', () => {
    const errand = errandWith({ category: 'CONTACT_SUNDSVALL', type: 'UNCATEGORIZED' });

    expect(getClassificationCategoryDisplayName(errand, metadata)).toBe('CONTACT_SUNDSVALL');
    expect(getClassificationTypeDisplayName(errand, metadata)).toBe('UNCATEGORIZED');
  });

  test('shows nothing for a missing or NONE classification', () => {
    expect(getClassificationCategoryDisplayName(errandWith({ category: 'NONE', type: 'NONE' }), metadata)).toBe('');
    expect(getClassificationTypeDisplayName(errandWith({}), metadata)).toBe('');
  });
});

describe('classification-based applications', () => {
  beforeEach(() => {
    useCategorization({});
  });

  test('takes category and type from the classification and ignores labels', async () => {
    givenErrand({ classification: legacyClassification, labels: [categoryLabel, typeLabel] });

    const errand = await fetchErrand();

    expect(errand.category).toBe('SALARY');
    expect(errand.type).toBe('SALARY.UNCATEGORIZED');
    expect(errand.subType).toBe('');
  });

  test('treats a NONE classification as empty', async () => {
    givenErrand({ classification: { category: 'NONE', type: 'NONE' }, labels: [] });

    expect(supportErrandIsEmpty(await fetchErrand())).toBe(true);
  });

  test('saves the classification', async () => {
    await saveErrand();

    expect(patchedBody().classification).toEqual({ category: 'PENSION', type: 'PENSION/STATISTICS' });
  });
});
