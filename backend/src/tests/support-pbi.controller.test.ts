import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { MarkPbiDto, SupportPbiController } from '@/controllers/supportmanagement/support-pbi.controller';

import { mockReq, mockRes } from './helpers/http';
import {
  mockCitizenPartyId,
  mockFirstName,
  mockLastName,
  mockMunicipalityId,
  mockOrganizationPartyId,
  mockPersonNumber,
  mockSecondaryCitizenPartyId,
  mockSupportErrandId,
  mockSupportNamespace,
} from './helpers/mock-data';

const MUNICIPALITY_ID = mockMunicipalityId;
const errandUrl = `${MUNICIPALITY_ID}/${mockSupportNamespace}/errands/${mockSupportErrandId}`;

const applicantCompany = { role: 'PRIMARY', externalIdType: 'COMPANY', externalId: mockOrganizationPartyId, organizationName: 'Testbolaget AB' };
const markedPbi = {
  role: 'PBI',
  externalIdType: 'PRIVATE',
  externalId: mockSecondaryCitizenPartyId,
  parameters: [{ key: 'note', values: ['x'], version: 2 }],
};

const engagements = [
  { name: 'Person i bolaget', identity: { type: 'PERSONNUMMER', code: mockPersonNumber }, relations: [{ description: 'Styrelseledamot' }] },
  { name: 'Ägarbolaget AB', identity: { type: 'ORGANISATIONSNUMMER', code: '5560269986' }, relations: [{ description: 'Ägare' }] },
];

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

const makeController = (stakeholders: object[] = [applicantCompany]) => {
  const controller = new SupportPbiController();
  const api: ApiStub = {
    get: vi.fn(async (config: { url?: string }) => {
      if (config.url === errandUrl) return { data: { id: mockSupportErrandId, version: 7, stakeholders }, message: 'success' };
      if (config.url?.endsWith(`/${mockPersonNumber}/guid`)) return { data: mockCitizenPartyId, message: 'success' };
      if (config.url?.endsWith(`/${mockCitizenPartyId}`)) return { data: { givenname: mockFirstName, lastname: mockLastName }, message: 'success' };
      throw new Error(`Unexpected GET ${config.url}`);
    }),
    patch: vi.fn(async () => ({ data: {}, message: 'success' })),
  };
  const organizationService = { getOrganizationEngagements: vi.fn(async () => ({ engagements })) };
  Object.assign(controller as object, { apiService: api, organizationService });
  return { controller, api, organizationService };
};

describe('MarkPbiDto', () => {
  it('accepts a party id and nothing that identifies a person otherwise', async () => {
    const valid = plainToInstance(MarkPbiDto, { partyId: mockCitizenPartyId });
    const invalid = plainToInstance(MarkPbiDto, { partyId: mockPersonNumber });

    await expect(validate(valid)).resolves.toEqual([]);
    expect(JSON.stringify(await validate(invalid))).toMatch(/partyId/);
  });
});

