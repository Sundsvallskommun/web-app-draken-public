import type { Asset } from '@common/interfaces/asset';
import { getCompanyProfileByPartyId } from '@common/services/legal-entity-service';
import { appConfig } from '@config/appconfig';
import { withAssignments } from '@supportmanagement/services/licensed-business-service';
import {
  getSupportErrands,
  getSupportErrandsCount,
  Status,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getSupportInvestigation } from '@supportmanagement/services/support-investigation-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import {
  CUSTOMER_ERRANDS_PAGE_SIZE,
  CustomerPlace,
  getCustomerByCustomerId,
  getCustomerErrandCounts,
  getCustomerErrands,
  getCustomerInspections,
  getCustomerPlaces,
  getLatestInspection,
  isOtherDrakeCase,
  toCustomerAssets,
} from './customer-service';

vi.mock('@common/services/legal-entity-service', () => ({ getCompanyProfileByPartyId: vi.fn() }));
vi.mock('@supportmanagement/services/licensed-business-service', () => ({ withAssignments: vi.fn() }));
vi.mock('@supportmanagement/services/support-investigation-service', () => ({ getSupportInvestigation: vi.fn() }));
vi.mock('@supportmanagement/services/support-errand-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportErrands: vi.fn(),
  getSupportErrandsCount: vi.fn(),
}));

const MUNICIPALITY_ID = '2281';
const CUSTOMER_ID = mockEnv.mockRestaurantNumberId;
const NUMBER = mockEnv.mockRestaurantNumber;
const OTHER_NUMBER = mockEnv.mockSecondaryRestaurantNumber;
const ASSET_NAME = 'Namn i tillståndet';

const assetWith = (value: unknown) => ({ jsonParameters: [{ key: 'permit', schemaId: 'schema', value }] });
const ASSET_VALID_FROM = '2020-06-15';
const alcoholAsset = (restaurantNumber: string) =>
  assetWith({ premises: { name: ASSET_NAME, restaurantNumber }, decision: { validFrom: ASSET_VALID_FROM } });
const assetPlace = {
  key: mockEnv.mockRestaurantNumber,
  restaurantNumber: mockEnv.mockRestaurantNumber,
  name: ASSET_NAME,
  validFrom: ASSET_VALID_FROM,
  assetTypes: [],
  activeAssets: 0,
  assets: expect.any(Array),
};

let givenAssetList: Asset[] = [];
const givenAssets = (assets: unknown[]) => {
  givenAssetList = assets as Asset[];
};
const givenAssignments = (assignments: unknown[]) =>
  vi.mocked(withAssignments).mockResolvedValue(assignments.map((assignment) => ({ assignment })) as never);

beforeEach(() => {
  vi.mocked(withAssignments).mockReset();
  appConfig.features.useLicensedBusiness = true;
});

describe('getCustomerByCustomerId', () => {
  test.each([
    ['aktiebolag', 'Aktiebolag'],
    ['EKONOMISK FÖRENING', 'Ekonomisk Förening'],
  ])('title cases the company form %s', async (form, expected) => {
    vi.mocked(getCompanyProfileByPartyId).mockResolvedValue({ form });

    const customer = await getCustomerByCustomerId(CUSTOMER_ID);

    expect(customer.form).toBe(expected);
    expect(customer.profile.form).toBe(expected);
  });
});

