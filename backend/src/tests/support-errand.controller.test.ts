import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Response } from 'express';
import { getMetadataArgsStorage } from 'routing-controllers';

import { apiServiceName } from '@/config/api-config';
import { getSupportInvestigationProfile } from '@/config/support-investigation-profile';
import {
  AssignSupportErrandDto,
  SupportErrandController,
  SupportErrandDto,
  UpdateSupportErrandClassificationDto,
  UpdateSupportErrandPhaseDto,
  UpdateSupportErrandStatusDto,
} from '@/controllers/supportmanagement/support-errand.controller';
import { Errand as SupportErrand, Label } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { ExternalIdType } from '@/interfaces/externalIdType.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import { getNewErrandDefaults, NewErrandDefaults } from '@/services/support-errand.service';
import { SupportInvestigationDocumentService } from '@/services/support-investigation-document.service';
import { SupportErrandClassificationOwner, SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

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
const makeController = (classificationOwner: SupportErrandClassificationOwner = 'investigation') => {
  const controller = new SupportErrandController();
  const api: ApiStub = {
    get: vi.fn(async () => ({ data: { version: 7, status: 'ONGOING' }, headers: { etag: '"7"' }, message: 'success' })),
    post: vi.fn(async () => ({ data: {}, message: 'success' })),
    patch: vi.fn(async () => ({ data: {}, message: 'success' })),
  };
  const organization: OrgStub = {
    getOrganizationNumberByPartyId: vi.fn(async () => ''),
    getPartyIdByOrganizationNumber: vi.fn(async () => ''),
  };
  const configuredProfile = getSupportInvestigationProfile('IAF');
  const investigationPolicy = {
    getClassificationOwner: vi.fn(async () => classificationOwner),
    getRegistrationState: vi.fn(async () => (classificationOwner === 'unavailable' ? 'unavailable' : 'enabled')),
    profile: configuredProfile,
    labelFilter: configuredProfile.labelFilter,
    classificationPolicy: configuredProfile.classificationPolicy,
    assertCanWriteDocument: vi.fn(),
    filterProtectedJsonParameters: vi.fn((errand: unknown) => errand),
  };
  const investigationDocument = {
    readDocument: vi.fn(async () => ({
      document: {
        key: 'utredning-enhetschef',
        schemaId: '2281_utredning-enhetschef_1.0',
        value: { legalBases: ['HSL'] },
        version: 3,
      },
      etag: '"3"',
      status: 200,
    })),
  };
  (controller as unknown as { apiService: ApiStub }).apiService = api;
  (controller as unknown as { organizationService: OrgStub }).organizationService = organization;
  (controller as unknown as { investigationPolicyService: SupportInvestigationPolicyService }).investigationPolicyService =
    investigationPolicy as unknown as SupportInvestigationPolicyService;
  (controller as unknown as { investigationDocumentService: SupportInvestigationDocumentService }).investigationDocumentService =
    investigationDocument as unknown as SupportInvestigationDocumentService;
  return { controller, api, organization, investigationPolicy, investigationDocument };
};

/** All query params of `errands`, in declaration order, so tests can override just one. */
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
    labelFilter: undefined,
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
    q.labelFilter,
    q.channel,
    q.status,
    q.resolution,
    q.start,
    q.end,
    q.sort,
  ] as [any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any];
};

/** The same params minus `page`/`size`/`sort`, matching `countErrands`. */
const countArgs = (overrides: Partial<Record<string, unknown>> = {}) => {
  const [, , ...rest] = errandsArgs(overrides);
  return rest.slice(0, 14) as [any, any, any, any, any, any, any, any, any, any, any, any, any, any];
};

const upstreamFilter = (url: string): string => new URL(url, 'http://draken.local').searchParams.get('filter') ?? '';

const routeMiddlewares = (method: 'updateSupportErrand' | 'becomeAdminForSupportErrand') =>
  getMetadataArgsStorage().uses.filter(candidate => candidate.target === SupportErrandController && candidate.method === method);

const runMiddleware = async (
  middleware: (req: RequestWithUser & { body?: unknown }, response: Response, next: NextFunction) => unknown,
  req: RequestWithUser & { body?: unknown },
): Promise<unknown> =>
  new Promise(resolve => {
    const next: NextFunction = error => resolve(error);
    Promise.resolve(middleware(req, {} as Response, next)).catch(resolve);
  });

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

