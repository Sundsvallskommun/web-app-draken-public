import { describe, expect, it, vi } from 'vitest';

import { AddressController } from '@/controllers/address.controller';
import { PersonEngagement } from '@/data-contracts/legalentity/data-contracts';
import { OrganizationService, toLegalEntityPersonEngagement } from '@/services/organization.service';

import { mockAdUsername, mockMunicipalityId, mockPersonNumber } from './helpers/mock-data';

const user = { username: mockAdUsername } as never;

const engagement = (): PersonEngagement => ({
  organizationNumber: '5560068255',
  name: 'Testbolag AB',
  form: 'Aktiebolag',
  formShort: 'AB',
  roles: [{ description: 'Verkställande direktör', code: 'VD' }],
  isAuthorizedSignatory: true,
  isSoleTrader: false,
  source: 'BV',
});

const makeService = (engagements: PersonEngagement[]) => {
  const service = new OrganizationService();
  const api = { get: vi.fn(async () => ({ data: engagements, message: 'success' })) };
  Object.assign(service as object, { apiService: api });
  return { service, api };
};

describe('toLegalEntityPersonEngagement', () => {
  it('keeps what names the company and the part the person has in it', () => {
    expect(toLegalEntityPersonEngagement(engagement())).toEqual({
      organizationNumber: '5560068255',
      name: 'Testbolag AB',
      form: 'Aktiebolag',
      roles: [{ description: 'Verkställande direktör', code: 'VD' }],
    });
  });

  it('answers with roles even when the company data has none', () => {
    expect(toLegalEntityPersonEngagement({ name: 'Utan roller AB' }).roles).toEqual([]);
  });
});

describe('getPersonEngagements', () => {
  it('asks Legal Entity for the person by digits alone', async () => {
    const { service, api } = makeService([engagement()]);

    const engagements = await service.getPersonEngagements(mockMunicipalityId, `${mockPersonNumber.slice(0, 8)}-${mockPersonNumber.slice(8)}`, user);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.get).mock.calls[0][0].url).toContain(`${mockMunicipalityId}/engagements/person/${mockPersonNumber}`);
    expect(engagements).toHaveLength(1);
  });

  it('asks nothing of Legal Entity when the number carries no digits', async () => {
    const { service, api } = makeService([]);

    expect(await service.getPersonEngagements(mockMunicipalityId, '   ', user)).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });
});

const PARTY_ID = 'b1f3a0a6-6a61-4a7e-9d3a-9a1f2e0c8a11';

const makeController = (personNumber: string | undefined) => {
  const controller = new AddressController();
  const api = { get: vi.fn(async () => (personNumber ? { data: personNumber, message: 'success' } : { data: '', message: 'success' })) };
  const organizationService = { getPersonEngagements: vi.fn(async () => [toLegalEntityPersonEngagement(engagement())]) };
  Object.assign(controller as object, { apiService: api, organizationService });
  return { controller, api, organizationService };
};

describe('the route', () => {
  it('turns the party id the errand carries into a personal number, and never answers with it', async () => {
    const { controller, api, organizationService } = makeController(mockPersonNumber);

    const answer = await controller.legalEntityPersonEngagements({ user } as never, PARTY_ID);

    expect(vi.mocked(api.get).mock.calls[0][0].url).toContain(`${mockMunicipalityId}/${PARTY_ID}/personnumber`);
    expect(organizationService.getPersonEngagements).toHaveBeenCalledWith(mockMunicipalityId, mockPersonNumber, user);
    expect(answer.data[0].name).toBe('Testbolag AB');
    expect(JSON.stringify(answer)).not.toContain(mockPersonNumber);
  });

  it('answers with nothing when Citizen knows no number for the party id', async () => {
    const { controller, organizationService } = makeController(undefined);

    expect(await controller.legalEntityPersonEngagements({ user } as never, PARTY_ID)).toEqual({ data: [], message: 'success' });
    expect(organizationService.getPersonEngagements).not.toHaveBeenCalled();
  });

  it('turns away anything that is not a party id', async () => {
    const { controller, api } = makeController(mockPersonNumber);

    await expect(controller.legalEntityPersonEngagements({ user } as never, mockPersonNumber)).rejects.toThrow();
    expect(api.get).not.toHaveBeenCalled();
  });
});
