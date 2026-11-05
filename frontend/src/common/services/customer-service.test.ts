import { getPartyServices } from '@common/services/asset-service';
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
} from './customer-service';

vi.mock('@common/services/asset-service', () => ({ getPartyServices: vi.fn() }));
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
};

const givenAssets = (assets: unknown[]) => vi.mocked(getPartyServices).mockResolvedValue({ data: assets } as never);
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

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([
      { ...assetPlace, name: mockEnv.mockPremisesName },
    ]);
    expect(withAssignments).toHaveBeenCalledWith(MUNICIPALITY_ID, [{ number: NUMBER }]);
  });

  test('falls back to the asset name when the register has no assignment', async () => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([null]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([assetPlace]);
  });

  test.each([
    ['started after the asset', { validFrom: '2021-01-01' }],
    ['ended before the asset', { validFrom: '2019-01-01', validTo: '2020-06-14' }],
  ])('ignores an assignment that %s', async (_, period) => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([{ premisesName: mockEnv.mockPremisesName, ...period }]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([assetPlace]);
  });

  test.each([
    ['starts', { validFrom: ASSET_VALID_FROM }],
    ['ends', { validFrom: '2019-01-01', validTo: ASSET_VALID_FROM }],
  ])('uses an assignment that %s on the day the asset starts', async (_, period) => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([{ premisesName: mockEnv.mockPremisesName, ...period }]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([
      { ...assetPlace, name: mockEnv.mockPremisesName },
    ]);
  });

  test('ignores the assignment when the asset has no start date', async () => {
    givenAssets([assetWith({ premises: { name: ASSET_NAME, restaurantNumber: NUMBER } })]);
    givenAssignments([{ premisesName: mockEnv.mockPremisesName, validFrom: '2019-01-01' }]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([{ ...assetPlace, validFrom: undefined }]);
  });

  test('lists a number once and skips assets without one', async () => {
    givenAssets([
      alcoholAsset(NUMBER),
      alcoholAsset(NUMBER),
      alcoholAsset(OTHER_NUMBER),
      assetWith({ pointOfSale: {} }),
    ]);
    givenAssignments([null, null]);

    const places = await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID);

    expect(places.map((place) => place.restaurantNumber)).toEqual([NUMBER, OTHER_NUMBER]);
  });

  test('merges a place named on several assets and counts its active ones', async () => {
    const site = { name: ASSET_NAME, address: { street: 'Testgatan 1' } };
    givenAssets([
      { ...assetWith({ pointOfSale: site }), type: 'TobaccoSalesPermit', status: 'ACTIVE' },
      { ...assetWith({ premises: site }), type: 'LowAlcoholBeerSalesNotification', status: 'EXPIRED' },
    ]);
    givenAssignments([]);

    const places = await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID);

    expect(places).toHaveLength(1);
    expect(places[0]).toMatchObject({
      assetTypes: ['TobaccoSalesPermit', 'LowAlcoholBeerSalesNotification'],
      activeAssets: 1,
    });
    expect(withAssignments).toHaveBeenCalledWith(MUNICIPALITY_ID, []);
  });

  test('does not call the register when the feature is off', async () => {
    appConfig.features.useLicensedBusiness = false;
    givenAssets([alcoholAsset(NUMBER)]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([assetPlace]);
    expect(withAssignments).not.toHaveBeenCalled();
  });
});

const numberedPlace = { key: NUMBER, restaurantNumber: NUMBER, assetTypes: [], activeAssets: 0 } as CustomerPlace;
const parametersOf = (restaurantNumber: string) => [{ key: 'restaurantNumber', values: [restaurantNumber] }];
const errand = (id: string, fields: object = {}) =>
  ({ id, status: Status.SOLVED, ...fields } as unknown as SupportErrand);
const inspection = (id: string, touched: string, fields: object = {}) =>
  errand(id, {
    touched,
    parameters: parametersOf(NUMBER),
    labels: [{ resourcePath: 'CATEGORYROOT/INSPECTION/EXTERNAL_INSPECTION' }],
    ...fields,
  });

describe('getCustomerErrands', () => {
  beforeEach(() => vi.mocked(getSupportErrands).mockReset());

  test('adds errands of a place to the customer own, once, and only when they concern the place', async () => {
    const own = errand('own', { parameters: parametersOf(NUMBER) });
    const place = errand('place', { parameters: parametersOf(NUMBER) });
    const unrelated = errand('unrelated', { parameters: parametersOf(OTHER_NUMBER) });
    vi.mocked(getSupportErrands).mockImplementation(
      async (_municipalityId, _page, _size, filter) =>
        ({ errands: filter?.query === CUSTOMER_ID ? [own] : [own, place, unrelated], labels: [] } as never)
    );

    const errands = await getCustomerErrands(MUNICIPALITY_ID, CUSTOMER_ID, [numberedPlace]);

    expect(errands.map(({ id }) => id)).toEqual(['own', 'place']);
  });

  test('fails when a search fails', async () => {
    vi.mocked(getSupportErrands).mockResolvedValue({ errands: [], labels: [], error: '500' } as never);

    await expect(getCustomerErrands(MUNICIPALITY_ID, CUSTOMER_ID, [])).rejects.toThrow();
  });
});

describe('getLatestInspection', () => {
  test('picks the latest closed inspection of the place', () => {
    const latest = inspection('latest', '2024-01-01');
    const errands = [
      inspection('older', '2023-01-01'),
      latest,
      inspection('ongoing', '2025-01-01', { status: Status.ONGOING }),
      inspection('other place', '2025-01-01', { parameters: parametersOf(OTHER_NUMBER) }),
      inspection('not an inspection', '2025-01-01', { labels: [] }),
    ];

    expect(getLatestInspection(errands, numberedPlace)).toBe(latest);
  });
});

describe('countErrands', () => {
  test('counts closed errands and treats the rest as ongoing', () => {
    expect(countErrands([errand('a'), errand('b', { status: Status.NEW })])).toEqual({ ongoing: 1, closed: 1 });
  });
});
