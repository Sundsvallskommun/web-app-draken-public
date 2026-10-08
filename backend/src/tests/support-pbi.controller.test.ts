import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { AssessPbiDto, KnowledgeTestPbiDto, MarkPbiDto, SupportPbiController } from '@/controllers/supportmanagement/support-pbi.controller';

import { mockReq, mockRes } from './helpers/http';
import {
  mockCitizenPartyId,
  mockFirstName,
  mockLastName,
  mockMunicipalityId,
  mockOrganizationPartyId,
  mockPersonNumber,
  mockSecondaryCitizenPartyId,
  mockSecondaryPersonNumber,
  mockSupportErrandId,
  mockSupportNamespace,
} from './helpers/mock-data';

const MUNICIPALITY_ID = mockMunicipalityId;
const errandUrl = `${MUNICIPALITY_ID}/${mockSupportNamespace}/errands/${mockSupportErrandId}`;

const applicantCompany = { role: 'PRIMARY', externalIdType: 'COMPANY', externalId: mockOrganizationPartyId, organizationName: 'Testbolaget AB' };
const markedPbi = {
  role: 'CONTACT',
  externalIdType: 'PRIVATE',
  externalId: mockSecondaryCitizenPartyId,
  parameters: [{ key: 'PBI', values: ['true'], version: 2 }],
};

const pbiAddedByHand = {
  role: 'CONTACT',
  externalIdType: 'PRIVATE',
  externalId: mockSecondaryCitizenPartyId,
  firstName: mockFirstName,
  lastName: mockLastName,
  parameters: [
    { key: 'PBI', values: ['true'] },
    { key: 'PBI_SOURCE', values: ['MANUAL'] },
  ],
};

const engagements = [
  { name: 'Person i bolaget', identity: { type: 'PERSONNUMMER', code: mockPersonNumber }, relations: [{ description: 'Styrelseledamot' }] },
  { name: 'Ägarbolaget AB', identity: { type: 'ORGANISATIONSNUMMER', code: '5560269986' }, relations: [{ description: 'Ägare' }] },
];

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

const resolvedBatch = async (config: { data?: string[] }) => ({
  data: (config.data ?? []).map(personNumber => ({ personNumber, personId: mockCitizenPartyId, success: true })),
  message: 'success',
});

