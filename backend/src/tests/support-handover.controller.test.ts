import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NextFunction, Response } from 'express';
import { getMetadataArgsStorage } from 'routing-controllers';

import { createSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { HandoverErrandDto, HandoverPreviewDto, SupportHandoverController } from '@/controllers/supportmanagement/support-handover.controller';
import { HandoverErrandRequest, HandoverPreviewRequest } from '@/data-contracts/supportmanagement/data-contracts';
import { RequestWithUser } from '@/interfaces/auth.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import ApiService from '@/services/api.service';
import { FeatureFlagService } from '@/services/feature-flag.service';
import { SupportInvestigationDocumentService } from '@/services/support-investigation-document.service';
import { SupportInvestigationHandoverTargetService } from '@/services/support-investigation-handover-target.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';

import { mockReq, mockRes, mockUser } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';

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

const makeController = ({
  existingDocumentKeys = ['future-investigation'],
  verificationError,
  configuredTargets = targetConfiguration,
}: ControllerOptions = {}) => {
  const featureFlags = { getFreshFeatureEnabled: vi.fn(async () => true) } as unknown as FeatureFlagService;
  const policy = new SupportInvestigationPolicyService(featureFlags, profile, 'future-namespace');
  const targets = new SupportInvestigationHandoverTargetService(configuredTargets);
  const verifyReadableDocuments = verificationError
    ? vi.fn().mockRejectedValue(verificationError)
    : vi.fn().mockResolvedValue({ existingDocumentKeys });
  const documentService = { verifyReadableDocuments } as unknown as SupportInvestigationDocumentService;
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
  it('preflights preview and allows a custom future document when Support Management permits the read', async () => {
    const { controller, apiService, verifyReadableDocuments } = makeController();
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
    const { controller, apiService } = makeController({ verificationError: denied });

    await expect(controller.previewHandover(mockReq(), mockSupportErrandId, mockMunicipalityId, previewRequest, mockRes())).rejects.toBe(denied);

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('blocks forwarding protected documents before executing the handover', async () => {
    const denied = Object.assign(new Error('Forbidden'), { status: 403 });
    const { controller, apiService } = makeController({ verificationError: denied });

    await expect(
      controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(true), mockRes()),
    ).rejects.toBe(denied);

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('fails an untyped truthy JSON-parameter include closed before upstream coercion', async () => {
    const denied = Object.assign(new Error('Forbidden'), { status: 403 });
    const { controller, apiService } = makeController({ verificationError: denied });
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
    const { controller, apiService } = makeController();
    const response = mockRes();

    await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(true), response);

    expect(apiService.get).not.toHaveBeenCalled();
    expect(apiService.post).toHaveBeenCalledWith(expect.objectContaining({ headers: { 'Idempotency-Key': 'idempotency-key' } }), expect.anything());
    expect(response.statusCode).toBe(201);
  });

  it.each([undefined, '', ' idempotency-key ', 'x'.repeat(129)])('rejects an invalid Idempotency-Key %s before side effects', async key => {
    const { controller, apiService, verifyReadableDocuments } = makeController();

    await expect(
      controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, key as string, handoverRequest(true), mockRes()),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('Idempotency-Key') });
    expect(verifyReadableDocuments).not.toHaveBeenCalled();
    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('fails closed when no target capability policy is configured', async () => {
    const { controller, apiService } = makeController({ configuredTargets: '' });

    await expect(
      controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(true), mockRes()),
    ).rejects.toMatchObject({ status: 503, message: 'Investigation handover target policy is unavailable' });

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('rejects protected documents for a target outside the explicit capability allowlist', async () => {
    const deniedTargets = JSON.stringify([{ municipalityId: mockMunicipalityId, namespace: 'other-target', documentKeys: ['future-investigation'] }]);
    const { controller, apiService } = makeController({ configuredTargets: deniedTargets });

    await expect(controller.previewHandover(mockReq(), mockSupportErrandId, mockMunicipalityId, previewRequest, mockRes())).rejects.toMatchObject({
      status: 409,
      message: 'Target namespace is not configured to receive protected investigation documents',
    });

    expect(apiService.post).not.toHaveBeenCalled();
  });

  it('does not apply investigation policy when protected documents are not being copied', async () => {
    const { controller, apiService, featureFlags, verifyReadableDocuments } = makeController({ configuredTargets: '' });

    await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(false), mockRes());

    expect(apiService.get).not.toHaveBeenCalled();
    expect(verifyReadableDocuments).not.toHaveBeenCalled();
    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
    expect(apiService.post).toHaveBeenCalledOnce();
  });

  it('does not treat generic JSON parameters as protected profile documents', async () => {
    const { controller, apiService, featureFlags, verifyReadableDocuments } = makeController({
      existingDocumentKeys: [],
      configuredTargets: '',
    });

    await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, 'idempotency-key', handoverRequest(true), mockRes());

    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
    expect(verifyReadableDocuments).toHaveBeenCalledOnce();
    expect(apiService.post).toHaveBeenCalledOnce();
  });

  it('previews generic JSON parameters without requiring a protected-document target policy', async () => {
    const { controller, apiService, featureFlags, verifyReadableDocuments } = makeController({
      existingDocumentKeys: [],
      configuredTargets: '',
    });

    await controller.previewHandover(mockReq(), mockSupportErrandId, mockMunicipalityId, previewRequest, mockRes());

    expect(featureFlags.getFreshFeatureEnabled).not.toHaveBeenCalled();
    expect(verifyReadableDocuments).toHaveBeenCalledOnce();
    expect(apiService.post).toHaveBeenCalledOnce();
  });
});
