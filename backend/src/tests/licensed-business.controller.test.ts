import { LicensedBusinessController } from '@/controllers/licensed-business.controller';
import { HttpException } from '@/exceptions/HttpException';

import { mockReq } from './helpers/http';
import {
  mockAssignmentId,
  mockCity,
  mockLicensedBusinessAddressId,
  mockMunicipalityId,
  mockOrganizationName,
  mockOrganizationNumber,
  mockPremisesName,
  mockRestaurantNumber,
  mockRestaurantNumberId,
  mockStreet,
  mockZipCode,
} from './helpers/mock-data';

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
}

const SERVICE = 'licensed-business/1.0';

const address = { id: mockLicensedBusinessAddressId, streetAddress: mockStreet, postalCode: mockZipCode, postalArea: mockCity };

const restaurantNumber = {
  id: mockRestaurantNumberId,
  number: mockRestaurantNumber,
  status: 'ACTIVE',
  premisesName: mockPremisesName,
};

const assignment = {
  id: mockAssignmentId,
  restaurantNumber: { id: mockRestaurantNumberId, number: mockRestaurantNumber },
  address,
  licenseHolder: { orgNumber: mockOrganizationNumber, name: mockOrganizationName },
  premisesName: mockPremisesName,
  status: 'ACTIVE',
};

const upstreamError = (status: number) => new HttpException(status, status === 404 ? 'Not found' : 'Internal server error');

const makeController = (get: ApiStub['get']) => {
  const controller = new LicensedBusinessController();
  const service = (controller as unknown as { licensedBusinessService: { apiService: ApiStub } }).licensedBusinessService;
  service.apiService = { get };
  return controller;
};

const respondingWith = (data: unknown) => vi.fn(async () => ({ data, message: 'success' }));
const failingWith = (status: number) =>
  vi.fn(async () => {
    throw upstreamError(status);
  });

const expectHttpError = async (promise: Promise<unknown>, status: number) => {
  await expect(promise).rejects.toMatchObject({ status });
};

