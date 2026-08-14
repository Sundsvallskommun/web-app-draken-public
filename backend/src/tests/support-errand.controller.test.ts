import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { apiServiceName } from '@/config/api-config';
import {
  SupportErrandController,
  SupportErrandDto,
  UpdateSupportErrandClassificationDto,
} from '@/controllers/supportmanagement/support-errand.controller';
import { Errand as SupportErrand, Label } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { ExternalIdType } from '@/interfaces/externalIdType.interface';

import { mockReq, mockRes, MockResponse, mockUser } from './helpers/http';
import {
  mockAdUsername,
  mockAttachmentId,
  mockCasedataErrandId,
  mockCasedataErrandNumber,
  mockCitizenPartyId,
  mockConversationId,
  mockDepartment,
  mockFileContent,
  mockFileName,
  mockFirstName,
  mockInvalidOrganizationNumber,
  mockLastName,
  mockMimeType,
  mockMunicipalityId,
  mockOrganizationName,
  mockOrganizationNumber,
  mockOrganizationNumberDigits,
  mockOrganizationPartyId,
  mockPersonNumber,
  mockRelationId,
  mockSecondaryCitizenPartyId,
  mockSupportErrandId,
  mockSupportErrandNumber,
  mockSupportNamespace,
} from './helpers/mock-data';

// createConversation/sendConversationTextMessage build their own ApiService internally,
// so they cannot be stubbed through the controller's instance fields.
vi.mock('@/services/message.service', async () => {
  const { mockConversationId } = await import('./helpers/mock-data');
  return {
    createConversation: vi.fn(async () => ({ id: mockConversationId })),
    sendConversationTextMessage: vi.fn(async () => ({})),
  };
});

import { createConversation, sendConversationTextMessage } from '@/services/message.service';

const SUPPORT_SERVICE = apiServiceName('supportmanagement');
const CITIZEN_SERVICE = apiServiceName('citizen');
const MUNICIPALITY_ID = mockMunicipalityId;
const NAMESPACE = mockSupportNamespace;

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

interface OrgStub {
  getOrganizationNumberByPartyId: ReturnType<typeof vi.fn>;
  getPartyIdByOrganizationNumber: ReturnType<typeof vi.fn>;
}

/**
 * `apiService` and `organizationService` are plain instance properties (the `private` keyword is
 * erased at runtime), so they can be replaced directly instead of mocking the modules.
 */
const makeController = () => {
  const controller = new SupportErrandController();
  const api: ApiStub = {
    get: vi.fn(async () => ({ data: {}, message: 'success' })),
    post: vi.fn(async () => ({ data: {}, message: 'success' })),
    patch: vi.fn(async () => ({ data: {}, message: 'success' })),
  };
  const organization: OrgStub = {
    getOrganizationNumberByPartyId: vi.fn(async () => ''),
    getPartyIdByOrganizationNumber: vi.fn(async () => ''),
  };
  (controller as unknown as { apiService: ApiStub }).apiService = api;
  (controller as unknown as { organizationService: OrgStub }).organizationService = organization;
  return { controller, api, organization };
};

/** All 15 query params of `errands`, in declaration order, so tests can override just one. */
const errandsArgs = (overrides: Partial<Record<string, unknown>> = {}) => {
  const q = {
    page: undefined,
    size: undefined,
    query: undefined,
    stakeholders: undefined,
    priority: undefined,
    category: undefined,
    type: undefined,
    labelCategory: undefined,
    labelType: undefined,
    labelSubType: undefined,
    channel: undefined,
    status: undefined,
    resolution: undefined,
    start: undefined,
    end: undefined,
    sort: undefined,
    ...overrides,
  } as Record<string, any>;
  return [
    q.page,
    q.size,
    q.query,
    q.stakeholders,
    q.priority,
    q.category,
    q.type,
    q.labelCategory,
    q.labelType,
    q.labelSubType,
    q.channel,
    q.status,
    q.resolution,
    q.start,
    q.end,
    q.sort,
  ] as [any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any];
};

/** The same params minus `page`/`size`/`sort`, matching `countErrands`. */
const countArgs = (overrides: Partial<Record<string, unknown>> = {}) => {
  const [, , ...rest] = errandsArgs(overrides);
  return rest.slice(0, 13) as [any, any, any, any, any, any, any, any, any, any, any, any, any];
};

/**
 * A CATEGORY tree shaped like the SupportManagement metadata: one CATEGORY root, an owning
 * PROVISION_CATEGORY, one CATEGORY under it and two TYPE leaves, plus an unrelated REPORT_TYPE root
 * that must never be treated as part of the classification.
 */