describe('fetchCandidates', () => {
  it('rejects a municipality id other than the configured one', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.fetchCandidates(mockReq(), mockSupportErrandId, '9999', res);

    expect(res.statusCode).toBe(400);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('reads the company from the errand, and resolves a party id for people only', async () => {
    const { controller, organizationService } = makeController([applicantCompany, { ...markedPbi, externalId: mockCitizenPartyId }]);
    const res = mockRes();

    await controller.fetchCandidates(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect(organizationService.getOrganizationEngagements).toHaveBeenCalledWith(MUNICIPALITY_ID, mockOrganizationPartyId, expect.anything());
    expect(res.body).toEqual([
      expect.objectContaining({ name: 'Person i bolaget', partyId: mockCitizenPartyId, marked: true }),
      expect.objectContaining({ name: 'Ägarbolaget AB', partyId: undefined, marked: false }),
    ]);
  });

  it('answers with no candidates when the applicant is not a company', async () => {
    const { controller, organizationService } = makeController([{ role: 'PRIMARY', externalIdType: 'PRIVATE', externalId: mockCitizenPartyId }]);
    const res = mockRes();

    await controller.fetchCandidates(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect(res.body).toEqual([]);
    expect(organizationService.getOrganizationEngagements).not.toHaveBeenCalled();
  });

  it('keeps the list when a party id cannot be resolved', async () => {
    const { controller, api } = makeController();
    api.get.mockImplementation(async (config: { url?: string }) => {
      if (config.url === errandUrl) return { data: { id: mockSupportErrandId, version: 7, stakeholders: [applicantCompany] }, message: 'success' };
      throw new Error('citizen unavailable');
    });
    const res = mockRes();

    await controller.fetchCandidates(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    const candidates = res.body as object[];
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({ partyId: undefined, marked: false });
  });
});

describe('markPbi', () => {
  it('adds the person as a PBI stakeholder, with the party id and no personal number', async () => {
    const { controller, api } = makeController([applicantCompany, markedPbi]);
    const req = mockReq();
    const res = mockRes();

    await controller.markPbi(req, mockSupportErrandId, MUNICIPALITY_ID, { partyId: mockCitizenPartyId }, res);

    expect(res.statusCode).toBe(201);
    expect(api.patch).toHaveBeenCalledTimes(1);
    const [config] = api.patch.mock.calls[0];
    expect(config.url).toBe(errandUrl);
    expect(config.headers).toEqual({ 'If-Match': '"7"' });
    expect(Object.keys(config.data)).toEqual(['stakeholders']);
    expect(config.data.stakeholders).toEqual([
      applicantCompany,
      { ...markedPbi, parameters: [{ key: 'note', values: ['x'] }] },
      {
        role: 'PBI',
        externalId: mockCitizenPartyId,
        externalIdType: 'PRIVATE',
        firstName: mockFirstName,
        lastName: mockLastName,
        contactChannels: [],
        parameters: [],
      },
    ]);
    expect(JSON.stringify(config.data)).not.toContain(mockPersonNumber);
  });

  it('refuses a person who is not engaged in the applicant company', async () => {
    const { controller, api } = makeController();

    await expect(
      controller.markPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { partyId: 'cccccccc-dddd-4eee-8fff-000000000000' }, mockRes()),
    ).rejects.toMatchObject({ status: 400 });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('writes nothing when the person is already marked', async () => {
    const { controller, api } = makeController([applicantCompany, { ...markedPbi, externalId: mockCitizenPartyId }]);
    const res = mockRes();

    await controller.markPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { partyId: mockCitizenPartyId }, res);

    expect(res.statusCode).toBe(200);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects a municipality id other than the configured one and writes nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.markPbi(mockReq(), mockSupportErrandId, '9999', { partyId: mockCitizenPartyId }, res);

    expect(res.statusCode).toBe(400);
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('unmarkPbi', () => {
  it('removes only the PBI stakeholder with that party id', async () => {
    const contactWithSameParty = { role: 'CONTACT', externalIdType: 'PRIVATE', externalId: mockSecondaryCitizenPartyId };
    const { controller, api } = makeController([applicantCompany, contactWithSameParty, markedPbi]);
    const res = mockRes();

    await controller.unmarkPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, res);

    expect(res.statusCode).toBe(204);
    const [config] = api.patch.mock.calls[0];
    expect(config.headers).toEqual({ 'If-Match': '"7"' });
    expect(config.data.stakeholders).toEqual([applicantCompany, contactWithSameParty]);
  });

  it('answers 404 and writes nothing when the person is not marked', async () => {
    const { controller, api } = makeController();

    await expect(controller.unmarkPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockCitizenPartyId, mockRes())).rejects.toMatchObject({
      status: 404,
    });
    expect(api.patch).not.toHaveBeenCalled();
  });
});
