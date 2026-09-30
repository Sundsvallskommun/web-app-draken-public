import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { appConfig } from '@config/appconfig';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getClassificationCategoryDisplayName,
  getClassificationTypeDisplayName,
  getLabelCategory,
  getLabelSubType,
  getLabelType,
  getLabelTypeOrCategory,
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

const useThreeLevelCategorization = appConfig.features.useThreeLevelCategorization;

beforeEach(() => {
  vi.mocked(apiService.get).mockReset();
  vi.mocked(apiService.patch)
    .mockReset()
    .mockResolvedValue({ data: {} } as never);
});

afterEach(() => {
  appConfig.features.useThreeLevelCategorization = useThreeLevelCategorization;
});

describe('label-based applications', () => {
  beforeEach(() => {
    appConfig.features.useThreeLevelCategorization = true;
  });

  test('leaves category, type and subtype to the categorization instead of reading the classification', async () => {
    givenErrand({
      classification: { category: 'SALARY', type: 'SALARY.UNCATEGORIZED' },
      labels: [categoryLabel, typeLabel, subTypeLabel],
    });

    const errand = await fetchErrand();

    expect(errand.category).toBe('');
    expect(errand.type).toBe('');
    expect(errand.subType).toBe('');
    expect(supportErrandIsEmpty(errand)).toBe(false);
  });

  test('treats an errand with labels as registered', async () => {
    givenErrand({ classification: { category: null, type: null }, labels: [categoryLabel, typeLabel] });

    expect(supportErrandIsEmpty(await fetchErrand())).toBe(false);
  });

  test('treats an errand registered before the switch to labels as registered', async () => {
    givenErrand({ classification: { category: 'SALARY', type: 'SALARY.UNCATEGORIZED' }, labels: [] });

    expect(supportErrandIsEmpty(await fetchErrand())).toBe(false);
  });

  test('treats an errand without labels or classification as empty', async () => {
    givenErrand({ classification: { category: null, type: null }, labels: [] });

    expect(supportErrandIsEmpty(await fetchErrand())).toBe(true);
  });

  test('resolves verksamhet, ärendetyp and undertyp by their level in the label tree', async () => {
    // KC names its levels DEPARTMENT/CATEGORY/TYPE rather than CATEGORY/TYPE/SUBTYPE.
    const silentCall = { id: 'silent-call', classification: 'TYPE', resourcePath: 'KSK/KONTAKT_SUNDSVALL/SILENT_CALL' };
    const kontaktSundsvall = {
      id: 'kontakt-sundsvall',
      classification: 'CATEGORY',
      resourcePath: 'KSK/KONTAKT_SUNDSVALL',
    };
    const ksk = { id: 'ksk', classification: 'DEPARTMENT', resourcePath: 'KSK' };
    const metadata = {
      labels: { labelStructure: [{ ...ksk, labels: [{ ...kontaktSundsvall, labels: [silentCall] }] }] },
    } as unknown as SupportMetadata;
    givenErrand({ labels: [silentCall, kontaktSundsvall, ksk] });

    const errand = await fetchErrand();

    expect(getLabelCategory(errand, metadata)?.id).toBe('ksk');
    expect(getLabelType(errand, metadata)?.id).toBe('kontakt-sundsvall');
    expect(getLabelSubType(errand, metadata)?.id).toBe('silent-call');
  });

  test('names the verksamhet when the errand has no ärendetyp', () => {
    const tradeUnion = { id: 'trade-union', classification: 'DEPARTMENT', resourcePath: 'TRADE_UNION' };
    const pensionStatistics = { id: 'statistics', classification: 'TYPE', resourcePath: 'PENSION/STATISTICS' };
    const pension = { id: 'pension', classification: 'CATEGORY', resourcePath: 'PENSION' };
    const metadata = {
      labels: { labelStructure: [tradeUnion, { ...pension, labels: [pensionStatistics] }] },
    } as unknown as SupportMetadata;
    const errandWithLabels = (labels: object[]) => ({ labels } as unknown as SupportErrand);

    expect(getLabelTypeOrCategory(errandWithLabels([tradeUnion]), metadata)?.id).toBe('trade-union');
    expect(getLabelTypeOrCategory(errandWithLabels([pension, pensionStatistics]), metadata)?.id).toBe('statistics');
    expect(getLabelTypeOrCategory(errandWithLabels([]), metadata)).toBeUndefined();
  });

  test('saves the labels without a classification', async () => {
    await saveErrand();

    expect(patchedBody()).not.toHaveProperty('classification');
    expect(patchedBody().labels).toEqual([categoryLabel, typeLabel]);
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
    const errand = errandWith({ category: 'SALARY', type: 'SALARY.UNCATEGORIZED' });

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
    appConfig.features.useThreeLevelCategorization = false;
  });

  test('takes category and type from the classification and ignores labels', async () => {
    givenErrand({
      classification: { category: 'SALARY', type: 'SALARY.UNCATEGORIZED' },
      labels: [categoryLabel, typeLabel],
    });

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