describe('getCustomerPlaces', () => {
  test('names a place from the register', async () => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([{ premisesName: mockEnv.mockPremisesName, validFrom: '2019-01-01' }]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, givenAssetList)).toEqual([
      { ...assetPlace, name: mockEnv.mockPremisesName },
    ]);
    expect(withAssignments).toHaveBeenCalledWith(MUNICIPALITY_ID, [{ number: NUMBER }]);
  });

  test('falls back to the asset name when the register has no assignment', async () => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([null]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, givenAssetList)).toEqual([assetPlace]);
  });

  test.each([
    ['started after the asset', { validFrom: '2021-01-01' }],
    ['ended before the asset', { validFrom: '2019-01-01', validTo: '2020-06-14' }],
  ])('ignores an assignment that %s', async (_, period) => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([{ premisesName: mockEnv.mockPremisesName, ...period }]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, givenAssetList)).toEqual([assetPlace]);
  });

  test.each([
    ['starts', { validFrom: ASSET_VALID_FROM }],
    ['ends', { validFrom: '2019-01-01', validTo: ASSET_VALID_FROM }],
  ])('uses an assignment that %s on the day the asset starts', async (_, period) => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([{ premisesName: mockEnv.mockPremisesName, ...period }]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, givenAssetList)).toEqual([
      { ...assetPlace, name: mockEnv.mockPremisesName },
    ]);
  });

  test('ignores the assignment when the asset has no start date', async () => {
    givenAssets([assetWith({ premises: { name: ASSET_NAME, restaurantNumber: NUMBER } })]);
    givenAssignments([{ premisesName: mockEnv.mockPremisesName, validFrom: '2019-01-01' }]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, givenAssetList)).toEqual([{ ...assetPlace, validFrom: undefined }]);
  });

  test('lists a number once and skips assets without one', async () => {
    givenAssets([
      alcoholAsset(NUMBER),
      alcoholAsset(NUMBER),
      alcoholAsset(OTHER_NUMBER),
      assetWith({ pointOfSale: {} }),
    ]);
    givenAssignments([null, null]);

    const places = await getCustomerPlaces(MUNICIPALITY_ID, givenAssetList);

    expect(places.map((place) => place.restaurantNumber)).toEqual([NUMBER, OTHER_NUMBER]);
  });

  test('merges a place named on several assets and counts its active ones', async () => {
    const site = { name: ASSET_NAME, address: { street: 'Testgatan 1' } };
    givenAssets([
      { ...assetWith({ pointOfSale: site }), type: 'TobaccoSalesPermit', status: 'ACTIVE' },
      { ...assetWith({ premises: site }), type: 'LowAlcoholBeerSalesNotification', status: 'EXPIRED' },
    ]);
    givenAssignments([]);

    const places = await getCustomerPlaces(MUNICIPALITY_ID, givenAssetList);

    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      assetTypes: ['TobaccoSalesPermit', 'LowAlcoholBeerSalesNotification'],
      activeAssets: 1,
      assets: givenAssetList,
    });
    expect(withAssignments).toHaveBeenCalledWith(MUNICIPALITY_ID, []);
  });

  test('does not call the register when the feature is off', async () => {
    appConfig.features.useLicensedBusiness = false;
    givenAssets([alcoholAsset(NUMBER)]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, givenAssetList)).toEqual([assetPlace]);
    expect(withAssignments).not.toHaveBeenCalled();
  });
});

const NAMESPACE = 'AOT';
const INSPECTION_FORM = 'aot_inspection_external_inspection';
const numberedPlace = {
  key: NUMBER,
  restaurantNumber: NUMBER,
  assetTypes: [],
  activeAssets: 0,
  assets: [],
} as CustomerPlace;
const inspectionLabels = [
  { classification: 'ROOT', resourceName: 'CATEGORYROOT', resourcePath: 'CATEGORYROOT' },
  { classification: 'CATEGORY', resourceName: 'INSPECTION', resourcePath: 'CATEGORYROOT/INSPECTION' },
  {
    classification: 'TYPE',
    resourceName: 'EXTERNAL_INSPECTION',
    resourcePath: 'CATEGORYROOT/INSPECTION/EXTERNAL_INSPECTION',
  },
];
const formOf = (site: object) => [
  { key: INSPECTION_FORM, schemaId: `${MUNICIPALITY_ID}_${INSPECTION_FORM}_1.0`, value: site },
];
const errand = (id: string, fields: object = {}) =>
  ({ id, status: Status.SOLVED, ...fields } as unknown as SupportErrand);
