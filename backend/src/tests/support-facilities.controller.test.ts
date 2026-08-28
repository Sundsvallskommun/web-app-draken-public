import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Response } from 'express';
import { getMetadataArgsStorage } from 'routing-controllers';

import {
  IafVofInvestigationClassificationPolicy,
  resolveIafVofInvestigationClassificationPolicy,
} from '@/config/iaf-vof-investigation-classification';
import { getSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { SupportFacilitiesController, SupportFacilitiesPayloadDto } from '@/controllers/supportmanagement/support-facilities.controller';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

import { ABSENT_HEADER, mockReq, mockRes, MockResponse, mockUser } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

const classificationPolicy = (): IafVofInvestigationClassificationPolicy =>
  resolveIafVofInvestigationClassificationPolicy(getSupportInvestigationProfile('IAF'))!;

const facilities = (): SupportFacilitiesPayloadDto => ({
  propertyDesignations: ['SUNDSVALL BÖLE 1:1'],
  districtnames: ['Böle'],
  streets: ['Storgatan 1'],
});

const makeController = (
  options: {
    policy?: IafVofInvestigationClassificationPolicy;
    owner?: 'generic-errand' | 'investigation' | 'unavailable';
  } = {},
) => {
  const controller = new SupportFacilitiesController();
  const api: ApiStub = {
    get: vi.fn(async () => ({
      data: {
        id: mockSupportErrandId,
        version: 7,
        status: 'ONGOING',
        parameters: [
          { key: 'eventType', values: ['DEVIATION'], version: 2 },
          { key: 'unrelated', displayName: 'Unrelated', values: ['keep'], version: 3 },
          { key: 'propertyDesignation', values: ['OLD'], version: 4 },
        ],
      },
      headers: { etag: '"7"' },
      message: 'success',
    })),
    patch: vi.fn(async (_config: unknown) => ({ data: [{ key: 'saved', values: ['true'] }], message: 'success' })),
  };
  const investigationPolicy = {
    iafVofClassificationPolicy: options.policy,
    getClassificationOwner: vi.fn(async () => options.owner ?? 'investigation'),
  };

  (controller as unknown as { apiService: ApiService }).apiService = api as unknown as ApiService;
  (controller as unknown as { investigationPolicyService: SupportInvestigationPolicyService }).investigationPolicyService =
    investigationPolicy as unknown as SupportInvestigationPolicyService;

  return { controller, api, investigationPolicy };
};

const routeMiddlewares = () =>
  getMetadataArgsStorage().uses.filter(candidate => candidate.target === SupportFacilitiesController && candidate.method === 'saveFacility');

const runMiddleware = async (
  middleware: (req: RequestWithUser & { body?: unknown }, response: Response, next: NextFunction) => unknown,
  req: RequestWithUser & { body?: unknown },
): Promise<unknown> =>
  new Promise(resolve => {
    const next: NextFunction = error => resolve(error);
    Promise.resolve(middleware(req, {} as Response, next)).catch(resolve);
  });

const responseDouble = (): MockResponse & Response => mockRes() as unknown as MockResponse & Response;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupportFacilitiesController route contract', () => {
  it('requires authentication and Support Management edit permission', async () => {
    const middlewares = routeMiddlewares();
    expect(middlewares.some(use => use.middleware === authMiddleware && use.afterAction === false)).toBe(true);

    const req = Object.assign(mockReq(mockUser({ permissions: { canEditSupportManagement: false } } as never)), {
      body: facilities(),
    });
    const errors = await Promise.all(
      middlewares.filter(use => use.middleware !== authMiddleware).map(use => runMiddleware(use.middleware as never, req)),
    );

    expect(errors).toContainEqual(expect.objectContaining({ status: 403, message: 'Missing permissions' }));
  });

  it('accepts exactly the three required string-array fields', async () => {
    const valid = plainToInstance(SupportFacilitiesPayloadDto, facilities());
    expect(await validate(valid, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);

    const invalidBodies = [
      { propertyDesignations: [], districtnames: [] },
      { ...facilities(), streets: 'Storgatan 1' },
      { ...facilities(), districtnames: [1] },
      { ...facilities(), unexpected: [] },
    ];
    for (const body of invalidBodies) {
      const dto = plainToInstance(SupportFacilitiesPayloadDto, body);
      expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);
    }
  });
});