describe('LicensedBusinessController', () => {
  describe('lookupAddress', () => {
    it('looks up the address by street address and postal code', async () => {
      const get = respondingWith(address);

      const result = await makeController(get).lookupAddress(mockReq(), mockMunicipalityId, mockStreet, mockZipCode);

      expect(result.data).toEqual(address);
      expect(get).toHaveBeenCalledWith(
        { url: `${SERVICE}/${mockMunicipalityId}/addresses/lookup`, params: { streetAddress: mockStreet, postalCode: mockZipCode } },
        expect.anything(),
      );
    });

    it('trims the query before sending it upstream', async () => {
      const get = respondingWith(address);

      await makeController(get).lookupAddress(mockReq(), mockMunicipalityId, ` ${mockStreet} `, ` ${mockZipCode} `);

      expect(get).toHaveBeenCalledWith(
        expect.objectContaining({ params: { streetAddress: mockStreet, postalCode: mockZipCode } }),
        expect.anything(),
      );
    });

    it('answers an unknown address with null so the caller can fall back to search', async () => {
      const result = await makeController(failingWith(404)).lookupAddress(mockReq(), mockMunicipalityId, mockStreet, mockZipCode);

      expect(result).toEqual({ data: null, message: 'success' });
    });

    it('does not hide other upstream failures', async () => {
      await expectHttpError(makeController(failingWith(500)).lookupAddress(mockReq(), mockMunicipalityId, mockStreet, mockZipCode), 500);
    });

    it.each([
      ['streetAddress', undefined, mockZipCode],
      ['streetAddress', '  ', mockZipCode],
      ['postalCode', mockStreet, undefined],
      ['postalCode', mockStreet, ''],
    ])('rejects a missing %s without calling upstream', async (_name, streetAddress, postalCode) => {
      const get = respondingWith(address);

      await expectHttpError(makeController(get).lookupAddress(mockReq(), mockMunicipalityId, streetAddress as string, postalCode as string), 400);
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe('searchAddresses', () => {
    it('searches with the query and passes paging through', async () => {
      const page = { content: [address], _meta: { page: 2, limit: 10, count: 1, totalRecords: 11, totalPages: 2 } };
      const get = respondingWith(page);

      const result = await makeController(get).searchAddresses(mockReq(), mockMunicipalityId, mockStreet, 2, 10);

      expect(result.data).toEqual(page);
      expect(get).toHaveBeenCalledWith(
        { url: `${SERVICE}/${mockMunicipalityId}/addresses/search`, params: { query: mockStreet, page: 2, limit: 10 } },
        expect.anything(),
      );
    });

    it('leaves paging to upstream defaults when not given', async () => {
      const get = respondingWith({ content: [] });

      await makeController(get).searchAddresses(mockReq(), mockMunicipalityId, mockStreet);

      expect(get).toHaveBeenCalledWith(
        expect.objectContaining({ params: { query: mockStreet, page: undefined, limit: undefined } }),
        expect.anything(),
      );
    });

    it('rejects a blank query without calling upstream', async () => {
      const get = respondingWith({ content: [] });

      await expectHttpError(makeController(get).searchAddresses(mockReq(), mockMunicipalityId, ' '), 400);
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe('getAddressRestaurantNumbers', () => {
    it('lists the restaurant numbers at the address', async () => {
      const get = respondingWith([restaurantNumber]);

      const result = await makeController(get).getAddressRestaurantNumbers(mockReq(), mockMunicipalityId, mockLicensedBusinessAddressId);

      expect(result.data).toEqual([restaurantNumber]);
      expect(get).toHaveBeenCalledWith(
        { url: `${SERVICE}/${mockMunicipalityId}/addresses/${mockLicensedBusinessAddressId}/restaurant-numbers` },
        expect.anything(),
      );
    });

    it('answers an empty body with an empty list', async () => {
      const result = await makeController(respondingWith(undefined)).getAddressRestaurantNumbers(
        mockReq(),
        mockMunicipalityId,
        mockLicensedBusinessAddressId,
      );

      expect(result.data).toEqual([]);
    });

    it('keeps a path parameter from escaping its segment', async () => {
      const get = respondingWith([]);

      await makeController(get).getAddressRestaurantNumbers(mockReq(), mockMunicipalityId, '../assignments');

      expect(get).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${SERVICE}/${mockMunicipalityId}/addresses/..%2Fassignments/restaurant-numbers` }),
        expect.anything(),
      );
    });

    it('forwards an unknown address as 404', async () => {
      await expectHttpError(
        makeController(failingWith(404)).getAddressRestaurantNumbers(mockReq(), mockMunicipalityId, mockLicensedBusinessAddressId),
        404,
      );
    });
  });

  describe('getRestaurantNumberAssignment', () => {
    it('gets the most recent assignment of the number', async () => {
      const get = respondingWith(assignment);

      const result = await makeController(get).getRestaurantNumberAssignment(mockReq(), mockMunicipalityId, mockRestaurantNumber);

      expect(result.data).toEqual(assignment);
      expect(get).toHaveBeenCalledWith(
        { url: `${SERVICE}/${mockMunicipalityId}/restaurant-numbers/${mockRestaurantNumber}/assignment` },
        expect.anything(),
      );
    });

    it('answers a number that has never been assigned with null', async () => {
      const result = await makeController(failingWith(404)).getRestaurantNumberAssignment(mockReq(), mockMunicipalityId, mockRestaurantNumber);

      expect(result).toEqual({ data: null, message: 'success' });
    });

    it('does not hide other upstream failures', async () => {
      await expectHttpError(makeController(failingWith(502)).getRestaurantNumberAssignment(mockReq(), mockMunicipalityId, mockRestaurantNumber), 502);
    });
  });
});