const inspection = (id: string, date: string | undefined, fields: object = {}) => ({
  errand: errand(id, {
    labels: inspectionLabels,
    jsonParameters: formOf({ premises: { restaurantNumber: NUMBER } }),
    ...fields,
  }),
  date,
});

describe('getCustomerErrands', () => {
  beforeEach(() => vi.mocked(getSupportErrands).mockReset());

  test("fetches the asked page of the customer's errands, the most recently active first", async () => {
    vi.mocked(getSupportErrands).mockResolvedValue({ errands: [errand('own')], labels: [], totalPages: 75 } as never);

    const result = await getCustomerErrands(MUNICIPALITY_ID, CUSTOMER_ID, 3);

    expect(result.errands.map(({ id }) => id)).toEqual(['own']);
    expect(result.totalPages).toBe(75);
    expect(getSupportErrands).toHaveBeenCalledExactlyOnceWith(
      MUNICIPALITY_ID,
      3,
      CUSTOMER_ERRANDS_PAGE_SIZE,
      { query: CUSTOMER_ID },
      { touched: 'desc' }
    );
  });

  test('fails when the search fails', async () => {
    vi.mocked(getSupportErrands).mockResolvedValue({ errands: [], labels: [], error: '500' } as never);

    await expect(getCustomerErrands(MUNICIPALITY_ID, CUSTOMER_ID, 0)).rejects.toThrow();
  });
});