const makeController = (stakeholders: object[] = [applicantCompany]) => {
  const controller = new SupportPbiController();
  const api: ApiStub = {
    get: vi.fn(async (config: { url?: string }) => {
      if (config.url === errandUrl) return { data: { id: mockSupportErrandId, version: 7, stakeholders }, message: 'success' };
      if (config.url?.endsWith('/personnumber')) return { data: mockSecondaryPersonNumber, message: 'success' };
      if (config.url?.startsWith('citizen/')) return { data: { givenname: mockFirstName, lastname: mockLastName }, message: 'success' };
      throw new Error(`Unexpected GET ${config.url}`);
    }),
    post: vi.fn(resolvedBatch),
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
      expect.objectContaining({ name: 'Person i bolaget', partyId: mockCitizenPartyId, marked: true, unresolved: false }),
      expect.objectContaining({ name: 'Ägarbolaget AB', partyId: undefined, marked: false, unresolved: false }),
    ]);
  });

  it('answers with no candidates when the applicant is not a company', async () => {
    const { controller, organizationService } = makeController([{ role: 'PRIMARY', externalIdType: 'PRIVATE', externalId: mockCitizenPartyId }]);
    const res = mockRes();

    await controller.fetchCandidates(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect(res.body).toEqual([]);
    expect(organizationService.getOrganizationEngagements).not.toHaveBeenCalled();
  });

  it('asks Citizen once for all the people, with the personal numbers in the body rather than the url', async () => {
    const { controller, api } = makeController();

    await controller.fetchCandidates(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockRes());

    expect(api.post).toHaveBeenCalledTimes(1);
    const [config] = api.post.mock.calls[0];
    expect(config.url).toMatch(/\/guid\/batch$/);
    expect(config.data).toEqual([mockPersonNumber]);
    expect(api.get.mock.calls.map(([call]) => call.url).some(url => url?.includes(mockPersonNumber))).toBe(false);
  });

  it('marks a person Citizen cannot resolve as unresolved', async () => {
    const { controller, api } = makeController();
    api.post.mockResolvedValue({ data: [{ personNumber: mockPersonNumber, personId: null, success: false }], message: 'success' });
    const res = mockRes();

    await controller.fetchCandidates(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect((res.body as object[])[0]).toMatchObject({ partyId: undefined, marked: false, unresolved: true });
  });

  it('keeps the list when Citizen cannot be reached', async () => {
    const { controller, api } = makeController();
    api.post.mockRejectedValue(new Error('citizen unavailable'));
    const res = mockRes();

    await controller.fetchCandidates(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    const candidates = res.body as object[];
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({ partyId: undefined, marked: false, unresolved: true });
  });
});

describe('markPbi', () => {
  it('adds a person not on the errand as a contact carrying the PBI parameter, with the party id and no personal number', async () => {
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
      { ...markedPbi, parameters: [{ key: 'PBI', values: ['true'] }] },
      {
        role: 'CONTACT',
        externalId: mockCitizenPartyId,
        externalIdType: 'PRIVATE',
        firstName: mockFirstName,
        lastName: mockLastName,
        contactChannels: [],
        parameters: [{ key: 'PBI', values: ['true'] }],
      },
    ]);
    expect(JSON.stringify(config.data)).not.toContain(mockPersonNumber);
  });

  it('puts the PBI parameter on the stakeholder the person already is, keeping its role', async () => {
    const owner = {
      role: 'PRIMARY',
      externalIdType: 'PRIVATE',
      externalId: mockCitizenPartyId,
      parameters: [{ key: 'title', values: ['VD'] }],
    };
    const { controller, api } = makeController([applicantCompany, owner]);
    const res = mockRes();

    await controller.markPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { partyId: mockCitizenPartyId }, res);

    expect(res.statusCode).toBe(201);
    const [config] = api.patch.mock.calls[0];
    expect(config.data.stakeholders).toEqual([
      applicantCompany,
      {
        ...owner,
        parameters: [
          { key: 'title', values: ['VD'] },
          { key: 'PBI', values: ['true'] },
        ],
      },
    ]);
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
  it('removes only the PBI parameter, keeping the stakeholder', async () => {
    const owner = {
      role: 'PRIMARY',
      externalIdType: 'PRIVATE',
      externalId: mockCitizenPartyId,
      parameters: [
        { key: 'title', values: ['VD'] },
        { key: 'PBI', values: ['true'] },
      ],
    };
    const { controller, api } = makeController([applicantCompany, owner, markedPbi]);
    const res = mockRes();

    await controller.unmarkPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, res);

    expect(res.statusCode).toBe(204);
    const [config] = api.patch.mock.calls[0];
    expect(config.headers).toEqual({ 'If-Match': '"7"' });
    expect(config.data.stakeholders).toEqual([applicantCompany, owner, { ...markedPbi, parameters: [] }]);
  });

  it('takes a person who was added by hand off the errand, since nothing else put them there', async () => {
    const { controller, api } = makeController([applicantCompany, pbiAddedByHand]);
    const res = mockRes();

    await controller.unmarkPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, res);

    expect(res.statusCode).toBe(204);
    expect(api.patch.mock.calls[0][0].data.stakeholders).toEqual([applicantCompany]);
  });

  it('answers 404 and writes nothing when the person is not marked', async () => {
    const { controller, api } = makeController();

    await expect(controller.unmarkPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockCitizenPartyId, mockRes())).rejects.toMatchObject({
      status: 404,
    });
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('fetchPbi', () => {
  it('reads the people off the errand and dresses the ones the company data knows', async () => {
    const { controller } = makeController([applicantCompany, { ...markedPbi, externalId: mockCitizenPartyId }]);
    const res = mockRes();

    await controller.fetchPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect((res.body as { people: object[] }).people).toEqual([
      {
        partyId: mockCitizenPartyId,
        name: 'Person i bolaget',
        identityCode: mockPersonNumber,
        roles: 'Styrelseledamot',
        addedByHand: false,
        assessment: undefined,
        assessmentComment: undefined,
      },
    ]);
  });

  it('answers with the table and the named people from one look at the company data', async () => {
    const { controller, organizationService } = makeController([applicantCompany, { ...markedPbi, externalId: mockCitizenPartyId }]);
    const res = mockRes();

    await controller.fetchPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect(organizationService.getOrganizationEngagements).toHaveBeenCalledTimes(1);
    expect((res.body as { candidates: object[] }).candidates).toHaveLength(engagements.length);
  });

  it('names a person who was added by hand from the stakeholder, since no company data holds them', async () => {
    const { controller } = makeController([applicantCompany, pbiAddedByHand]);
    const res = mockRes();

    await controller.fetchPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect((res.body as { people: object[] }).people).toMatchObject([
      { partyId: mockSecondaryCitizenPartyId, name: `${mockFirstName} ${mockLastName}`, addedByHand: true },
    ]);
  });

  it('reads the personal number of a person added by hand back from Citizen rather than off the errand', async () => {
    const { controller } = makeController([applicantCompany, pbiAddedByHand]);
    const res = mockRes();

    await controller.fetchPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect((res.body as { people: { identityCode: string }[] }).people[0].identityCode).toBe(mockSecondaryPersonNumber);
    expect(JSON.stringify(pbiAddedByHand)).not.toContain(mockSecondaryPersonNumber);
  });

  it('gives a person added by hand the role the handler typed, and one from the company data its engagements', async () => {
    const byHandWithRole = { ...pbiAddedByHand, parameters: [...pbiAddedByHand.parameters, { key: 'PBI_ROLE', values: ['Finansiär'] }] };
    const { controller } = makeController([applicantCompany, byHandWithRole, { ...markedPbi, externalId: mockCitizenPartyId }]);
    const res = mockRes();

    await controller.fetchPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect((res.body as { people: { roles: string }[] }).people.map(person => person.roles)).toEqual(['Finansiär', 'Styrelseledamot']);
  });

  it('answers with the people of an errand that has no company data at all', async () => {
    const { controller, organizationService } = makeController([pbiAddedByHand]);
    const res = mockRes();

    await controller.fetchPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect(organizationService.getOrganizationEngagements).not.toHaveBeenCalled();
    expect((res.body as { people: object[] }).people).toMatchObject([{ partyId: mockSecondaryCitizenPartyId, addedByHand: true }]);
  });

  it('rejects a municipality id other than the configured one', async () => {
    const { controller } = makeController();
    const res = mockRes();

    await controller.fetchPbi(mockReq(), mockSupportErrandId, '1984', res);

    expect(res.statusCode).toBe(400);
  });
});

describe('addPbiByHand', () => {
  it('adds a person the company data never named, marking where they came from', async () => {
    const { controller, api } = makeController([applicantCompany]);
    const res = mockRes();

    await controller.addPbiByHand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { partyId: mockSecondaryCitizenPartyId }, res);

    expect(res.statusCode).toBe(201);
    const added = api.patch.mock.calls[0][0].data.stakeholders.slice(-1)[0];
    expect(added).toMatchObject({ role: 'CONTACT', externalIdType: 'PRIVATE', externalId: mockSecondaryCitizenPartyId });
    expect(added.parameters).toEqual([
      { key: 'PBI', values: ['true'] },
      { key: 'PBI_SOURCE', values: ['MANUAL'] },
    ]);
    expect(JSON.stringify(added)).not.toContain(mockPersonNumber);
  });

  it('marks a stakeholder the errand already has without claiming it was added by hand', async () => {
    const contact = {
      role: 'CONTACT',
      externalIdType: 'PRIVATE',
      externalId: mockSecondaryCitizenPartyId,
      parameters: [{ key: 'title', values: ['VD'] }],
    };
    const { controller, api } = makeController([applicantCompany, contact]);

    await controller.addPbiByHand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { partyId: mockSecondaryCitizenPartyId }, mockRes());

    const written = api.patch.mock.calls[0][0].data.stakeholders.slice(-1)[0];
    expect(written.parameters).toEqual([
      { key: 'title', values: ['VD'] },
      { key: 'PBI', values: ['true'] },
    ]);
  });

  it('writes nothing when the person is already named on the errand', async () => {
    const { controller, api } = makeController([applicantCompany, markedPbi]);

    await controller.addPbiByHand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { partyId: mockSecondaryCitizenPartyId }, mockRes());

    expect(api.patch).not.toHaveBeenCalled();
  });

  it('keeps the role the handler typed beside the marking', async () => {
    const { controller, api } = makeController([applicantCompany]);

    await controller.addPbiByHand(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      { partyId: mockSecondaryCitizenPartyId, role: '  Finansiär  ' },
      mockRes(),
    );

    const added = api.patch.mock.calls[0][0].data.stakeholders.slice(-1)[0];
    expect(added.parameters).toContainEqual({ key: 'PBI_ROLE', values: ['Finansiär'] });
  });

  it('survives a verdict being written over it, so the person keeps where they came from and what they are', async () => {
    const byHandWithRole = { ...pbiAddedByHand, parameters: [...pbiAddedByHand.parameters, { key: 'PBI_ROLE', values: ['Finansiär'] }] };
    const { controller, api } = makeController([applicantCompany, byHandWithRole]);

    await controller.assessPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, { assessment: 'APPROVED' }, mockRes());

    const written = api.patch.mock.calls[0][0].data.stakeholders.slice(-1)[0];
    expect(written.parameters.map((parameter: { key: string }) => parameter.key)).toEqual(['PBI', 'PBI_SOURCE', 'PBI_ROLE', 'PBI_ASSESSMENT']);
  });

  it('rejects a municipality id other than the configured one and writes nothing', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.addPbiByHand(mockReq(), mockSupportErrandId, '1984', { partyId: mockCitizenPartyId }, res);

    expect(res.statusCode).toBe(400);
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('AssessPbiDto', () => {
  it('takes one of the three verdicts a handler may set, and a comment is optional', async () => {
    const approved = await validate(plainToInstance(AssessPbiDto, { assessment: 'APPROVED' }));
    const commented = await validate(plainToInstance(AssessPbiDto, { assessment: 'DEFICIENCY', comment: 'Skuld.' }));

    expect(approved).toHaveLength(0);
    expect(commented).toHaveLength(0);
  });

  it('refuses a comment longer than a parameter value can hold', async () => {
    const atTheLimit = await validate(plainToInstance(AssessPbiDto, { assessment: 'APPROVED', comment: 'x'.repeat(3000) }));
    const overIt = await validate(plainToInstance(AssessPbiDto, { assessment: 'APPROVED', comment: 'x'.repeat(3001) }));

    expect(atTheLimit).toHaveLength(0);
    expect(overIt).toHaveLength(1);
  });

  it('refuses a verdict the investigation section does not know', async () => {
    const errors = await validate(plainToInstance(AssessPbiDto, { assessment: 'NOT_APPLICABLE' }));

    expect(errors).toHaveLength(1);
  });
});

describe('assessPbi', () => {
  it('writes the verdict beside the marking, leaving the marking in place', async () => {
    const { controller, api } = makeController([applicantCompany, markedPbi]);

    await controller.assessPbi(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      mockSecondaryCitizenPartyId,
      { assessment: 'DEFICIENCY', comment: 'Skuld hos Kronofogden.' },
      mockRes(),
    );

    const written = api.patch.mock.calls[0][0].data.stakeholders.find(
      (stakeholder: { externalId?: string }) => stakeholder.externalId === mockSecondaryCitizenPartyId,
    );
    expect(written.parameters).toEqual([
      { key: 'PBI', values: ['true'] },
      { key: 'PBI_ASSESSMENT', values: ['DEFICIENCY'] },
      { key: 'PBI_ASSESSMENT_COMMENT', values: ['Skuld hos Kronofogden.'] },
    ]);
  });

  it('leaves out an empty comment rather than storing a blank one', async () => {
    const { controller, api } = makeController([applicantCompany, markedPbi]);

    await controller.assessPbi(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      mockSecondaryCitizenPartyId,
      { assessment: 'APPROVED', comment: '   ' },
      mockRes(),
    );

    const written = api.patch.mock.calls[0][0].data.stakeholders.find(
      (stakeholder: { externalId?: string }) => stakeholder.externalId === mockSecondaryCitizenPartyId,
    );
    expect(written.parameters.map((parameter: { key: string }) => parameter.key)).toEqual(['PBI', 'PBI_ASSESSMENT']);
  });

  it('refuses to assess someone who is not marked on the errand', async () => {
    const { controller, api } = makeController([applicantCompany]);

    await expect(
      controller.assessPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, { assessment: 'APPROVED' }, mockRes()),
    ).rejects.toMatchObject({ status: 404 });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('refuses a municipality other than its own', async () => {
    const { controller, api } = makeController([applicantCompany, markedPbi]);
    const res = mockRes();

    await controller.assessPbi(mockReq(), mockSupportErrandId, '1984', mockSecondaryCitizenPartyId, { assessment: 'APPROVED' }, res);

    expect(res.statusCode).toBe(400);
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('KnowledgeTestPbiDto', () => {
  it('takes a status, a date and a comment, and every one of them is optional', async () => {
    const whole = await validate(plainToInstance(KnowledgeTestPbiDto, { status: 'APPROVED', testedAt: '2026-10-02', comment: 'Tog provet.' }));
    const cleared = await validate(plainToInstance(KnowledgeTestPbiDto, {}));

    expect(whole).toHaveLength(0);
    expect(cleared).toHaveLength(0);
  });

  it('refuses a status the section does not offer', async () => {
    const errors = await validate(plainToInstance(KnowledgeTestPbiDto, { status: 'PENDING' }));

    expect(errors).toHaveLength(1);
  });

  it('takes a date without a time of day, since that is what the handler sets', async () => {
    const date = await validate(plainToInstance(KnowledgeTestPbiDto, { testedAt: '2026-10-02' }));
    const timestamp = await validate(plainToInstance(KnowledgeTestPbiDto, { testedAt: '2026-10-02T08:00:00Z' }));

    expect(date).toHaveLength(0);
    expect(timestamp).toHaveLength(1);
  });

  it('refuses a comment longer than a parameter value can hold', async () => {
    const atTheLimit = await validate(plainToInstance(KnowledgeTestPbiDto, { comment: 'x'.repeat(3000) }));
    const overIt = await validate(plainToInstance(KnowledgeTestPbiDto, { comment: 'x'.repeat(3001) }));

    expect(atTheLimit).toHaveLength(0);
    expect(overIt).toHaveLength(1);
  });
});

describe('setKnowledgeTest', () => {
  const writtenFor = (api: ApiStub, partyId: string) =>
    api.patch.mock.calls[0][0].data.stakeholders.find((stakeholder: { externalId?: string }) => stakeholder.externalId === partyId);

  it('writes the status, the date and the comment beside the marking', async () => {
    const { controller, api } = makeController([applicantCompany, markedPbi]);

    await controller.setKnowledgeTest(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      mockSecondaryCitizenPartyId,
      { status: 'APPROVED', testedAt: '2026-10-02', comment: 'Provet togs i Sundsvall.' },
      mockRes(),
    );

    expect(writtenFor(api, mockSecondaryCitizenPartyId).parameters).toEqual([
      { key: 'PBI', values: ['true'] },
      { key: 'PBI_KNOWLEDGE_TEST', values: ['APPROVED'] },
      { key: 'PBI_KNOWLEDGE_TEST_DATE', values: ['2026-10-02'] },
      { key: 'PBI_KNOWLEDGE_TEST_COMMENT', values: ['Provet togs i Sundsvall.'] },
    ]);
  });

  it('lets a handler clear what was set, rather than storing a blank', async () => {
    const tested = {
      ...markedPbi,
      parameters: [
        { key: 'PBI', values: ['true'] },
        { key: 'PBI_KNOWLEDGE_TEST', values: ['BOOKED'] },
        { key: 'PBI_KNOWLEDGE_TEST_DATE', values: ['2026-10-02'] },
      ],
    };
    const { controller, api } = makeController([applicantCompany, tested]);

    await controller.setKnowledgeTest(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, { comment: '   ' }, mockRes());

    expect(writtenFor(api, mockSecondaryCitizenPartyId).parameters).toEqual([{ key: 'PBI', values: ['true'] }]);
  });

  it('refuses to write the knowledge test of someone who is not marked on the errand', async () => {
    const { controller, api } = makeController([applicantCompany]);

    await expect(
      controller.setKnowledgeTest(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, { status: 'APPROVED' }, mockRes()),
    ).rejects.toMatchObject({ status: 404 });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('refuses a municipality other than its own', async () => {
    const { controller, api } = makeController([applicantCompany, markedPbi]);
    const res = mockRes();

    await controller.setKnowledgeTest(mockReq(), mockSupportErrandId, '1984', mockSecondaryCitizenPartyId, { status: 'APPROVED' }, res);

    expect(res.statusCode).toBe(400);
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('reads the knowledge test back onto the person', async () => {
    const tested = {
      ...markedPbi,
      externalId: mockCitizenPartyId,
      parameters: [
        { key: 'PBI', values: ['true'] },
        { key: 'PBI_KNOWLEDGE_TEST', values: ['RETAKE'] },
        { key: 'PBI_KNOWLEDGE_TEST_DATE', values: ['2026-10-10'] },
        { key: 'PBI_KNOWLEDGE_TEST_COMMENT', values: ['Omprov bokat.'] },
      ],
    };
    const { controller } = makeController([applicantCompany, tested]);
    const res = mockRes();

    await controller.fetchPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

    expect((res.body as { people: object[] }).people[0]).toMatchObject({
      knowledgeTest: 'RETAKE',
      knowledgeTestDate: '2026-10-10',
      knowledgeTestComment: 'Omprov bokat.',
    });
  });
});

describe('the examinations standing beside each other', () => {
  const assessed = {
    ...markedPbi,
    parameters: [
      { key: 'PBI', values: ['true'] },
      { key: 'PBI_ASSESSMENT', values: ['APPROVED'] },
      { key: 'PBI_ASSESSMENT_COMMENT', values: ['Inget att anmärka.'] },
    ],
  };

  const tested = {
    ...markedPbi,
    parameters: [
      { key: 'PBI', values: ['true'] },
      { key: 'PBI_KNOWLEDGE_TEST', values: ['APPROVED'] },
      { key: 'PBI_KNOWLEDGE_TEST_DATE', values: ['2026-10-02'] },
    ],
  };

  const keysWritten = (api: ApiStub) =>
    api.patch.mock.calls[0][0].data.stakeholders
      .find((stakeholder: { externalId?: string }) => stakeholder.externalId === mockSecondaryCitizenPartyId)
      .parameters.map((parameter: { key: string }) => parameter.key);

  it('leaves the verdict on the person standing when the knowledge test is written', async () => {
    const { controller, api } = makeController([applicantCompany, assessed]);

    await controller.setKnowledgeTest(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, { status: 'FAILED' }, mockRes());

    expect(keysWritten(api)).toEqual(['PBI', 'PBI_ASSESSMENT', 'PBI_ASSESSMENT_COMMENT', 'PBI_KNOWLEDGE_TEST']);
  });

  it('leaves the knowledge test standing when the verdict on the person is written', async () => {
    const { controller, api } = makeController([applicantCompany, tested]);

    await controller.assessPbi(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, mockSecondaryCitizenPartyId, { assessment: 'DEFICIENCY' }, mockRes());

    expect(keysWritten(api)).toEqual(['PBI', 'PBI_KNOWLEDGE_TEST', 'PBI_KNOWLEDGE_TEST_DATE', 'PBI_ASSESSMENT']);
  });
});
