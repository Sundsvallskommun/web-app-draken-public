import type { Asset } from '@common/interfaces/asset';
import { getCompanyProfileByPartyId } from '@common/services/legal-entity-service';
import { appConfig } from '@config/appconfig';
import { withAssignments } from '@supportmanagement/services/licensed-business-service';
import { getSupportErrands, Status, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import {
  countErrands,
  CustomerPlace,
  getCustomerByCustomerId,
  getCustomerErrands,
  getCustomerPlaces,
  getLatestInspection,
  isOtherDrakeCase,
  toCustomerAssets,
} from './customer-service';

vi.mock('@common/services/legal-entity-service', () => ({ getCompanyProfileByPartyId: vi.fn() }));
vi.mock('@supportmanagement/services/licensed-business-service', () => ({ withAssignments: vi.fn() }));
vi.mock('@supportmanagement/services/support-errand-service', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSupportErrands: vi.fn(),
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
const inspection = (id: string, touched: string, fields: object = {}) =>
  errand(id, {
    touched,
    labels: inspectionLabels,
    jsonParameters: formOf({ premises: { restaurantNumber: NUMBER } }),
    ...fields,
  });

describe('getCustomerErrands', () => {
  beforeEach(() => vi.mocked(getSupportErrands).mockReset());

  test("finds the customer's errands by its id", async () => {
    vi.mocked(getSupportErrands).mockResolvedValue({ errands: [errand('own')], labels: [] } as never);

    const errands = await getCustomerErrands(MUNICIPALITY_ID, CUSTOMER_ID);

    expect(errands.map(({ id }) => id)).toEqual(['own']);
    expect(getSupportErrands).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getSupportErrands).mock.calls[0][3]).toEqual({ query: CUSTOMER_ID });
  });

  test('fails when the search fails', async () => {
    vi.mocked(getSupportErrands).mockResolvedValue({ errands: [], labels: [], error: '500' } as never);

    await expect(getCustomerErrands(MUNICIPALITY_ID, CUSTOMER_ID)).rejects.toThrow();
  });
});

describe('getLatestInspection', () => {
  test('picks the latest closed inspection of the place, as its errand type form names it', () => {
    const latest = inspection('latest', '2024-01-01');
    const errands = [
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

describe('countErrands', () => {
  test('counts closed errands and treats the rest as ongoing', () => {
    expect(countErrands([errand('a'), errand('b', { status: Status.NEW })])).toEqual({ ongoing: 1, closed: 1 });
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