describe('getCustomerErrandCounts', () => {
  beforeEach(() => vi.mocked(getSupportErrandsCount).mockReset());

  test('counts every errand of the customer, not only a page of them', async () => {
    vi.mocked(getSupportErrandsCount).mockImplementation(async (_, filter) => (filter?.status ? 400 : 1500));

    expect(await getCustomerErrandCounts(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual({ ongoing: 1100, closed: 400 });
    expect(getSupportErrandsCount).toHaveBeenCalledWith(MUNICIPALITY_ID, { query: CUSTOMER_ID });
    expect(getSupportErrandsCount).toHaveBeenCalledWith(MUNICIPALITY_ID, {
      query: CUSTOMER_ID,
      status: Status.SOLVED,
    });
  });

  test('fails when a count fails', async () => {
    vi.mocked(getSupportErrandsCount).mockResolvedValueOnce(1500).mockResolvedValueOnce(null);

    await expect(getCustomerErrandCounts(MUNICIPALITY_ID, CUSTOMER_ID)).rejects.toThrow();
  });
});

describe('getCustomerInspections', () => {
  beforeEach(() => {
    vi.mocked(getSupportErrands).mockReset();
    vi.mocked(getSupportInvestigation).mockReset().mockResolvedValue(undefined);
  });

  test("fetches every page of the customer's closed inspections", async () => {
    vi.mocked(getSupportErrands)
      .mockResolvedValueOnce({ errands: [errand('first')], labels: [], totalPages: 2 } as never)
      .mockResolvedValueOnce({ errands: [errand('second')], labels: [], totalPages: 2 } as never);

    const inspections = await getCustomerInspections(MUNICIPALITY_ID, CUSTOMER_ID);

    expect(inspections.map(({ errand: { id } }) => id)).toEqual(['first', 'second']);
    expect(vi.mocked(getSupportErrands).mock.calls.map((call) => call[1])).toEqual([0, 1]);
    expect(vi.mocked(getSupportErrands).mock.calls[0][3]).toEqual({
      query: CUSTOMER_ID,
      labelCategory: 'CATEGORYROOT/INSPECTION',
      status: Status.SOLVED,
    });
  });

  test('fails when a page fails', async () => {
    vi.mocked(getSupportErrands)
      .mockResolvedValueOnce({ errands: [errand('first')], labels: [], totalPages: 2 } as never)
      .mockResolvedValueOnce({ errands: [], labels: [], error: '500' } as never);

    await expect(getCustomerInspections(MUNICIPALITY_ID, CUSTOMER_ID)).rejects.toThrow();
  });

  test('dates each inspection by the inspection date in its protocol', async () => {
    vi.mocked(getSupportErrands).mockResolvedValue({ errands: [errand('dated')], labels: [], totalPages: 1 } as never);
    vi.mocked(getSupportInvestigation).mockResolvedValue({
      type: 'internal_inspection',
      jsonParameters: [
        { key: 'aot_other', schemaId: 'other', value: { inspectionDate: '1999-01-01' } },
        {
          key: 'aot_internal_inspection_protocol',
          schemaId: `${MUNICIPALITY_ID}_aot_internal_inspection_protocol_1.0`,
          value: { inspectionDate: '2026-11-10' },
        },
      ],
    } as never);

    const [dated] = await getCustomerInspections(MUNICIPALITY_ID, CUSTOMER_ID);

    expect(dated.date).toBe('2026-11-10');
    expect(getSupportInvestigation).toHaveBeenCalledWith('dated', MUNICIPALITY_ID);
  });
});

describe('getLatestInspection', () => {
  test('picks the closed inspection of the place with the latest protocol date, as its errand type form names it', () => {
    const latest = inspection('latest', '2024-01-01');
    const errands = [
      inspection('touched later, inspected earlier', '2023-06-01', { touched: '2026-01-01' }),
      inspection('no protocol date', undefined),
      inspection('older', '2023-01-01'),
      latest,
      inspection('ongoing', '2025-01-01', { status: Status.ONGOING }),
      inspection('other place', '2025-01-01', {
        jsonParameters: formOf({ premises: { restaurantNumber: OTHER_NUMBER } }),
      }),
      inspection('no form', '2025-01-01', { jsonParameters: [] }),
      inspection('not an inspection', '2025-01-01', { labels: [] }),
    ];

    expect(getLatestInspection(errands, numberedPlace, NAMESPACE)).toBe(latest);
  });

  test('matches a point of sale without a number on its name and street', () => {
    const site = { name: ASSET_NAME, address: { street: 'Testgatan 1' } };
    const place = { ...numberedPlace, key: `${ASSET_NAME}|Testgatan 1`, restaurantNumber: undefined };
    const latest = inspection('latest', '2024-01-01', { jsonParameters: formOf({ pointOfSale: site }) });

    expect(getLatestInspection([latest], place, NAMESPACE)).toBe(latest);
  });
});

describe('isOtherDrakeCase', () => {
  test.each([
    ['another namespace', { namespace: 'SBK_MEX' }, true],
    ['the own namespace', { namespace: 'AOT' }, false],
    ['a system without namespace', { system: 'BYGGR' }, false],
  ])('%s', (_, status, expected) => {
    expect(isOtherDrakeCase(status, 'AOT')).toBe(expected);
  });
});

describe('toCustomerAssets', () => {
  const ERRAND_NUMBER = 'AOT-1';

  test('reads the decision data and the source errand the BFF found', () => {
    const value = {
      caseRegistrationNumber: 'IAN-1',
      decision: { caseOfficer: 'Handläggare', decisionDate: '2024-01-01' },
    };
    givenAssets([{ ...assetWith(value), issued: '2024-02-02', sourceErrandNumber: ERRAND_NUMBER }]);

    const [row] = toCustomerAssets(givenAssetList);

    expect(row).toMatchObject({
      registrationNumber: 'IAN-1',
      caseOfficer: 'Handläggare',
      decisionDate: '2024-01-01',
      errandNumber: ERRAND_NUMBER,
    });
  });

  test('falls back to the issued date and has no errand without a source errand', () => {
    givenAssets([{ ...assetWith({}), issued: '2024-02-02' }]);

    const [row] = toCustomerAssets(givenAssetList);

    expect(row).toMatchObject({ decisionDate: '2024-02-02', errandNumber: undefined });
  });
});
