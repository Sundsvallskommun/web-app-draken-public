import { apiServiceName } from '@/config/api-config';
import { CitizenService } from '@/services/citizen.service';

import { mockUser } from './helpers/http';
import { mockCitizenPartyId, mockMunicipalityId, mockPersonNumber } from './helpers/mock-data';

const CITIZEN_SERVICE = apiServiceName('citizen');

const makeService = () => {
  const service = new CitizenService();
  const api = { post: vi.fn() };
  (service as unknown as { apiService: typeof api }).apiService = api;
  return { service, api };
};

describe('CitizenService.getPartyIdByPersonNumber', () => {
  it('sends the personal number in the request body, not in the URL', async () => {
    const { service, api } = makeService();
    api.post.mockResolvedValue({ data: [{ personNumber: mockPersonNumber, personId: mockCitizenPartyId, success: true }] });

    const partyId = await service.getPartyIdByPersonNumber(mockMunicipalityId, mockPersonNumber, mockUser());

    expect(partyId).toBe(mockCitizenPartyId);
    expect(api.post).toHaveBeenCalledWith(
      { url: `${CITIZEN_SERVICE}/${mockMunicipalityId}/guid/batch`, data: [mockPersonNumber] },
      expect.anything(),
    );
    expect(api.post.mock.calls[0][0].url).not.toContain(mockPersonNumber);
  });

  it('returns an empty party id when the person is not found', async () => {
    const { service, api } = makeService();
    api.post.mockResolvedValue({ data: [{ personNumber: mockPersonNumber, success: false, errorMessage: 'Not found' }] });

    expect(await service.getPartyIdByPersonNumber(mockMunicipalityId, mockPersonNumber, mockUser())).toBe('');
  });
});
