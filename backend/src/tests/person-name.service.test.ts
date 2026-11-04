import { apiServiceName } from '@/config/api-config';
import { PersonNameService, UNKNOWN_PERSON_NAME } from '@/services/person-name.service';

import { mockUser } from './helpers/http';
import { mockAdUsername, mockCitizenPartyId, mockFirstName, mockLastName, mockMunicipalityId } from './helpers/mock-data';

const FULL_NAME = `${mockFirstName} ${mockLastName}`;
const CITIZEN_URL = `${apiServiceName('citizen')}/${mockMunicipalityId}/${mockCitizenPartyId}`;
const EMPLOYEE_URL = `${apiServiceName('employee')}/${mockMunicipalityId}/portalpersondata/PERSONAL/${mockAdUsername}`;

const makeService = () => {
  const service = new PersonNameService();
  const api = { get: vi.fn(async () => ({ data: { givenname: mockFirstName, lastname: mockLastName } as unknown, message: 'success' })) };
  (service as unknown as { apiService: typeof api }).apiService = api;
  return { service, api };
};

const lookUp = (service: PersonNameService, identifier: string) => service.getNameByIdentifier(mockMunicipalityId, identifier, mockUser());

describe('PersonNameService', () => {
  describe('a UUID', () => {
    it('is looked up as a citizen', async () => {
      const { service, api } = makeService();

      await expect(lookUp(service, mockCitizenPartyId)).resolves.toBe(FULL_NAME);

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith({ url: CITIZEN_URL }, expect.anything());
    });

    it('is not shown when Citizen answers without content, as it does for an unknown partyId', async () => {
      const { service, api } = makeService();
      api.get.mockResolvedValueOnce({ data: '', message: 'success' });

      await expect(lookUp(service, mockCitizenPartyId)).resolves.toBe(UNKNOWN_PERSON_NAME);
    });

    it('is not shown when the lookup fails', async () => {
      const { service, api } = makeService();
      api.get.mockRejectedValueOnce(new Error('Internal server error'));

      await expect(lookUp(service, mockCitizenPartyId)).resolves.toBe(UNKNOWN_PERSON_NAME);
    });
  });

  describe('anything else', () => {
    it('is looked up as an employee', async () => {
      const { service, api } = makeService();

      await expect(lookUp(service, mockAdUsername)).resolves.toBe(FULL_NAME);

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith({ url: EMPLOYEE_URL }, expect.anything());
    });

    it('is shown as it is when the lookup fails', async () => {
      const { service, api } = makeService();
      api.get.mockRejectedValueOnce(new Error('Not found'));

      await expect(lookUp(service, mockAdUsername)).resolves.toBe(mockAdUsername);
    });

    it('is shown as it is when the employee has no name', async () => {
      const { service, api } = makeService();
      api.get.mockResolvedValueOnce({ data: { givenname: null, lastname: null }, message: 'success' });

      await expect(lookUp(service, mockAdUsername)).resolves.toBe(mockAdUsername);
    });
  });
});
