import type { Asset } from '@common/interfaces/asset';
import { apiService } from '@common/services/api-service';
import { searchPermitAssets } from '@common/services/asset-service';
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
  getCustomerIdByOrganizationNumber,
  getCustomerInspections,
  getCustomerPlaces,
  getLatestInspection,
  getPermitAssets,
  getPermitAssetTypes,
  isOtherDrakeCase,
  nameFromAssetsOrErrands,
  PERMIT_ASSETS_PAGE_SIZE,
  toCustomerAssets,
} from './customer-service';

vi.mock('@common/services/asset-service', () => ({ getPartyServices: vi.fn(), searchPermitAssets: vi.fn() }));
vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn(), post: vi.fn() } }));
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

describe('nameFromAssetsOrErrands', () => {
  const OTHER_PARTY = 'other-party-id';
  const holderAsset = (partyId: string, name: string) =>
    ({ id: name, partyId, ...assetWith({ permitHolder: { name } }) } as Asset);
  const errandWith = (externalId: string, organizationName: string) =>
    ({ stakeholders: [{ externalId, organizationName }] } as unknown as SupportErrand);

  test("is the permit holder of an asset with the customer's partyId", () => {
    const assets = [holderAsset(OTHER_PARTY, 'Någon annan'), holderAsset(CUSTOMER_ID, 'Föreningen')];

    expect(nameFromAssetsOrErrands(CUSTOMER_ID, assets, [errandWith(CUSTOMER_ID, 'Ärendets namn')])).toBe('Föreningen');
  });

  test("is the organisation name of an errand stakeholder with the customer's partyId when no asset names it", () => {
    const errands = [errandWith(OTHER_PARTY, 'Fel'), errandWith(CUSTOMER_ID, 'Föreningen')];

    expect(nameFromAssetsOrErrands(CUSTOMER_ID, [holderAsset(OTHER_PARTY, 'Någon annan')], errands)).toBe('Föreningen');
  });

  test('is undefined when nothing names the customer', () => {
    expect(nameFromAssetsOrErrands(CUSTOMER_ID, [], [errandWith(OTHER_PARTY, 'Fel')])).toBeUndefined();
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

describe('getPermitAssets', () => {
  const holder = { name: 'Bolaget AB', organizationNumber: mockEnv.mockOrganizationNumber };
  const premises = { name: 'Baren', address: { street: 'Gatan 1', postalCode: '85230', city: 'Sundsvall' } };

  test('asks for one page of active permits of all types, counting pages from 1', async () => {
    vi.mocked(searchPermitAssets).mockResolvedValue({ data: { assets: [], _meta: { totalPages: 0 } } } as never);

    await getPermitAssets(2);

    expect(searchPermitAssets).toHaveBeenCalledWith({
      term: undefined,
      activeOnly: true,
      types: undefined,
      page: 3,
      limit: PERMIT_ASSETS_PAGE_SIZE,
      sortDirection: 'ASC',
    });
  });

  test('passes the trimmed term, the active choice and the chosen types', async () => {
    vi.mocked(searchPermitAssets).mockResolvedValue({ data: { assets: [], _meta: { totalPages: 0 } } } as never);

    await getPermitAssets(0, {
      term: ' Canton ',
      activeOnly: false,
      types: ['TobaccoSalesPermit', 'ECigaretteSalesNotification'],
    });

    expect(searchPermitAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        term: 'Canton',
        activeOnly: false,
        types: 'TobaccoSalesPermit,ECigaretteSalesNotification',
        page: 1,
      })
    );
  });

  test('reads the permit holder, premises and decision from the JSON parameters', async () => {
    const asset = {
      id: 'asset-1',
      issued: '2026-01-01',
      ...assetWith({
        permitHolder: holder,
        premises,
        caseRegistrationNumber: 'AOT-1',
        decision: { validFrom: '2026-02-02' },
      }),
    };
    vi.mocked(searchPermitAssets).mockResolvedValue({ data: { assets: [asset], _meta: { totalPages: 4 } } } as never);

    const result = await getPermitAssets(0);

    expect(result.totalPages).toBe(4);
    expect(result.permits[0]).toMatchObject({
      permitHolder: holder,
      premises,
      registrationNumber: 'AOT-1',
      validFrom: '2026-02-02',
    });
  });
});

describe('getCustomerIdByOrganizationNumber', () => {
  test('answers the partyId of the organisation', async () => {
    vi.mocked(apiService.post).mockResolvedValue({ data: { data: { partyId: CUSTOMER_ID } } } as never);

    await expect(getCustomerIdByOrganizationNumber(mockEnv.mockOrganizationNumber)).resolves.toBe(CUSTOMER_ID);
    expect(apiService.post).toHaveBeenCalledWith('organization/', { orgNr: mockEnv.mockOrganizationNumber });
  });

  test('answers undefined when the organisation has no partyId', async () => {
    vi.mocked(apiService.post).mockResolvedValue({ data: { data: { partyId: '' } } } as never);

    await expect(getCustomerIdByOrganizationNumber(mockEnv.mockOrganizationNumber)).resolves.toBeUndefined();
  });
});

describe('getPermitAssetTypes', () => {
  test("answers the app's permit types as the BFF gives them", async () => {
    const types = [{ type: 'AlcoholServingPermit', displayName: 'Serveringstillstånd' }];
    vi.mocked(apiService.get).mockResolvedValue({ data: { data: types } } as never);

    await expect(getPermitAssetTypes()).resolves.toEqual(types);
    expect(apiService.get).toHaveBeenCalledWith('permit-assets/types');
  });

  test('answers no types when the BFF gives none', async () => {
    vi.mocked(apiService.get).mockResolvedValue({ data: {} } as never);

    await expect(getPermitAssetTypes()).resolves.toEqual([]);
  });
});