describe('SupportFacilitiesController saveFacility', () => {
  it.each([
    [ABSENT_HEADER, 428, 'If-Match is required when updating a support errand'],
    ['7', 400, 'If-Match must contain one strong numeric ETag'],
    ['W/"7"', 400, 'If-Match must contain one strong numeric ETag'],
    ['"07"', 400, 'If-Match must contain one strong numeric ETag'],
    ['"7", "8"', 400, 'If-Match must contain one strong numeric ETag'],
  ] as const)('rejects missing or malformed strong parent precondition %s', async (ifMatch, status, message) => {
    const { controller, api } = makeController();

    await expect(
      controller.saveFacility(mockReq(), mockMunicipalityId, mockSupportErrandId, ifMatch, facilities(), responseDouble()),
    ).rejects.toMatchObject({ status, message });
    expect(api.get).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects a stale parent version before changing parameters', async () => {
    const { controller, api } = makeController();

    await expect(
      controller.saveFacility(mockReq(), mockMunicipalityId, mockSupportErrandId, '"6"', facilities(), responseDouble()),
    ).rejects.toMatchObject({ status: 412, message: 'If-Match does not match the current support errand version' });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects locked parent errands before changing parameters', async () => {
    const { controller, api } = makeController();
    api.get.mockResolvedValue({ data: { version: 7, status: 'SOLVED', parameters: [] }, headers: { etag: '"7"' } });

    await expect(
      controller.saveFacility(mockReq(), mockMunicipalityId, mockSupportErrandId, '"7"', facilities(), responseDouble()),
    ).rejects.toMatchObject({ status: 409, message: 'Support errand status does not allow facility changes' });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('rejects inconsistent upstream parent versions', async () => {
    const { controller, api } = makeController();
    api.get.mockResolvedValue({ data: { version: 8, status: 'ONGOING', parameters: [] }, headers: { etag: '"7"' } });

    await expect(
      controller.saveFacility(mockReq(), mockMunicipalityId, mockSupportErrandId, '"7"', facilities(), responseDouble()),
    ).rejects.toMatchObject({ status: 502, message: 'Support Management response contains inconsistent errand versions' });
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('preserves the classification selector and unrelated parameters, strips versions and forwards the strong parent If-Match', async () => {
    const policy = classificationPolicy();
    const { controller, api, investigationPolicy } = makeController({ policy });
    const req = mockReq();
    const response = responseDouble();

    await controller.saveFacility(req, mockMunicipalityId, mockSupportErrandId, '"7"', facilities(), response);

    expect(investigationPolicy.getClassificationOwner).toHaveBeenCalledWith(req.user);
    expect(api.get).toHaveBeenCalledWith(
      {
        url: `${mockMunicipalityId}/${mockSupportNamespace}/errands/${mockSupportErrandId}`,
        baseURL: expect.any(String),
        includeResponseHeaders: true,
        propagateClientError: true,
      },
      req.user,
    );
    expect(api.patch).toHaveBeenCalledWith(
      {
        url: `${mockMunicipalityId}/${mockSupportNamespace}/errands/${mockSupportErrandId}/parameters`,
        baseURL: expect.any(String),
        data: [
          { key: 'eventType', values: ['DEVIATION'] },
          { key: 'unrelated', displayName: 'Unrelated', values: ['keep'] },
          { key: 'propertyDesignation', displayName: 'Fastighetsbeteckning', values: facilities().propertyDesignations },
          { key: 'districtname', displayName: 'Distriktnamn', values: facilities().districtnames },
          { key: 'street', displayName: 'Adress', values: facilities().streets },
        ],
        headers: { 'If-Match': '"7"' },
        followLocation: false,
        propagateClientError: true,
      },
      req.user,
    );
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual([{ key: 'saved', values: ['true'] }]);
  });

  it('fails closed when classification ownership is temporarily unavailable', async () => {
    const { controller, api } = makeController({ policy: classificationPolicy(), owner: 'unavailable' });

    await expect(
      controller.saveFacility(mockReq(), mockMunicipalityId, mockSupportErrandId, '"7"', facilities(), responseDouble()),
    ).rejects.toMatchObject({ status: 503, message: 'Investigation classification ownership is temporarily unavailable' });
    expect(api.patch).not.toHaveBeenCalled();
  });
});
