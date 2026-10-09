import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Response } from 'express';
import { getMetadataArgsStorage } from 'routing-controllers';

import { createSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { HandoverErrandDto, HandoverPreviewDto, SupportHandoverController } from '@/controllers/supportmanagement/support-handover.controller';
import { HandoverErrandRequest, HandoverPreviewRequest, Label, NamespaceConfig } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { FeatureFlagService } from '@/services/feature-flag.service';
import { getNewErrandDefaults } from '@/services/support-errand.service';
import { SupportInvestigationHandoverTargetService } from '@/services/support-investigation-handover-target.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { SupportJsonParameterService } from '@/services/support-json-parameter.service';

import { mockReq, mockRes, mockUser } from './helpers/http';
import {
  mockCategorizationRoot,
  mockDepartment,
  mockHandoverNamespace,
  mockLabelCategorizationNamespace,
  mockMunicipalityId,
  mockParkingPermitDepartment,
  mockSecondaryHandoverNamespace,
  mockSupportErrandId,
  mockSupportNamespace,
} from './helpers/mock-data';

const profile = createSupportInvestigationProfile({
  application: 'FUTURE',
  documents: [{ key: 'future-investigation', schemaName: 'future-schema', tabLabel: 'Future', ownerLabel: 'Owner' }],
});

const targetConfiguration = JSON.stringify([
  { municipalityId: mockMunicipalityId, namespace: 'future-target', documentKeys: ['future-investigation'] },
]);

const previewRequest: HandoverPreviewRequest = {
  targetNamespace: 'future-target',
  targetMunicipalityId: mockMunicipalityId,
};

const handoverRequest = (jsonParameters: boolean): HandoverErrandRequest => ({
  target: { namespace: 'future-target', municipalityId: mockMunicipalityId },
  mapping: { status: 'NEW', classification: { category: 'CATEGORY', type: 'TYPE' }, labels: [] },
  include: { jsonParameters },
});

interface ControllerOptions {
  readonly existingDocumentKeys?: readonly string[];
  readonly verificationError?: unknown;
  readonly configuredTargets?: string;
}

const makeProtectedDocumentController = ({
  existingDocumentKeys = ['future-investigation'],
  verificationError,
  configuredTargets = targetConfiguration,
}: ControllerOptions = {}) => {
  const featureFlags = { isConfigured: vi.fn(() => true), getFreshFeatureEnabled: vi.fn(async () => true) } as unknown as FeatureFlagService;
  const policy = new SupportInvestigationPolicyService(featureFlags, profile, 'future-namespace');
  const targets = new SupportInvestigationHandoverTargetService(configuredTargets);
  const verifyReadableDocuments = verificationError
    ? vi.fn().mockRejectedValue(verificationError)
    : vi.fn().mockResolvedValue({ existingDocumentKeys });
  const documentService = { verifyReadableDocuments } as unknown as SupportJsonParameterService;
  const controller = new SupportHandoverController(policy, targets, documentService);
  const apiService = {
    get: vi.fn(),
    post: vi.fn(async ({ url }: { url: string }) =>
      url.endsWith('/preview')
        ? { data: { sourceHandling: { statusCandidates: [] }, notCopyable: [], warnings: [] } }
        : { data: { target: { namespace: 'future-target', municipalityId: mockMunicipalityId } } },
    ),
  };
  (controller as unknown as { apiService: ApiService }).apiService = apiService as unknown as ApiService;
  return { controller, apiService, featureFlags, verifyReadableDocuments };
};

const routeMiddlewares = (method: 'previewHandover' | 'handoverErrand') =>
  getMetadataArgsStorage().uses.filter(candidate => candidate.target === SupportHandoverController && candidate.method === method);

const runMiddleware = async (
  middleware: (req: RequestWithUser & { body?: unknown }, response: Response, next: NextFunction) => unknown,
  req: RequestWithUser & { body?: unknown },
): Promise<unknown> =>
  new Promise(resolve => {
    const next: NextFunction = error => resolve(error);
    Promise.resolve(middleware(req, {} as Response, next)).catch(resolve);
  });

describe('SupportHandoverController route contracts', () => {
  it('keeps preview authenticated and requires edit permission for execute', async () => {
    const previewMiddlewares = routeMiddlewares('previewHandover');
    expect(previewMiddlewares.some(use => use.middleware === authMiddleware)).toBe(true);

    const executeMiddlewares = routeMiddlewares('handoverErrand');
    expect(executeMiddlewares.some(use => use.middleware === authMiddleware)).toBe(true);
    const req = Object.assign(mockReq(mockUser({ permissions: { canEditSupportManagement: false } } as never)), {
      body: handoverRequest(false),
    });
    const errors = await Promise.all(
      executeMiddlewares.filter(use => use.middleware !== authMiddleware).map(use => runMiddleware(use.middleware as never, req)),
    );
    expect(errors).toContainEqual(expect.objectContaining({ status: 403, message: 'Missing permissions' }));
  });

  it('validates required targets and rejects unknown request fields', async () => {
    const validPreview = plainToInstance(HandoverPreviewDto, previewRequest);
    expect(await validate(validPreview, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);

    const invalidPreview = plainToInstance(HandoverPreviewDto, { ...previewRequest, targetNamespace: '', unexpected: true });
    expect(await validate(invalidPreview, { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);

    const validExecute = plainToInstance(HandoverErrandDto, handoverRequest(true));
    expect(await validate(validExecute, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);

    const invalidExecute = plainToInstance(HandoverErrandDto, {
      ...handoverRequest(true),
      target: { namespace: '', municipalityId: mockMunicipalityId, unexpected: true },
    });
    expect(await validate(invalidExecute, { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);

    const missingTarget = plainToInstance(HandoverErrandDto, { mapping: handoverRequest(true).mapping });
    expect(await validate(missingTarget, { whitelist: true, forbidNonWhitelisted: true })).not.toHaveLength(0);
  });
});

describe('SupportHandoverController investigation document protection', () => {
  // The target has to be one this drake may hand over to at all before its documents are considered.
  beforeEach(() => {
    process.env.HANDOVER_TARGETS = 'future-target';
  });

  it('preflights preview and allows a custom future document when Support Management permits the read', async () => {
    const { controller, apiService, verifyReadableDocuments } = makeProtectedDocumentController();
    const req = mockReq();
    const response = mockRes();

    await controller.previewHandover(req, mockSupportErrandId, mockMunicipalityId, previewRequest, response);

    expect(verifyReadableDocuments).toHaveBeenCalledWith({
      definitions: profile.documents,
      municipalityId: mockMunicipalityId,
      errandId: mockSupportErrandId,
      user: req.user,
    });
    expect(apiService.get).not.toHaveBeenCalled();
    expect(apiService.post).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(200);
  });

  it('does not expose handover preview metadata for a protected document without read access', async () => {
    const denied = Object.assign(new Error('Forbidden'), { status: 403 });
    const { controller, apiService } = makeProtectedDocumentController({ verificationError: denied });

    await expect(controller.previewHandover(mockReq(), mockSupportErrandId, mockMunicipalityId, previewRequest, mockRes())).rejects.toBe(denied);

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('blocks forwarding protected documents before executing the handover', async () => {
    const denied = Object.assign(new Error('Forbidden'), { status: 403 });
    const { controller, apiService } = makeProtectedDocumentController({ verificationError: denied });

    await expect(
      controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(true), mockRes()),
    ).rejects.toBe(denied);

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('fails an untyped truthy JSON-parameter include closed before upstream coercion', async () => {
    const denied = Object.assign(new Error('Forbidden'), { status: 403 });
    const { controller, apiService } = makeProtectedDocumentController({ verificationError: denied });
    const malformedRequest = {
      ...handoverRequest(false),
      include: { jsonParameters: 'true' },
    } as unknown as HandoverErrandRequest;

    await expect(
      controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', malformedRequest, mockRes()),
    ).rejects.toBe(denied);

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('allows forwarding protected documents after active-policy and read-access checks', async () => {
    const { controller, apiService } = makeProtectedDocumentController();
    const response = mockRes();

    await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(true), response);

    expect(apiService.get).not.toHaveBeenCalled();
    expect(apiService.post).toHaveBeenCalledWith(expect.objectContaining({ headers: { 'Idempotency-Key': 'idempotency-key' } }), expect.anything());
    expect(response.statusCode).toBe(201);
  });

  it.each([undefined, '', ' idempotency-key ', 'x'.repeat(129)])('rejects an invalid Idempotency-Key %s before side effects', async key => {
    const { controller, apiService, verifyReadableDocuments } = makeProtectedDocumentController();

    await expect(
      controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, key as string, handoverRequest(true), mockRes()),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('Idempotency-Key') });
    expect(verifyReadableDocuments).not.toHaveBeenCalled();
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('fails closed when no target capability policy is configured', async () => {
    const { controller, apiService } = makeProtectedDocumentController({ configuredTargets: '' });

    await expect(
      controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(true), mockRes()),
    ).rejects.toMatchObject({ status: 503, message: 'Investigation handover target policy is unavailable' });

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('rejects protected documents for a target outside the explicit capability allowlist', async () => {
    const deniedTargets = JSON.stringify([{ municipalityId: mockMunicipalityId, namespace: 'other-target', documentKeys: ['future-investigation'] }]);
    const { controller, apiService } = makeProtectedDocumentController({ configuredTargets: deniedTargets });

    await expect(controller.previewHandover(mockReq(), mockSupportErrandId, mockMunicipalityId, previewRequest, mockRes())).rejects.toMatchObject({
      status: 409,
      message: 'Target namespace is not configured to receive protected investigation documents',
    });

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('does not apply investigation policy when protected documents are not being copied', async () => {
    const { controller, apiService, featureFlags, verifyReadableDocuments } = makeProtectedDocumentController({ configuredTargets: '' });

    await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(false), mockRes());

    expect(apiService.get).not.toHaveBeenCalled();
    expect(verifyReadableDocuments).not.toHaveBeenCalled();
    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
    expect(apiService.post).toHaveBeenCalledOnce();
  });

  it('does not treat generic JSON parameters as protected profile documents', async () => {
    const { controller, apiService, featureFlags, verifyReadableDocuments } = makeProtectedDocumentController({
      existingDocumentKeys: [],
      configuredTargets: '',
    });

    await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(true), mockRes());

    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
    expect(verifyReadableDocuments).toHaveBeenCalledOnce();
    expect(apiService.post).toHaveBeenCalledOnce();
  });

  it('previews generic JSON parameters without requiring a protected-document target policy', async () => {
    const { controller, apiService, featureFlags, verifyReadableDocuments } = makeProtectedDocumentController({
      existingDocumentKeys: [],
      configuredTargets: '',
    });

    await controller.previewHandover(mockReq(), mockSupportErrandId, mockMunicipalityId, previewRequest, mockRes());

    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
    expect(verifyReadableDocuments).toHaveBeenCalledOnce();
    expect(apiService.post).toHaveBeenCalledOnce();
  });
});

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
}

const config = (namespace: string): NamespaceConfig => ({ namespace, displayName: namespace, shortCode: namespace }) as NamespaceConfig;

// Upstream returns every namespace in the municipality, including the drake's own.
const upstreamConfigs = [
  config(mockSupportNamespace),
  config(mockSecondaryHandoverNamespace),
  config(mockHandoverNamespace),
  config(mockLabelCategorizationNamespace),
];

const label = (classification: string, resourceName: string, labels: Label[] = []): Label => ({ classification, resourceName, labels });
const rootedStructure = () => [label('ROOT', mockCategorizationRoot, [label('DEPARTMENT', 'KSK', [label('CATEGORY', 'KSK/HR')])])];
const flatStructure = () => [label('CATEGORY', 'SALARY', [label('TYPE', 'SALARY/PAYSLIP')])];

const makeController = () => {
  const controller = new SupportHandoverController();
  const api: ApiStub = {
    get: vi.fn(async () => ({ data: upstreamConfigs, message: 'success' })),
    post: vi.fn(async () => ({ data: {}, message: 'success' })),
  };
  (controller as unknown as { apiService: ApiStub }).apiService = api;
  return { controller, api };
};

const namespaces = (body: unknown) => (body as NamespaceConfig[]).map(target => target.namespace);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.HANDOVER_TARGETS;
});

describe('SupportHandoverController', () => {
  describe('fetchNamespaceConfigs', () => {
    it('returns no targets and makes no API call when HANDOVER_TARGETS is unset', async () => {
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.fetchNamespaceConfigs(mockReq(), mockMunicipalityId, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('returns only the allow-listed namespaces, in the configured order', async () => {
      process.env.HANDOVER_TARGETS = ` ${mockHandoverNamespace}, ${mockSecondaryHandoverNamespace} `;
      const { controller } = makeController();
      const res = mockRes();

      await controller.fetchNamespaceConfigs(mockReq(), mockMunicipalityId, res);

      expect(namespaces(res.body)).toEqual([mockHandoverNamespace, mockSecondaryHandoverNamespace]);
    });

    it('offers MEX at its list position although upstream has no namespace config for it', async () => {
      process.env.HANDOVER_TARGETS = `${mockHandoverNamespace},${mockDepartment},${mockSecondaryHandoverNamespace}`;
      const { controller } = makeController();
      const res = mockRes();

      await controller.fetchNamespaceConfigs(mockReq(), mockMunicipalityId, res);

      expect(namespaces(res.body)).toEqual([mockHandoverNamespace, mockDepartment, mockSecondaryHandoverNamespace]);
      expect((res.body as NamespaceConfig[])[1].municipalityId).toBe(mockMunicipalityId);
    });

    it('offers PT with its own display name although upstream has no namespace config for it', async () => {
      process.env.HANDOVER_TARGETS = `${mockDepartment},${mockParkingPermitDepartment},${mockHandoverNamespace}`;
      const { controller } = makeController();
      const res = mockRes();

      await controller.fetchNamespaceConfigs(mockReq(), mockMunicipalityId, res);

      expect(namespaces(res.body)).toEqual([mockDepartment, mockParkingPermitDepartment, mockHandoverNamespace]);
      expect((res.body as NamespaceConfig[])[1]).toEqual({
        namespace: mockParkingPermitDepartment,
        displayName: 'Parkeringstillstånd/Färdtjänst',
        shortCode: 'PT',
        municipalityId: mockMunicipalityId,
      });
    });

    it('skips the upstream call when the casedata namespaces are the only targets', async () => {
      process.env.HANDOVER_TARGETS = `${mockDepartment},${mockParkingPermitDepartment}`;
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.fetchNamespaceConfigs(mockReq(), mockMunicipalityId, res);

      expect(namespaces(res.body)).toEqual([mockDepartment, mockParkingPermitDepartment]);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('drops the own namespace and namespaces unknown upstream even when they are allow-listed', async () => {
      process.env.HANDOVER_TARGETS = `${mockSupportNamespace},UNKNOWN,${mockHandoverNamespace}`;
      const { controller } = makeController();
      const res = mockRes();

      await controller.fetchNamespaceConfigs(mockReq(), mockMunicipalityId, res);

      expect(namespaces(res.body)).toEqual([mockHandoverNamespace]);
    });
  });

  describe('fetchNamespaceMetadata', () => {
    const names = (body: unknown) => (body as { labels: { labelStructure: Label[] } }).labels.labelStructure.map(entry => entry.resourceName);

    it('hands the modal the levels below the root of a target whose tree sits under one', async () => {
      const { controller, api } = makeController();
      api.get.mockResolvedValueOnce({ data: { categories: [], labels: { labelStructure: rootedStructure() } }, message: 'success' });
      const res = mockRes();

      await controller.fetchNamespaceMetadata(mockReq(), mockMunicipalityId, mockLabelCategorizationNamespace, res);

      expect(res.statusCode).toBe(200);
      expect(names(res.body)).toEqual(['KSK']);
    });

    it('passes the metadata of other targets through untouched', async () => {
      const { controller, api } = makeController();
      const metadata = { categories: [], labels: { labelStructure: flatStructure() } };
      api.get.mockResolvedValueOnce({ data: metadata, message: 'success' });
      const res = mockRes();

      await controller.fetchNamespaceMetadata(mockReq(), mockMunicipalityId, mockHandoverNamespace, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(metadata);
    });
  });

  describe('previewHandover', () => {
    const previewBody = (targetNamespace: string) => ({ targetNamespace, targetMunicipalityId: mockMunicipalityId });

    it('previews an allow-listed target', async () => {
      process.env.HANDOVER_TARGETS = mockHandoverNamespace;
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.previewHandover(mockReq(), mockSupportErrandId, mockMunicipalityId, previewBody(mockHandoverNamespace), res);

      expect(res.statusCode).toBe(200);
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a target outside the allow-list', mockSecondaryHandoverNamespace],
      ['MEX, which is a casedata forward', mockDepartment],
      ['PT, which is a casedata forward', mockParkingPermitDepartment],
    ])('rejects %s with 403 and makes no API call', async (_, targetNamespace) => {
      process.env.HANDOVER_TARGETS = `${mockHandoverNamespace},${mockDepartment},${mockParkingPermitDepartment}`;
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.previewHandover(mockReq(), mockSupportErrandId, mockMunicipalityId, previewBody(targetNamespace), res);

      expect(res.statusCode).toBe(403);
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('handoverErrand', () => {
    const handoverBody = (namespace: string) => ({ target: { namespace, municipalityId: mockMunicipalityId }, mapping: {} });

    it('hands over to an allow-listed target', async () => {
      process.env.HANDOVER_TARGETS = mockHandoverNamespace;
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.handoverErrand(
        mockReq(),
        mockSupportErrandId,
        mockMunicipalityId,
        'idempotency-key',
        handoverBody(mockHandoverNamespace),
        res,
      );

      expect(res.statusCode).toBe(201);
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('rejects a target outside the allow-list with 403 and makes no API call', async () => {
      process.env.HANDOVER_TARGETS = mockHandoverNamespace;
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.handoverErrand(
        mockReq(),
        mockSupportErrandId,
        mockMunicipalityId,
        'idempotency-key',
        handoverBody(mockSecondaryHandoverNamespace),
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(api.post).not.toHaveBeenCalled();
    });

    const sentMapping = (api: ApiStub) => (api.post.mock.calls[0][0] as { data: { mapping: Record<string, unknown> } }).data.mapping;

    it.each([
      [mockLabelCategorizationNamespace, 'KC'],
      [mockHandoverNamespace, 'LOK'],
    ])('gives label target %s the classification its own new errands start with', async (namespace, application) => {
      process.env.HANDOVER_TARGETS = namespace;
      const { controller, api } = makeController();
      const res = mockRes();
      const body = { target: { namespace, municipalityId: mockMunicipalityId }, mapping: { labels: ['label-id'] } };

      await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', body, res);

      expect(res.statusCode).toBe(201);
      expect(sentMapping(api)).toEqual({ labels: ['label-id'], classification: getNewErrandDefaults(application)?.classification });
    });

    it('keeps a classification the client sent and adds none for a two-level target', async () => {
      process.env.HANDOVER_TARGETS = `${mockLabelCategorizationNamespace},${mockSecondaryHandoverNamespace}`;
      const { controller, api } = makeController();
      const classification = { category: 'A', type: 'A/B' };

      await controller.handoverErrand(
        mockReq(),
        mockSupportErrandId,
        mockMunicipalityId,
        'idempotency-key',
        { target: { namespace: mockLabelCategorizationNamespace, municipalityId: mockMunicipalityId }, mapping: { classification } },
        mockRes(),
      );
      expect(sentMapping(api)).toEqual({ classification });

      api.post.mockClear();
      await controller.handoverErrand(
        mockReq(),
        mockSupportErrandId,
        mockMunicipalityId,
        'idempotency-key',
        handoverBody(mockSecondaryHandoverNamespace),
        mockRes(),
      );
      expect(sentMapping(api)).toEqual({});
    });
  });
});