const labelFilterLabelStructure: Label[] = [
  {
    id: 'provision-root-id',
    classification: 'PROVISION_ROOT',
    resourceName: 'PROVISION',
    resourcePath: 'PROVISION',
    labels: [
      {
        id: 'provision-hsl-id',
        classification: 'PROVISION',
        resourceName: 'HSL',
        resourcePath: 'PROVISION/HSL',
      },
    ],
  },
  ...classificationLabelStructure,
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupportErrandController', () => {
  describe.each([
    ['updateSupportErrand', { title: 'Updated' }],
    ['becomeAdminForSupportErrand', { assignedUserId: mockAdUsername }],
  ] as const)('%s route contract', (method, body) => {
    it('requires authentication and Support Management edit permission', async () => {
      const middlewares = routeMiddlewares(method);
      expect(middlewares.some(use => use.middleware === authMiddleware && use.afterAction === false)).toBe(true);

      const req = Object.assign(mockReq(mockUser({ permissions: { canEditSupportManagement: false } } as never)), { body });
      const errors = await Promise.all(
        middlewares.filter(use => use.middleware !== authMiddleware).map(use => runMiddleware(use.middleware as never, req)),
      );

      expect(errors).toContainEqual(expect.objectContaining({ status: 403, message: 'Missing permissions' }));
    });
  });

  describe('municipality id guard', () => {
    it('rejects every municipality-scoped endpoint with 400 and makes no API call', async () => {
      const { controller, api } = makeController();
      const req = mockReq();

      const calls = [
        (res: MockResponse) => controller.errand(req, mockSupportErrandId, '', res),
        (res: MockResponse) => controller.errands(req, ...errandsArgs(), '', res),
        (res: MockResponse) => controller.countErrands(req, ...countArgs(), '', res),
        (res: MockResponse) => controller.registerSupportErrand(req, '', res),
        (res: MockResponse) => controller.updateSupportErrand(req, mockSupportErrandId, '', undefined, {}, res),
        (res: MockResponse) =>
          controller.updateSupportErrandStatus(req, mockSupportErrandId, '', { expectedVersion: 1, expectedStatus: 'NEW', status: 'ONGOING' }, res),
        (res: MockResponse) => controller.updateSupportErrandPhase(req, mockSupportErrandId, '', { expectedVersion: 1, transitionId: 'next' }, res),
        (res: MockResponse) =>
          controller.becomeAdminForSupportErrand(req, mockSupportErrandId, '', undefined, { assignedUserId: mockAdUsername }, res),
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
        {
          url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands?page=2&size=25&filter=%28status%3A%27NEW%27%29&sort=created%2Cdesc`,
        },
        expect.anything(),
      );
    });

    it('validates generic label selections against the runtime profile and live metadata', async () => {
      const { controller, api } = makeController();
      api.get.mockImplementation(async ({ url }: { url: string }) =>
        url.includes('/metadata/labels')
          ? { data: { labelStructure: labelFilterLabelStructure }, message: 'success' }
          : { data: { content: [] }, message: 'success' },
      );
      const labelFilter = JSON.stringify([
        { groupKey: 'classification', fieldKey: 'category', resourcePath: 'CATEGORY/HSL/REHAB' },
        { groupKey: 'classification', fieldKey: 'type', resourcePath: 'CATEGORY/HSL/REHAB/MISSED' },
      ]);

      await controller.errands(mockReq(), ...errandsArgs({ status: 'NEW', labelFilter }), MUNICIPALITY_ID, mockRes());

      expect(api.get.mock.calls[0][0]).toMatchObject({
        url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/metadata/labels`,
        propagateClientError: true,
      });
      const filter = upstreamFilter(api.get.mock.calls[1][0].url);
      expect(filter).toContain("status:'NEW'");
      expect(filter).toContain("exists(labels.metadataLabel.resourcePath:'CATEGORY/HSL/REHAB/MISSED')");
      expect(filter).not.toContain("resourcePath:'CATEGORY/HSL/REHAB') or");
      expect(filter).toContain(' and ');
    });

    it('rejects malformed or crafted generic label selections before searching errands', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: { labelStructure: labelFilterLabelStructure }, message: 'success' });

      await expect(
        controller.errands(
          mockReq(),
          ...errandsArgs({
            labelFilter: JSON.stringify([{ groupKey: 'classification', fieldKey: 'type', resourcePath: 'REPORT_TYPE/DEVIATION' }]),
          }),
          MUNICIPALITY_ID,
          mockRes(),
        ),
      ).rejects.toMatchObject({ status: 400 });
      await expect(controller.errands(mockReq(), ...errandsArgs({ labelFilter: '{invalid' }), MUNICIPALITY_ID, mockRes())).rejects.toMatchObject({
        status: 400,
        message: 'Support Management labelFilter must be a valid JSON array',
      });
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
      expect(upstreamFilter(api.get.mock.calls[0][0].url)).toContain(`or exists(stakeholders.externalId~'*${mockOrganizationPartyId}*')`);
    });

    it('resolves a personal number in the query through the citizen service', async () => {
      const { controller, api } = makeController();
      api.get.mockImplementation(async ({ url }: { url: string }) =>
        url.includes('/guid') ? { data: mockCitizenPartyId, message: 'success' } : { data: { content: [] }, message: 'success' },
      );

      await controller.errands(mockReq(), ...errandsArgs({ query: mockPersonNumber }), MUNICIPALITY_ID, mockRes());

      expect(api.get).toHaveBeenCalledWith({ url: `${CITIZEN_SERVICE}/${MUNICIPALITY_ID}/${mockPersonNumber}/guid` }, expect.anything());
      expect(upstreamFilter(api.get.mock.calls[1][0].url)).toContain(`or exists(stakeholders.externalId~'*${mockCitizenPartyId}*')`);
    });

    it('still searches when the party id lookup fails', async () => {
      const { controller, api } = makeController();
      api.get.mockImplementation(async ({ url }: { url: string }) =>
        url.includes('/guid') ? Promise.reject(new Error('boom')) : { data: { content: [] }, message: 'success' },
      );

      await controller.errands(mockReq(), ...errandsArgs({ query: mockPersonNumber }), MUNICIPALITY_ID, mockRes());

      // Only the clause matching the raw query text remains; no extra party-id clause is added.
      expect(upstreamFilter(api.get.mock.calls[1][0].url).match(/stakeholders\.externalId~/gu)).toHaveLength(1);
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
        { url: `${SUPPORT_SERVICE}/${MUNICIPALITY_ID}/${NAMESPACE}/errands/count?filter=%28status%3A%27NEW%27%29` },
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

    it('rejects applications without an approved registration seed before metadata or upstream creation', async () => {
      const { controller, api } = makeController();
      (controller as unknown as { newErrandDefaults: undefined }).newErrandDefaults = undefined;

      await expect(controller.registerSupportErrand(mockReq(), MUNICIPALITY_ID, mockRes())).rejects.toMatchObject({
        status: 409,
        message: 'Registration is not configured for this application',
      });
      expect(api.get).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('does not create an investigation-owned errand while its registration policy is unavailable', async () => {
      const { controller, api } = makeController('unavailable');

      await expect(controller.registerSupportErrand(mockReq(), MUNICIPALITY_ID, mockRes())).rejects.toMatchObject({
        status: 503,
        message: 'Support errand registration policy is temporarily unavailable',
      });
      expect(api.get).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
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

      await controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, '"7"', { title: 'Ny titel' }, res);

      const [config] = api.patch.mock.calls[0];
      expect(config.url).toBe(`${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}`);
      expect(config.data).toEqual({ title: 'Ny titel' });
      expect(config.headers).toEqual({ 'If-Match': '"7"' });
      expect(config.followLocation).toBe(false);
      expect(config.propagateClientError).toBe(true);
      expect(res.statusCode).toBe(200);
    });

    it('rethrows when the patch fails', async () => {
      const { controller, api } = makeController();
      api.patch.mockRejectedValue(new Error('upstream down'));

      await expect(controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, '"7"', { title: 'x' }, mockRes())).rejects.toThrow(
        'upstream down',
      );
    });

    it.each([
      [undefined, 428, 'If-Match is required when updating a support errand'],
      ['7', 400, 'If-Match must contain one strong numeric ETag'],
      ['W/"7"', 400, 'If-Match must contain one strong numeric ETag'],
      ['"07"', 400, 'If-Match must contain one strong numeric ETag'],
      ['"7", "8"', 400, 'If-Match must contain one strong numeric ETag'],
    ] as const)('rejects a missing or malformed generic mutation precondition %s', async (ifMatch, status, message) => {
      const { controller, api } = makeController();

      await expect(
        controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, ifMatch, { title: 'x' }, mockRes()),
      ).rejects.toMatchObject({ status, message });
      expect(api.get).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects a stale generic mutation before patching upstream', async () => {
      const { controller, api } = makeController();

      await expect(
        controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, '"6"', { title: 'x' }, mockRes()),
      ).rejects.toMatchObject({ status: 412, message: 'If-Match does not match the current support errand version' });
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects generic changes to a locked errand', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: { version: 7, status: 'SOLVED' }, headers: { etag: '"7"' }, message: 'success' });

      await expect(
        controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, '"7"', { title: 'x' }, mockRes()),
      ).rejects.toMatchObject({ status: 409, message: 'Support errand status does not allow generic changes' });
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects a malformed upstream ETag instead of falling back to the body version', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: { version: 7, status: 'ONGOING' }, headers: { etag: 'W/"7"' }, message: 'success' });

      await expect(
        controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, '"7"', { title: 'x' }, mockRes()),
      ).rejects.toMatchObject({ status: 502, message: 'Support Management response contains an invalid errand ETag' });
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects direct activePhaseId writes so transitions cannot bypass workflow validation', async () => {
      const { controller, api } = makeController();

      await expect(
        controller.updateSupportErrand(
          mockReq(),
          mockSupportErrandId,
          MUNICIPALITY_ID,
          undefined,
          { activePhaseId: 'unvalidated-target' },
          mockRes(),
        ),
      ).rejects.toMatchObject({ status: 400, message: 'Use the phase transition endpoint to change the active phase' });
      expect(api.patch).not.toHaveBeenCalled();
    });

    it.each([
      [{ status: 'SOLVED' }, 'status'],
      [{ resolution: 'CLOSED' }, 'resolution'],
      [{ suspension: { suspendedFrom: '2029-12-01T00:00:00Z', suspendedTo: '2030-01-01T00:00:00Z' } }, 'suspension'],
    ])('rejects direct %s writes so workflow commands cannot bypass current-state validation', async (data, _field) => {
      const { controller, api } = makeController();

      await expect(controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, undefined, data, mockRes())).rejects.toMatchObject(
        { status: 400, message: 'Use the status transition endpoint to change status, resolution or suspension' },
      );
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects direct assigned-user writes so the narrow administrator command cannot be bypassed', async () => {
      const { controller, api } = makeController();

      await expect(
        controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, undefined, { assignedUserId: mockAdUsername }, mockRes()),
      ).rejects.toMatchObject({ status: 400, message: 'Use the administrator endpoint to change the assigned user' });
      expect(api.get).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects protected classification fields when an active investigation owns them', async () => {
      const { controller, api } = makeController('investigation');

      await expect(
        controller.updateSupportErrand(
          mockReq(),
          mockSupportErrandId,
          MUNICIPALITY_ID,
          '"7"',
          { classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/TYPE' }, labels: [] },
          mockRes(),
        ),
      ).rejects.toMatchObject({
        status: 409,
        message: 'Use the investigation classification endpoint to update classification and labels',
      });
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects changing the parameter that selects the investigation classification owner', async () => {
      const { controller, api } = makeController('investigation');
      api.get.mockResolvedValue({
        data: { version: 7, status: 'ONGOING', parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }] },
        headers: { etag: '"7"' },
        message: 'success',
      });

      await expect(
        controller.updateSupportErrand(
          mockReq(),
          mockSupportErrandId,
          MUNICIPALITY_ID,
          '"7"',
          { parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE'] }] },
          mockRes(),
        ),
      ).rejects.toMatchObject({
        status: 409,
        message: 'The investigation classification owner parameter cannot be changed through the generic errand endpoint',
      });
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('allows unrelated parameter updates when the investigation owner selector is unchanged', async () => {
      const { controller, api } = makeController('investigation');
      api.get.mockResolvedValue({
        data: {
          version: 7,
          status: 'ONGOING',
          parameters: [
            { key: 'eventType', values: ['AVVIKELSE'] },
            { key: 'other', values: ['before'] },
          ],
        },
        headers: { etag: '"7"' },
        message: 'success',
      });

      await controller.updateSupportErrand(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        '"7"',
        {
          parameters: [
            { key: 'eventType', values: ['AVVIKELSE'], version: 7 },
            { key: 'other', values: ['after'], version: 8 },
          ],
        },
        mockRes(),
      );

      expect(api.patch.mock.calls[0][0].data).toEqual({
        parameters: [
          { key: 'eventType', values: ['AVVIKELSE'] },
          { key: 'other', values: ['after'] },
        ],
      });
    });

    it('keeps legacy classification writes when investigation is explicitly inactive and strips server versions', async () => {
      const { controller, api } = makeController('generic-errand');
      const res = mockRes();

      await controller.updateSupportErrand(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        '"7"',
        {
          version: 9,
          classification: { category: 'LEGACY', type: 'LEGACY/TYPE' },
          labels: [],
          parameters: [{ key: 'legacy', values: ['value'], version: 3 }],
          stakeholders: [{ role: 'PRIMARY', contactChannels: [], parameters: [{ key: 'nested', values: [], version: 2 }] }],
        },
        res,
      );

      expect(api.patch.mock.calls[0][0].data).toEqual({
        classification: { category: 'LEGACY', type: 'LEGACY/TYPE' },
        labels: [],
        parameters: [{ key: 'legacy', values: ['value'] }],
        stakeholders: [{ role: 'PRIMARY', contactChannels: [], parameters: [{ key: 'nested', values: [] }] }],
      });
    });

    it('creates IAF/VOF errands with an explicit deviation kind but leaves legal-base classification to the investigation', async () => {
      const { controller, api } = makeController();
      (controller as unknown as { newErrandDefaults: NewErrandDefaults }).newErrandDefaults = getNewErrandDefaults('IAF')!;
      api.get.mockResolvedValue({
        data: {
          labelStructure: [
            {
              id: 'report-type-root',
              classification: 'REPORT_TYPE_ROOT',
              resourceName: 'REPORT_TYPE',
              resourcePath: 'REPORT_TYPE',
              labels: [
                {
                  id: 'deviation',
                  classification: 'REPORT_TYPE',
                  resourceName: 'DEVIATION',
                  resourcePath: 'REPORT_TYPE/DEVIATION',
                },
              ],
            },
          ],
        },
        message: 'success',
      });
      api.post.mockResolvedValue({ data: { id: mockSupportErrandId }, message: 'success' });

      await controller.registerSupportErrand(mockReq(mockUser()), MUNICIPALITY_ID, mockRes());

      const body = api.post.mock.calls[0][0].data;
      expect(body).not.toHaveProperty('classification');
      expect(body.parameters).toEqual([{ key: 'eventType', displayName: 'Rapporttyp', values: ['AVVIKELSE'] }]);
      expect(body.labels.map(({ resourcePath }: Label) => resourcePath)).toEqual(['REPORT_TYPE', 'REPORT_TYPE/DEVIATION']);
    });

    it('fails closed for protected fields when ownership cannot be resolved, but not for unrelated updates', async () => {
      const unavailable = makeController('unavailable');

      await expect(
        unavailable.controller.updateSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, '"7"', { labels: [] }, mockRes()),
      ).rejects.toMatchObject({ status: 503 });
      expect(unavailable.api.patch).not.toHaveBeenCalled();

      await unavailable.controller.updateSupportErrand(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        '"7"',
        { title: 'Unrelated update' },
        mockRes(),
      );
      expect(unavailable.api.patch).toHaveBeenCalledTimes(1);
    });
  });

  describe('becomeAdminForSupportErrand', () => {
    it('sends only assignedUserId and applies the document access projection to the response', async () => {
      const { controller, api, investigationPolicy } = makeController();
      api.patch.mockResolvedValue({ data: { id: mockSupportErrandId }, message: 'success' });

      await controller.becomeAdminForSupportErrand(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        '"7"',
        { assignedUserId: mockAdUsername },
        mockRes(),
      );

      expect(api.patch.mock.calls[0][0]).toEqual({
        url: `${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}`,
        baseURL: expect.any(String),
        data: { assignedUserId: mockAdUsername },
        headers: { 'If-Match': '"7"' },
        followLocation: false,
        propagateClientError: true,
      });
      expect(investigationPolicy.filterProtectedJsonParameters).toHaveBeenCalledWith({ id: mockSupportErrandId }, mockReq().user);
    });

    it('rejects a missing assignment precondition before reading upstream', async () => {
      const { controller, api } = makeController();

      await expect(
        controller.becomeAdminForSupportErrand(
          mockReq(),
          mockSupportErrandId,
          MUNICIPALITY_ID,
          undefined,
          { assignedUserId: mockAdUsername },
          mockRes(),
        ),
      ).rejects.toMatchObject({ status: 428, message: 'If-Match is required when updating a support errand' });
      expect(api.get).not.toHaveBeenCalled();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects a stale assignment before patching upstream', async () => {
      const { controller, api } = makeController();

      await expect(
        controller.becomeAdminForSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, '"6"', { assignedUserId: mockAdUsername }, mockRes()),
      ).rejects.toMatchObject({ status: 412, message: 'If-Match does not match the current support errand version' });
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('rejects administrator changes to a locked errand', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValue({ data: { version: 7, status: 'SOLVED' }, headers: { etag: '"7"' }, message: 'success' });

      await expect(
        controller.becomeAdminForSupportErrand(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, '"7"', { assignedUserId: mockAdUsername }, mockRes()),
      ).rejects.toMatchObject({ status: 409, message: 'Support errand status does not allow administrator changes' });
      expect(api.patch).not.toHaveBeenCalled();
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

describe('AssignSupportErrandDto write boundary', () => {
  it('accepts only an explicit assignee and rejects status changes on the admin route', async () => {
    const valid = plainToInstance(AssignSupportErrandDto, { assignedUserId: mockAdUsername });
    const invalid = plainToInstance(AssignSupportErrandDto, {
      assignedUserId: mockAdUsername,
      status: 'ONGOING',
    });

    await expect(validate(valid, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    expect((await validate(invalid, { whitelist: true, forbidNonWhitelisted: true })).some(error => error.property === 'status')).toBe(true);
  });
});

describe('UpdateSupportErrandStatusDto', () => {
  it('requires exact source state and rejects unrelated errand fields', async () => {
    const valid = plainToInstance(UpdateSupportErrandStatusDto, {
      expectedVersion: 7,
      expectedStatus: 'ONGOING',
      status: 'SOLVED',
      resolution: 'CLOSED',
    });
    const invalid = plainToInstance(UpdateSupportErrandStatusDto, {
      expectedVersion: -1,
      expectedStatus: '',
      status: '',
      title: 'not writable here',
    });

    await expect(validate(valid, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    const serializedErrors = JSON.stringify(await validate(invalid, { whitelist: true, forbidNonWhitelisted: true }));
    expect(serializedErrors).toMatch(/expectedVersion/u);
    expect(serializedErrors).toMatch(/expectedStatus/u);
    expect(serializedErrors).toMatch(/status/u);
    expect(serializedErrors).toMatch(/title/u);
  });
});

describe('UpdateSupportErrandPhaseDto', () => {
  it('requires a non-negative errand version and an explicit transition id', async () => {
    const valid = plainToInstance(UpdateSupportErrandPhaseDto, { expectedVersion: 7, transitionId: 'start-investigation' });
    const invalid = plainToInstance(UpdateSupportErrandPhaseDto, {
      expectedVersion: -1,
      transitionId: '',
      activePhaseId: 'client-selected-target-is-not-accepted',
    });

    await expect(validate(valid, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    const serializedErrors = JSON.stringify(await validate(invalid, { whitelist: true, forbidNonWhitelisted: true }));
    expect(serializedErrors).toMatch(/expectedVersion/);
    expect(serializedErrors).toMatch(/transitionId/);
    expect(serializedErrors).toMatch(/activePhaseId/);
  });
});

describe('updateSupportErrandStatus', () => {
  const errandUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}`;
  const metadataUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/metadata`;
  const statuses = [{ name: 'ONGOING' }, { name: 'SOLVED' }, { name: 'RETIRED', deprecated: true }];

  it('applies one configured transition with If-Match and returns the fresh errand version', async () => {
    const { controller, api } = makeController();
    let errandRead = 0;
    api.get.mockImplementation(async (config: { url?: string }) => {
      if (config.url === metadataUrl) return { data: { statuses }, message: 'success' };
      errandRead += 1;
      return errandRead === 1
        ? {
            data: { id: mockSupportErrandId, status: 'ONGOING', version: 7 },
            message: 'success',
            headers: { etag: '"7"' },
          }
        : {
            data: { id: mockSupportErrandId, status: 'SOLVED', resolution: 'CLOSED', version: 8 },
            message: 'success',
            headers: { etag: '"8"' },
          };
    });
    const req = mockReq();
    const res = mockRes();

    await controller.updateSupportErrandStatus(
      req,
      mockSupportErrandId,
      MUNICIPALITY_ID,
      { expectedVersion: 7, expectedStatus: 'ONGOING', status: 'SOLVED', resolution: 'CLOSED' },
      res,
    );

    expect(api.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: errandUrl,
        data: { status: 'SOLVED', resolution: 'CLOSED' },
        headers: { 'If-Match': '"7"' },
        followLocation: false,
        propagateClientError: true,
      }),
      req.user,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: 'SOLVED', resolution: 'CLOSED', version: 8 });
  });

  it.each([
    {
      name: 'stale version',
      current: { status: 'ONGOING', version: 8 },
      command: { expectedVersion: 7, expectedStatus: 'ONGOING', status: 'SOLVED' },
      expected: { status: 409 },
    },
    {
      name: 'stale source status',
      current: { status: 'SOLVED', version: 7 },
      command: { expectedVersion: 7, expectedStatus: 'ONGOING', status: 'ONGOING' },
      expected: { status: 409 },
    },
    {
      name: 'unconfigured target',
      current: { status: 'ONGOING', version: 7 },
      command: { expectedVersion: 7, expectedStatus: 'ONGOING', status: 'UNKNOWN' },
      expected: { status: 400 },
    },
  ])('rejects $name before patching', async ({ current, command, expected }) => {
    const { controller, api } = makeController();
    api.get.mockImplementation(async (config: { url?: string }) =>
      config.url === metadataUrl ? { data: { statuses }, message: 'success' } : { data: current, message: 'success' },
    );

    await expect(controller.updateSupportErrandStatus(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, command, mockRes())).rejects.toMatchObject(
      expected,
    );
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('updateSupportErrandPhase', () => {
  const errandUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}`;
  const metadataUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/metadata`;
  const phases = [
    {
      id: 'received',
      name: 'RECEIVED',
      transitions: [
        { id: 'start-investigation', targetPhaseId: 'investigation' },
        { id: 'close-directly', targetPhaseId: 'closed' },
      ],
    },
    { id: 'investigation', name: 'INVESTIGATION' },
    { id: 'closed', name: 'CLOSED' },
  ];

  it('applies the selected transition with If-Match and returns the fresh errand version', async () => {
    const { controller, api } = makeController();
    let errandRead = 0;
    api.get.mockImplementation(async (config: { url?: string }) => {
      if (config.url === metadataUrl) return { data: { phases }, message: 'success' };
      errandRead += 1;
      return errandRead === 1
        ? {
            data: { id: mockSupportErrandId, activePhaseId: 'received', status: 'ONGOING', version: 7 },
            message: 'success',
            headers: { etag: '"7"' },
          }
        : {
            data: { id: mockSupportErrandId, activePhaseId: 'closed', status: 'ONGOING', version: 8 },
            message: 'success',
            headers: { etag: '"8"' },
          };
    });
    const req = mockReq();
    const res = mockRes();

    await controller.updateSupportErrandPhase(req, mockSupportErrandId, MUNICIPALITY_ID, { expectedVersion: 7, transitionId: 'close-directly' }, res);

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: errandUrl,
        data: { activePhaseId: 'closed' },
        headers: { 'If-Match': '"7"' },
        followLocation: false,
        propagateClientError: true,
      }),
      req.user,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ activePhaseId: 'closed', version: 8 });
  });

  it('rejects a stale request before applying a transition', async () => {
    const { controller, api } = makeController();
    api.get.mockImplementation(async (config: { url?: string }) =>
      config.url === metadataUrl
        ? { data: { phases }, message: 'success' }
        : { data: { activePhaseId: 'received', status: 'ONGOING', version: 8 }, message: 'success' },
    );

    await expect(
      controller.updateSupportErrandPhase(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        { expectedVersion: 7, transitionId: 'start-investigation' },
        mockRes(),
      ),
    ).rejects.toMatchObject({ status: 409, message: 'Support errand phase has changed since it was loaded' });
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('UpdateSupportErrandClassificationDto', () => {
  it('accepts only classification and label id references', async () => {
    const validPayload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: 7,
      classification: { category: 'HSL', type: 'REHAB' },
      categoryLabels: [{ id: 'label-id' }],
      documentKey: 'utredning-enhetschef',
      documentETag: '"3"',
    });
    const invalidPayload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: -1,
      classification: { category: 'HSL', type: 'REHAB', displayName: 'Not writable' },
      categoryLabels: [{ id: 'label-id', displayName: 'Not writable' }],
      labels: [{ id: 'stale-full-label-list-is-not-writable' }],
      title: 'Not writable',
      documentKey: 'utredning-enhetschef',
      documentETag: '*',
    });

    await expect(validate(validPayload, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);

    const serializedErrors = JSON.stringify(await validate(invalidPayload, { whitelist: true, forbidNonWhitelisted: true }));
    expect(serializedErrors).toMatch(/title/);
    expect(serializedErrors).toMatch(/displayName/);
    expect(serializedErrors).toMatch(/documentETag/);
  });

  it('rejects empty classification values and an empty label selection', async () => {
    const payload = plainToInstance(UpdateSupportErrandClassificationDto, {
      expectedVersion: -1,
      classification: { category: '', type: '' },
      categoryLabels: [],
      documentKey: '',
      documentETag: 'W/"3"',
    });

    const serializedErrors = JSON.stringify(await validate(payload, { whitelist: true, forbidNonWhitelisted: true }));

    expect(serializedErrors).toMatch(/category/);
    expect(serializedErrors).toMatch(/type/);
    expect(serializedErrors).toMatch(/categoryLabels/);
    expect(serializedErrors).toMatch(/expectedVersion/);
    expect(serializedErrors).toMatch(/documentKey/);
    expect(serializedErrors).toMatch(/documentETag/);
  });
});

describe('updateSupportErrandClassification', () => {
  const errandUrl = `${MUNICIPALITY_ID}/${NAMESPACE}/errands/${mockSupportErrandId}`;

  const update = (): UpdateSupportErrandClassificationDto => ({
    expectedVersion: 7,
    classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
    categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    documentKey: 'utredning-enhetschef',
    documentETag: '"3"',
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

  it.each([
    ['generic-errand', 409, 'Investigation does not own classification for this application'],
    ['unavailable', 503, 'Investigation classification ownership is temporarily unavailable'],
  ] as const)('rejects the narrow command when ownership is %s', async (owner, status, message) => {
    const { controller, api } = makeController(owner);

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({ status, message });
    expect(api.get).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects stale classification document context before reading or patching the errand', async () => {
    const { controller, api, investigationDocument } = makeController();
    routeClassificationGets(api, [{ data: { id: mockSupportErrandId, version: 7, labels: [] }, message: 'success' }]);
    investigationDocument.readDocument.mockResolvedValue({
      document: {
        key: 'utredning-enhetschef',
        schemaId: '2281_utredning-enhetschef_1.0',
        value: { legalBases: ['HSL'] },
        version: 4,
      },
      etag: '"4"',
      status: 200,
    });

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({ status: 409, message: 'Investigation document has changed since classification was edited' });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects a classification that conflicts with the versioned document legal bases', async () => {
    const { controller, api, investigationDocument } = makeController();
    routeClassificationGets(api, [{ data: { id: mockSupportErrandId, version: 7, labels: [] }, message: 'success' }]);
    investigationDocument.readDocument.mockResolvedValue({
      document: {
        key: 'utredning-enhetschef',
        schemaId: '2281_utredning-enhetschef_1.0',
        value: { legalBases: ['SOL'] },
        version: 3,
      },
      etag: '"3"',
      status: 200,
    });

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({ status: 409, message: 'The requested classification is incompatible with the investigation legal bases' });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects the manager document when the current errand requires the reported-misconduct owner', async () => {
    const { controller, api } = makeController();
    routeClassificationGets(api, [
      {
        data: {
          id: mockSupportErrandId,
          version: 7,
          parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE'] }],
          labels: [],
        },
        message: 'success',
      },
    ]);

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({
      status: 409,
      message: 'The selected investigation document does not own classification for this errand',
    });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects classification changes on a locked errand at the backend boundary', async () => {
    const { controller, api } = makeController();
    routeClassificationGets(api, [
      {
        data: { id: mockSupportErrandId, version: 7, status: 'SOLVED', labels: [] },
        message: 'success',
      },
    ]);

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Support errand status does not allow investigation classification changes',
    });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('patches only classification and label ids and propagates upstream client errors', async () => {
    const { controller, api, investigationDocument } = makeController();
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

    expect(investigationDocument.readDocument).toHaveBeenCalledWith({
      definition: expect.objectContaining({ key: update().documentKey }),
      municipalityId: MUNICIPALITY_ID,
      errandId: mockSupportErrandId,
      user: req.user,
    });

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

  it.each(['W/"7"', '', '"07"'])('rejects the malformed upstream ETag %j instead of falling back to the body version', async invalidETag => {
    const { controller, api } = makeController();
    routeClassificationGets(api, [{ data: { id: mockSupportErrandId, version: 7, labels: [] }, message: 'success', headers: { etag: invalidETag } }]);

    await expect(
      controller.updateSupportErrandClassification(mockReq(), mockSupportErrandId, MUNICIPALITY_ID, update(), mockRes()),
    ).rejects.toMatchObject({ status: 502, message: 'Support Management response contains an invalid errand ETag' });
    expect(api.patch).not.toHaveBeenCalled();
  });

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