const classificationLabelStructure: Label[] = [
  {
    id: 'category-root-id',
    classification: 'CATEGORY_ROOT',
    resourceName: 'CATEGORY',
    resourcePath: 'CATEGORY',
    labels: [
      {
        id: 'category-owner-id',
        classification: 'PROVISION_CATEGORY',
        resourceName: 'HSL',
        resourcePath: 'CATEGORY/HSL',
        labels: [
          {
            id: 'category-label-id',
            classification: 'CATEGORY',
            resourceName: 'REHAB',
            resourcePath: 'CATEGORY/HSL/REHAB',
            labels: [
              { id: 'type-label-id', classification: 'TYPE', resourceName: 'MISSED', resourcePath: 'CATEGORY/HSL/REHAB/MISSED' },
              { id: 'other-type-label-id', classification: 'TYPE', resourceName: 'OTHER', resourcePath: 'CATEGORY/HSL/REHAB/OTHER' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'report-type-id',
    classification: 'REPORT_TYPE_ROOT',
    resourceName: 'REPORT_TYPE',
    resourcePath: 'REPORT_TYPE',
    labels: [{ id: 'deviation-id', classification: 'REPORT_TYPE', resourceName: 'DEVIATION', resourcePath: 'REPORT_TYPE/DEVIATION' }],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupportErrandController', () => {
  describe('municipality id guard', () => {
    it('rejects every municipality-scoped endpoint with 400 and makes no API call', async () => {
      const { controller, api } = makeController();
      const req = mockReq();

      const calls = [
        (res: MockResponse) => controller.errand(req, mockSupportErrandId, '', res),
        (res: MockResponse) => controller.errands(req, ...errandsArgs(), '', res),
        (res: MockResponse) => controller.countErrands(req, ...countArgs(), '', res),
        (res: MockResponse) => controller.registerSupportErrand(req, '', res),
        (res: MockResponse) => controller.updateSupportErrand(req, mockSupportErrandId, '', {}, res),
        (res: MockResponse) => controller.becomeAdminForSupportErrand(req, mockSupportErrandId, '', {}, res),
        (res: MockResponse) => controller.forwardSupportErrand(req, mockSupportErrandId, '', {}, res),
      ];

      for (const call of calls) {
        const res = mockRes();
        await call(res);
        expect(res.statusCode).toBe(400);
        expect(res.body).toBe('Municipality id missing');
      }
      expect(api.get).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
    });
  });

  describe('errand', () => {
    it('fetches the errand by id from the namespaced errands endpoint', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: { id: mockSupportErrandId }, message: 'success' });
      const res = mockRes();

      await controller.errand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, res);

      expect(api.get).toHaveBeenCalledWith(
        { url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}` },
        expect.anything(),
      );
      expect(res.body).toEqual({ id: mockSupportErrandId });
    });
  });

  describe('getSupportErrandByErrandNumber', () => {
    it('filters on errandNumber and returns the first hit', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: { content: [{ id: mockSupportErrandId }, { id: `${mockSupportErrandId}-second` }] }, message: 'success' });
      const res = mockRes();

      await controller.getSupportErrandByErrandNumber(mockReq(), mockSupportErrandNumber, res);

      expect(api.get).toHaveBeenCalledWith(
        { url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands?filter=errandNumber:'${mockSupportErrandNumber}'` },
        expect.anything(),
      );
      expect(res.body).toEqual({ id: mockSupportErrandId });
    });
  });

  describe('errands', () => {
    it('defaults to the first page of 8 and appends no filter or sort', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: { content: [] }, message: 'success' });

      await controller.errands(mockReq(), ...errandsArgs(), MUNICIPALITY_ID, mockRes());

      expect(api.get).toHaveBeenCalledWith({ url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands?page=0&size=8` }, expect.anything());
    });

    it('passes through page, size, sort and the built filter', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: { content: [] }, message: 'success' });

      await controller.errands(mockReq(), ...errandsArgs({ page: 2, size: 25, status: 'NEW', sort: 'created,desc' }), MUNICIPALITY_ID, mockRes());

      expect(api.get).toHaveBeenCalledWith(
        { url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands?page=2&size=25&filter=(status:'NEW')&sort=created,desc` },
        expect.anything(),
      );
    });

    it('responds with 200 and the page payload', async () => {
      const { controller, api } = makeController();
      const page = { content: [{ id: mockSupportErrandId }], totalElements: 1 };
      api.get.mockResolvedValue({ data: page, message: 'success' });
      const res = mockRes();

      await controller.errands(mockReq(), ...errandsArgs(), MUNICIPALITY_ID, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(page);
    });

    it('resolves an organization number in the query into a party id filter', async () => {
      const { controller, api, organization } = makeController();
      organization.getPartyIdByOrganizationNumber.mockResolvedValue(mockOrganizationPartyId);
      api.get.mockResolvedValue({ data: { content: [] }, message: 'success' });

      // The mock organization number is Luhn-valid and its third digit is > 1, which is what
      // marks it as an organization number rather than a personal number.
      await controller.errands(mockReq(), ...errandsArgs({ query: mockOrganizationNumber }), MUNICIPALITY_ID, mockRes());

      expect(organization.getPartyIdByOrganizationNumber).toHaveBeenCalledWith(MUNICIPALITY_ID, mockOrganizationNumberDigits, expect.anything());
      expect(api.get.mock.calls[0][0].url).toContain(`or exists(stakeholders.externalId~'*${mockOrganizationPartyId}*')`);
    });

    it('resolves a personal number in the query through the citizen service', async () => {
      const { controller, api } = makeController();
      api.get.mockImplementation(async ({ url }: { url: string }) =>
        url.includes('/guid') ? { data: mockCitizenPartyId, message: 'success' } : { data: { content: [] }, message: 'success' },
      );

      await controller.errands(mockReq(), ...errandsArgs({ query: mockPersonNumber }), MUNICIPALITY_ID, mockRes());

      expect(api.get).toHaveBeenCalledWith({ url: `${CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${mockPersonNumber}/guid` }, expect.anything());
      expect(api.get.mock.calls[1][0].url).toContain(`or exists(stakeholders.externalId~'*${mockCitizenPartyId}*')`);
    });

    it('still searches when the party id lookup fails', async () => {
      const { controller, api } = makeController();
      api.get.mockImplementation(async ({ url }: { url: string }) =>
        url.includes('/guid') ? Promise.reject(new Error('boom')) : { data: { content: [] }, message: 'success' },
      );

      await controller.errands(mockReq(), ...errandsArgs({ query: mockPersonNumber }), MUNICIPALITY_ID, mockRes());

      // Only the clause matching the raw query text remains; no extra party-id clause is added.
      expect(api.get.mock.calls[1][0].url.match(/stakeholders\.externalId~/g)).toHaveLength(1);
    });

    it('does not attempt a party id lookup for a plain text query', async () => {
      const { controller, api, organization } = makeController();
      api.get.mockResolvedValue({ data: { content: [] }, message: 'success' });

      await controller.errands(mockReq(), ...errandsArgs({ query: mockFirstName }), MUNICIPALITY_ID, mockRes());

      expect(organization.getPartyIdByOrganizationNumber).not.toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('does not attempt a party id lookup for a number that fails the Luhn check', async () => {
      const { controller, api, organization } = makeController();
      api.get.mockResolvedValue({ data: { content: [] }, message: 'success' });

      await controller.errands(mockReq(), ...errandsArgs({ query: mockInvalidOrganizationNumber }), MUNICIPALITY_ID, mockRes());

      expect(organization.getPartyIdByOrganizationNumber).not.toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('countErrands', () => {
    it('hits the count endpoint and returns 200 with the count', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: 42, message: 'success' });
      const res = mockRes();

      await controller.countErrands(mockReq(), ...countArgs({ status: 'NEW' }), MUNICIPALITY_ID, res);

      expect(api.get).toHaveBeenCalledWith(
        { url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands/count?filter=(status:'NEW')` },
        expect.anything(),
      );
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe(42);
    });

    it('omits the query string entirely when nothing is filtered on', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: 0, message: 'success' });

      await controller.countErrands(mockReq(), ...countArgs(), MUNICIPALITY_ID, mockRes());

      expect(api.get).toHaveBeenCalledWith({ url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands/count` }, expect.anything());
    });
  });

  describe('registerSupportErrand', () => {
    const metadata = { data: { labelStructure: [] }, message: 'success' };

    it('creates an empty errand owned by the requesting user with the drake defaults', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue(metadata);
      api.post.mockResolvedValue({ data: { id: mockSupportErrandId }, message: 'success' });
      const res = mockRes();

      await controller.registerSupportErrand(mockReq(mockUser()), MUNICIPALITY_ID, res);

      const [config] = api.post.mock.calls[0];
      expect(config.url).toBe(`${MUNICIPALITY_ID}/${NAMESPACE}/errands`);
      expect(config.data).toEqual({
        reporterUserId: mockAdUsername,
        assignedUserId: mockAdUsername,
        // setup.ts pins APPLICATION to KC, which configures a classification but no labels.
        classification: { category: 'CONTACT_SUNDSVALL', type: 'UNCATEGORIZED' },
        labels: [],
        priority: 'MEDIUM',
        status: 'NEW',
        channel: 'PHONE',
        title: 'Empty errand',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({ id: mockSupportErrandId });
    });

    it('fetches the label metadata before creating the errand', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue(metadata);
      api.post.mockResolvedValue({ data: { id: mockSupportErrandId }, message: 'success' });

      await controller.registerSupportErrand(mockReq(), MUNICIPALITY_ID, mockRes());

      expect(api.get).toHaveBeenCalledWith({ url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/metadata/labels` }, expect.anything());
    });

    it('responds 500 when the API returns an empty body', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue(metadata);
      api.post.mockResolvedValue({ data: '', message: 'success' });
      const res = mockRes();

      await controller.registerSupportErrand(mockReq(), MUNICIPALITY_ID, res);

      expect(res.statusCode).toBe(500);
      expect(res.body).toBe('Something went wrong when initiating support errand');
    });

    it('rethrows when the API call fails', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue(metadata);
      api.post.mockRejectedValue(new Error('upstream down'));

      await expect(controller.registerSupportErrand(mockReq(), MUNICIPALITY_ID, mockRes())).rejects.toThrow('upstream down');
    });
  });

  describe('updateSupportErrand', () => {
    it('patches the errand with the supplied body and responds 200', async () => {
      const { controller, api } = makeController();
      api.patch.mockResolvedValue({ data: { id: mockSupportErrandId }, message: 'success' });
      const res = mockRes();

      await controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { title: 'Ny titel', status: 'ONGOING' }, res);

      const [config] = api.patch.mock.calls[0];
      expect(config.url).toBe(`${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}`);
      expect(config.data).toEqual({ title: 'Ny titel', status: 'ONGOING' });
      expect(res.statusCode).toBe(200);
    });

    it('rethrows when the patch fails', async () => {
      const { controller, api } = makeController();
      api.patch.mockRejectedValue(new Error('upstream down'));

      await expect(controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { title: 'x' }, mockRes())).rejects.toThrow(
        'upstream down',
      );
    });
  });

  describe('becomeAdminForSupportErrand', () => {
    it('sends only assignedUserId and status, discarding every other field', async () => {
      const { controller, api } = makeController();
      api.patch.mockResolvedValue({ data: { id: mockSupportErrandId }, message: 'success' });

      await controller.becomeAdminForSupportErrand(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        { assignedUserId: mockAdUsername, status: 'ONGOING', title: 'should be dropped', description: 'also dropped' },
        mockRes(),
      );

      expect(api.patch.mock.calls[0][0].data).toEqual({ assignedUserId: mockAdUsername, status: 'ONGOING' });
    });
  });

  describe('preparedErrandResponse', () => {
    const errandWith = (stakeholders: SupportErrand['stakeholders']): SupportErrand => ({ stakeholders }) as SupportErrand;

    it('resolves the personal number of a PRIVATE primary stakeholder', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: mockPersonNumber, message: 'success' });
      const errand = errandWith([{ role: 'PRIMARY', externalId: mockCitizenPartyId, externalIdType: ExternalIdType.PRIVATE }]);

      const result = await controller.preparedErrandResponse(errand, mockReq());

      expect(api.get).toHaveBeenCalledWith({ url: `${CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${mockCitizenPartyId}/personnumber` }, expect.anything());
      expect((result.data.stakeholders![0] as { personNumber?: string }).personNumber).toBe(mockPersonNumber);
      expect(result.message).toBe('success');
    });

    it('resolves personal numbers for EMPLOYEE stakeholders too', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: mockPersonNumber, message: 'success' });
      const errand = errandWith([{ role: 'PRIMARY', externalId: mockCitizenPartyId, externalIdType: ExternalIdType.EMPLOYEE }]);

      const result = await controller.preparedErrandResponse(errand, mockReq());

      expect(api.get).toHaveBeenCalledWith({ url: `${CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${mockCitizenPartyId}/personnumber` }, expect.anything());
      expect((result.data.stakeholders![0] as { personNumber?: string }).personNumber).toBe(mockPersonNumber);
    });

    it('skips company and enterprise stakeholders', async () => {
      const { controller, api } = makeController();
      const errand = errandWith([
        { role: 'PRIMARY', externalId: mockOrganizationPartyId, externalIdType: ExternalIdType.COMPANY },
        { role: 'CONTACT', externalId: mockOrganizationPartyId, externalIdType: ExternalIdType.ENTERPRISE },
      ]);

      await controller.preparedErrandResponse(errand, mockReq());

      expect(api.get).not.toHaveBeenCalled();
    });

    it('leaves the personal number undefined when the lookup fails', async () => {
      const { controller, api } = makeController();
      api.get.mockRejectedValue(new Error('404'));
      const errand = errandWith([{ role: 'PRIMARY', externalId: mockCitizenPartyId, externalIdType: ExternalIdType.PRIVATE }]);

      const result = await controller.preparedErrandResponse(errand, mockReq());

      expect((result.data.stakeholders![0] as { personNumber?: string }).personNumber).toBeUndefined();
    });

    it('resolves personal numbers for non-primary contacts as well', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: mockPersonNumber, message: 'success' });
      const errand = errandWith([
        { role: 'PRIMARY', externalId: mockCitizenPartyId, externalIdType: ExternalIdType.PRIVATE },
        { role: 'CONTACT', externalId: mockSecondaryCitizenPartyId, externalIdType: ExternalIdType.PRIVATE },
      ]);

      const result = await controller.preparedErrandResponse(errand, mockReq());

      expect(api.get).toHaveBeenCalledTimes(2);
      expect((result.data.stakeholders![1] as { personNumber?: string }).personNumber).toBe(mockPersonNumber);
    });

    it('makes no calls for an errand without stakeholders', async () => {
      const { controller, api } = makeController();

      const result = await controller.preparedErrandResponse({} as SupportErrand, mockReq());

      expect(api.get).not.toHaveBeenCalled();
      expect(result).toEqual({ data: {}, message: 'success' });
    });

    it('does not mutate the errand or its stakeholders', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: mockPersonNumber, message: 'success' });
      const stakeholder = { role: 'PRIMARY', externalId: mockCitizenPartyId, externalIdType: ExternalIdType.PRIVATE };
      const errand = errandWith([stakeholder]);

      const result = await controller.preparedErrandResponse(errand, mockReq());

      expect(stakeholder).not.toHaveProperty('personNumber');
      expect(errand.stakeholders![0]).not.toHaveProperty('personNumber');
      expect(result.data).not.toBe(errand);
      expect((result.data.stakeholders![0] as { personNumber?: string }).personNumber).toBe(mockPersonNumber);
    });

    it('leaves stakeholders that are neither the first PRIMARY nor a contact untouched', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: mockPersonNumber, message: 'success' });
      const errand = errandWith([
        { role: 'PRIMARY', externalId: mockCitizenPartyId, externalIdType: ExternalIdType.PRIVATE },
        { role: 'PRIMARY', externalId: mockSecondaryCitizenPartyId, externalIdType: ExternalIdType.PRIVATE },
      ]);

      const result = await controller.preparedErrandResponse(errand, mockReq());

      expect(api.get).toHaveBeenCalledTimes(1);
      expect((result.data.stakeholders![1] as { personNumber?: string }).personNumber).toBeUndefined();
    });
  });

  describe('forwardSupportErrand', () => {
    const forwardBody = { department: mockDepartment, message: 'Vidarebefordras', messageBodyPlaintext: '' };

    const supportErrand = (overrides: Partial<SupportErrand> = {}): SupportErrand =>
      ({
        id: mockSupportErrandId,
        errandNumber: mockSupportErrandNumber,
        channel: 'EMAIL',
        priority: 'MEDIUM',
        stakeholders: [{ role: 'PRIMARY', firstName: mockFirstName, lastName: mockLastName, externalIdType: ExternalIdType.PRIVATE }],
        parameters: [],
        ...overrides,
      }) as SupportErrand;

    /** Routes the four different GETs the forward flow performs. */
    const routeGets = (api: ApiStub, errand: SupportErrand, opts: { attachments?: unknown[]; relations?: unknown[] } = {}) => {
      api.get.mockImplementation(async ({ url }: { url: string }) => {
        if (url.includes('/attachments/')) return { data: new Uint8Array(Buffer.from(mockFileContent)).buffer, message: 'success' };
        if (url.includes('/attachments')) return { data: opts.attachments ?? [], message: 'success' };
        if (url.includes('/relations')) return { data: { relations: opts.relations ?? [] }, message: 'success' };
        return { data: errand, message: 'success' };
      });
    };

    it('rejects a missing errand id with 400', async () => {
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.forwardSupportErrand(mockReq(), '', MUNICIPALITY_ID, forwardBody, res);

      expect(res.statusCode).toBe(400);
      expect(res.body).toBe('Errand id missing');
      expect(api.get).not.toHaveBeenCalled();
    });

    it('rejects a stakeholder that has neither a first name nor an organization name', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand({ stakeholders: [{ role: 'PRIMARY', externalIdType: ExternalIdType.PRIVATE }] }));
      const res = mockRes();

      await controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, forwardBody, res);

      expect(res.body).toBe('Missing required fields for stakeholder');
      expect(res.statusCode).toBe(400);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('creates a CaseData errand from the support errand and responds 200', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand());
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });
      const res = mockRes();

      await controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, forwardBody, res);

      const [config] = api.post.mock.calls[0];
      expect(config.url).toBe(`${MUNICIPALITY_ID}/${mockDepartment}/errands`);
      expect(config.params).toEqual({ referredFrom: `REFERRED_FROM|${mockSupportErrandId};case;supportmanagement;${NAMESPACE}|` });
      expect(config.data).toMatchObject({
        channel: 'EMAIL',
        priority: 'MEDIUM',
        extraParameters: [{ key: 'supportManagementErrandNumber', values: [mockSupportErrandNumber] }],
      });
      expect(config.data.stakeholders).toEqual([expect.objectContaining({ type: 'PERSON', firstName: mockFirstName, lastName: mockLastName })]);
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber });
    });

    it('prefers the organizationNumber parameter over a Legal Entity lookup', async () => {
      const { controller, api, organization } = makeController();
      routeGets(
        api,
        supportErrand({
          stakeholders: [
            {
              role: 'PRIMARY',
              organizationName: mockOrganizationName,
              externalId: mockOrganizationPartyId,
              externalIdType: ExternalIdType.COMPANY,
              parameters: [{ key: 'organizationNumber', values: [mockOrganizationNumberDigits] }],
            },
          ],
        }),
      );
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });

      await controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, forwardBody, mockRes());

      expect(organization.getOrganizationNumberByPartyId).not.toHaveBeenCalled();
      expect(api.post.mock.calls[0][0].data.stakeholders[0]).toMatchObject({
        type: 'ORGANIZATION',
        organizationNumber: mockOrganizationNumber,
      });
    });

    it('falls back to a Legal Entity lookup when the parameter is absent', async () => {
      const { controller, api, organization } = makeController();
      organization.getOrganizationNumberByPartyId.mockResolvedValue(mockOrganizationNumberDigits);
      routeGets(
        api,
        supportErrand({
          stakeholders: [
            { role: 'PRIMARY', organizationName: mockOrganizationName, externalId: mockOrganizationPartyId, externalIdType: ExternalIdType.COMPANY },
          ],
        }),
      );
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });

      await controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, forwardBody, mockRes());

      expect(organization.getOrganizationNumberByPartyId).toHaveBeenCalledWith(MUNICIPALITY_ID, mockOrganizationPartyId, expect.anything());
      expect(api.post.mock.calls[0][0].data.stakeholders[0]).toMatchObject({ organizationNumber: mockOrganizationNumber });
    });

    it('still forwards when the organization number cannot be resolved', async () => {
      const { controller, api, organization } = makeController();
      organization.getOrganizationNumberByPartyId.mockRejectedValue(new Error('legal entity down'));
      routeGets(
        api,
        supportErrand({
          stakeholders: [
            { role: 'PRIMARY', organizationName: mockOrganizationName, externalId: mockOrganizationPartyId, externalIdType: ExternalIdType.COMPANY },
          ],
        }),
      );
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });
      const res = mockRes();

      await controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, forwardBody, res);

      expect(api.post.mock.calls[0][0].data.stakeholders[0]).not.toHaveProperty('organizationNumber');
      expect(res.statusCode).toBe(200);
    });

    it('copies the support errand attachments onto the CaseData errand', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand(), { attachments: [{ id: mockAttachmentId, fileName: mockFileName, mimeType: mockMimeType }] });
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });

      await controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, forwardBody, mockRes());

      const attachmentPost = api.post.mock.calls.find(([config]) => config.url.includes('/attachments'));
      expect(attachmentPost![0].url).toBe(`${MUNICIPALITY_ID}/${mockDepartment}/errands/${mockCasedataErrandId}/attachments`);
      const attachmentBody = attachmentPost![0].data.getBuffer().toString();
      expect(attachmentBody).toContain(`name="file"; filename="${mockFileName}"`);
      expect(attachmentBody).toContain(mockFileContent);
      expect(attachmentBody).not.toContain(Buffer.from(mockFileContent).toString('base64'));
      expect(attachmentBody).toContain(
        JSON.stringify({
          category: 'OTHER',
          extension: 'pdf',
          mimeType: mockMimeType,
          name: mockFileName,
          note: '',
          errandNumber: mockCasedataErrandNumber,
          channel: 'WEB_UI',
        }),
      );
    });

    it('responds 400 ATTACHMENTS_FAILED when an attachment cannot be copied', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand(), { attachments: [{ id: mockAttachmentId, fileName: mockFileName, mimeType: mockMimeType }] });
      api.post.mockImplementation(async ({ url }: { url: string }) => {
        if (url.includes('/attachments')) throw new Error('attachment rejected');
        return { data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' };
      });
      const res = mockRes();

      await controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, forwardBody, res);

      expect(res.body).toBe('ATTACHMENTS_FAILED');
      expect(res.statusCode).toBe(400);
    });

    it('creates a conversation message when a plaintext body and a REFERRED_FROM relation exist', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand(), { relations: [{ id: mockRelationId, type: 'REFERRED_FROM' }] });
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });

      await controller.forwardSupportErrand(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        { ...forwardBody, messageBodyPlaintext: 'Hej' },
        mockRes(),
      );

      expect(createConversation).toHaveBeenCalledWith(String(mockCasedataErrandId), expect.anything(), 'INTERNAL', 'Överlämning', mockDepartment, [
        mockRelationId,
      ]);
      expect(sendConversationTextMessage).toHaveBeenCalledWith(
        String(mockCasedataErrandId),
        mockConversationId,
        expect.anything(),
        'Vidarebefordras',
        mockDepartment,
      );
    });

    it('skips the conversation when the plaintext body is blank', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand(), { relations: [{ id: mockRelationId, type: 'REFERRED_FROM' }] });
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });

      await controller.forwardSupportErrand(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        { ...forwardBody, messageBodyPlaintext: '   ' },
        mockRes(),
      );

      expect(createConversation).not.toHaveBeenCalled();
    });

    it('skips the conversation when no REFERRED_FROM relation is found', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand(), { relations: [{ id: mockRelationId, type: 'SOMETHING_ELSE' }] });
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });

      await controller.forwardSupportErrand(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        { ...forwardBody, messageBodyPlaintext: 'Hej' },
        mockRes(),
      );

      expect(createConversation).not.toHaveBeenCalled();
    });

    it('still returns the forwarded errand when the conversation fails', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand(), { relations: [{ id: mockRelationId, type: 'REFERRED_FROM' }] });
      api.post.mockResolvedValue({ data: { id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber }, message: 'success' });
      vi.mocked(createConversation).mockRejectedValueOnce(new Error('conversation service down'));
      const res = mockRes();

      await controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, { ...forwardBody, messageBodyPlaintext: 'Hej' }, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ id: mockCasedataErrandId, errandNumber: mockCasedataErrandNumber });
    });

    it('rethrows when the CaseData errand cannot be created', async () => {
      const { controller, api } = makeController();
      routeGets(api, supportErrand());
      api.post.mockRejectedValue(new Error('casedata down'));

      await expect(controller.forwardSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, forwardBody, mockRes())).rejects.toThrow(
        'casedata down',
      );
    });
  });
});

describe('SupportErrandDto write boundary', () => {
  it('accepts the optimistic locking version returned on existing parameters', async () => {
    const payload = plainToInstance(SupportErrandDto, {
      parameters: [
        { key: 'eventType', values: ['DEVIATION'], version: 1 },
        { key: 'eventConcerns', values: ['PERSON'], version: 2 },
      ],
    });

    await expect(validate(payload, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
  });

  it('rejects jsonParameters so the generic errand PATCH cannot overwrite document arrays', async () => {
    const payload = plainToInstance(SupportErrandDto, {
      title: 'Allowed errand update',
      jsonParameters: [
        {
          key: 'avvikelse-plats-handelse',
          schemaId: '2281_avvikelse-plats-handelse_1.0',
          value: { description: 'Must stay read-only here' },
        },
      ],
    });

    const validationErrors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });

    expect(validationErrors.some(error => error.property === 'jsonParameters')).toBe(true);
  });
});

describe('UpdateSupportErrandClassificationDto', () => {
  it('accepts only classification and label id references', async () => {
    const validPayload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: 7,
      classification: { category: 'HSL', type: 'REHAB' },
      categoryLabels: [{ id: 'label-id' }],
    });
    const invalidPayload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: -1,
      classification: { category: 'HSL', type: 'REHAB', displayName: 'Not writable' },
      categoryLabels: [{ id: 'label-id', displayName: 'Not writable' }],
      labels: [{ id: 'stale-full-label-list-is-not-writable' }],
      title: 'Not writable',
    });

    await expect(validate(validPayload, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);

    const serializedErrors = JSON.stringify(await validate(invalidPayload, { whitelist: true, forbidNonWhitelisted: true }));
    expect(serializedErrors).toMatch(/title/);
    expect(serializedErrors).toMatch(/displayName/);
  });

  it('rejects empty classification values and an empty label selection', async () => {
    const payload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: -1,
      classification: { category: '', type: '' },
      categoryLabels: [],
    });

    const serializedErrors = JSON.stringify(await validate(payload, { whitelist: true, forbidNonWhitelisted: true }));

    expect(serializedErrors).toMatch(/category/);
    expect(serializedErrors).toMatch(/type/);
    expect(serializedErrors).toMatch(/categoryLabels/);
    expect(serializedErrors).toMatch(/expectedVersion/);
  });
});

describe('updateSupportErrandClassification', () => {
  const errandUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}`;

  const update = (): UpdateSupportErrandClassificationDto => ({
    expectedVersion: 7,
    classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
    categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
  });

  /** Routes the metadata GET to the label tree and successive errand GETs to `errandReads`. */
  const routeClassificationGets = (api: ApiStub, errandReads: unknown[]) => {
    let read = 0;
    api.get.mockImplementation(async (config: { url?: string }) => {
      if (config.url?.endsWith('/metadata/labels')) {
        return { data: { labelStructure: classificationLabelStructure }, message: 'success' };
      }
      const next = errandReads[Math.min(read++, errandReads.length - 1)];
      if (next instanceof Error) throw next;
      return next;
    });
  };

  it('patches only classification and label ids and propagates upstream client errors', async () => {
    const { controller, api } = makeController();
    const savedErrand = {
      id: mockSupportErrandId,
      version: 8,
      labels: [
        { id: 'report-type-id', classification: 'REPORT-TYPE', resourcePath: 'REPORT_TYPE/DEVIATION' },
        { id: 'category-owner-id', classification: 'PROVISION-CATEGORY', resourcePath: 'CATEGORY/HSL' },
        { id: 'category-label-id', classification: 'CATEGORY', resourcePath: 'CATEGORY/HSL/REHAB' },
        { id: 'type-label-id', classification: 'TYPE', resourcePath: 'CATEGORY/HSL/REHAB/MISSED' },
      ],
    };
    routeClassificationGets(api, [
      {
        data: {
          id: mockSupportErrandId,
          version: 7,
          labels: [
            { id: 'report-type-id', resourcePath: 'REPORT_TYPE/DEVIATION' },
            { id: 'old-category-id', resourcePath: 'CATEGORY/HSL/OLD' },
          ],
        },
        message: 'success',
      },
      { data: savedErrand, message: 'success' },
    ]);
    const req = mockReq();
    const res = mockRes();

    await controller.updateSupportErrandClassification(req, mockSupportErrandId, MUNICIPALITY_ID, update(), res);

    expect(api.get).toHaveBeenCalledTimes(3);
    expect(api.patch).toHaveBeenCalledTimes(1);

    const [patchConfig, forwardedUser] = api.patch.mock.calls[0];
    expect(patchConfig.url).toBe(errandUrl);
    expect(patchConfig.data).toEqual({
      classification: update().classification,
      labels: [{ id: 'report-type-id' }, { id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    });
    expect(patchConfig.headers).toEqual({ 'If-Match': '"7"' });
    expect(patchConfig.propagateClientError).toBe(true);
    expect(forwardedUser).toBe(req.user);

    // Both errand reads must opt into headers so the ETag is available, and into error propagation.
    for (const call of [api.get.mock.calls[0], api.get.mock.calls[2]]) {
      expect(call[0]).toEqual({ url: errandUrl, baseURL: patchConfig.baseURL, includeResponseHeaders: true, propagateClientError: true });
    }
    expect(api.get.mock.calls[1][0].url).toMatch(/\/metadata\/labels$/);
    expect(api.get.mock.calls[1][0].propagateClientError).toBe(true);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(savedErrand);
  });

  it('rejects a classification based on an older errand version before patching', async () => {
    const { controller, api } = makeController();
    routeClassificationGets(api, [{ data: { id: mockSupportErrandId, version: 8, labels: [] }, message: 'success' }]);

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({ status: 409, message: 'Support errand classification has changed since it was loaded' });

    expect(api.patch).not.toHaveBeenCalled();
  });

  it('stops before patching when Support Management omits concurrency metadata', async () => {
    const { controller, api } = makeController();
    routeClassificationGets(api, [{ data: { id: mockSupportErrandId, labels: [] }, message: 'success' }]);

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({ status: 502, message: 'Support Management response is missing a valid errand version' });

    expect(api.patch).not.toHaveBeenCalled();
  });

  it('stops before patching when Support Management classification metadata is unavailable', async () => {
    const { controller, api } = makeController();
    api.get.mockImplementation(async (config: { url?: string }) =>
      config.url?.endsWith('/metadata/labels')
        ? { data: null, message: 'success' }
        : { data: { id: mockSupportErrandId, version: 7, labels: [] }, message: 'success' },
    );

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({ status: 502, message: 'Support Management classification metadata is unavailable' });

    expect(api.patch).not.toHaveBeenCalled();
  });

  for (const invalidETag of ['W/"7"', '']) {
    it(`uses the errand version when Support Management returns the unusable ETag ${JSON.stringify(invalidETag)}`, async () => {
      const { controller, api } = makeController();
      routeClassificationGets(api, [
        { data: { id: mockSupportErrandId, version: 7, labels: [] }, message: 'success', headers: { etag: invalidETag } },
        { data: { id: mockSupportErrandId, version: 8 }, message: 'success', headers: { etag: invalidETag } },
      ]);

      await controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes());

      expect(api.patch.mock.calls[0][0].headers).toEqual({ 'If-Match': '"7"' });
    });
  }

  it('uses a strong errand ETag when the response body omits its version', async () => {
    const { controller, api } = makeController();
    routeClassificationGets(api, [
      { data: { id: mockSupportErrandId, labels: [] }, message: 'success', headers: { etag: '"7"' } },
      { data: { id: mockSupportErrandId, version: 8 }, message: 'success', headers: { etag: '"8"' } },
    ]);

    await controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes());

    expect(api.patch.mock.calls[0][0].headers).toEqual({ 'If-Match': '"7"' });
  });

  it('stops when the strong errand ETag disagrees with the response body version', async () => {
    const { controller, api } = makeController();
    routeClassificationGets(api, [{ data: { id: mockSupportErrandId, version: 7, labels: [] }, message: 'success', headers: { etag: '"8"' } }]);

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({ status: 502, message: 'Support Management response contains inconsistent errand versions' });

    expect(api.patch).not.toHaveBeenCalled();
  });

  it('propagates a readback client error after the classification patch has succeeded', async () => {
    const { controller, api } = makeController();
    const readbackError = new HttpException(403, 'Readback forbidden');
    routeClassificationGets(api, [{ data: { id: mockSupportErrandId, version: 7, labels: [] }, message: 'success' }, readbackError]);

    await expect(controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes())).rejects.toBe(
      readbackError,
    );

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(api.get.mock.calls[2][0].propagateClientError).toBe(true);
  });
});
