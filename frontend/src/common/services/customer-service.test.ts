import { getPartyServices } from '@common/services/asset-service';
import { appConfig } from '@config/appconfig';
import { withAssignments } from '@supportmanagement/services/licensed-business-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { mockEnv } from '../../tests/mock-env';
import { getCustomerPlaces } from './customer-service';

vi.mock('@common/services/asset-service', () => ({ getPartyServices: vi.fn() }));
vi.mock('@common/services/legal-entity-service', () => ({ getCompanyProfileByPartyId: vi.fn() }));
vi.mock('@supportmanagement/services/licensed-business-service', () => ({ withAssignments: vi.fn() }));

const MUNICIPALITY_ID = '2281';
const CUSTOMER_ID = mockEnv.mockRestaurantNumberId;
const NUMBER = mockEnv.mockRestaurantNumber;
const OTHER_NUMBER = mockEnv.mockSecondaryRestaurantNumber;
const ASSET_NAME = 'Namn i tillståndet';

const assetWith = (value: unknown) => ({ jsonParameters: [{ key: 'permit', schemaId: 'schema', value }] });
const alcoholAsset = (restaurantNumber: string) => assetWith({ premises: { name: ASSET_NAME, restaurantNumber } });

const givenAssets = (assets: unknown[]) => vi.mocked(getPartyServices).mockResolvedValue({ data: assets } as never);
const givenAssignments = (assignments: unknown[]) =>
  vi.mocked(withAssignments).mockResolvedValue(assignments.map((assignment) => ({ assignment })) as never);

beforeEach(() => {
  vi.mocked(withAssignments).mockReset();
  appConfig.features.useLicensedBusiness = true;
});

describe('getCustomerPlaces', () => {
  test('names a place from the register', async () => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([{ premisesName: mockEnv.mockPremisesName }]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([
      { restaurantNumber: NUMBER, name: mockEnv.mockPremisesName },
    ]);
    expect(withAssignments).toHaveBeenCalledWith(MUNICIPALITY_ID, [{ number: NUMBER }]);
  });

  test('falls back to the asset name when the register has no assignment', async () => {
    givenAssets([alcoholAsset(NUMBER)]);
    givenAssignments([null]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([
      { restaurantNumber: NUMBER, name: ASSET_NAME },
    ]);
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

  test('does not call the register when the feature is off', async () => {
    appConfig.features.useLicensedBusiness = false;
    givenAssets([alcoholAsset(NUMBER)]);

    expect(await getCustomerPlaces(MUNICIPALITY_ID, CUSTOMER_ID)).toEqual([
      { restaurantNumber: NUMBER, name: ASSET_NAME },
    ]);
    expect(withAssignments).not.toHaveBeenCalled();
  });
});
