import { SupportHandoverController } from '@/controllers/supportmanagement/support-handover.controller';
import { NamespaceConfig } from '@/data-contracts/supportmanagement/data-contracts';

import { mockReq, mockRes } from './helpers/http';
import {
  mockDepartment,
  mockHandoverNamespace,
  mockMunicipalityId,
  mockSecondaryHandoverNamespace,
  mockSupportErrandId,
  mockSupportNamespace,
} from './helpers/mock-data';

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
}

const config = (namespace: string): NamespaceConfig => ({ namespace, displayName: namespace, shortCode: namespace }) as NamespaceConfig;

// Upstream returns every namespace in the municipality, including the drake's own.
const upstreamConfigs = [config(mockSupportNamespace), config(mockSecondaryHandoverNamespace), config(mockHandoverNamespace)];

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

    it('skips the upstream call when MEX is the only target', async () => {
      process.env.HANDOVER_TARGETS = mockDepartment;
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.fetchNamespaceConfigs(mockReq(), mockMunicipalityId, res);

      expect(namespaces(res.body)).toEqual([mockDepartment]);
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
    ])('rejects %s with 403 and makes no API call', async (_, targetNamespace) => {
      process.env.HANDOVER_TARGETS = `${mockHandoverNamespace},${mockDepartment}`;
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

      await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, '', handoverBody(mockHandoverNamespace), res);

      expect(res.statusCode).toBe(201);
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('rejects a target outside the allow-list with 403 and makes no API call', async () => {
      process.env.HANDOVER_TARGETS = mockHandoverNamespace;
      const { controller, api } = makeController();
      const res = mockRes();

      await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, '', handoverBody(mockSecondaryHandoverNamespace), res);

      expect(res.statusCode).toBe(403);
      expect(api.post).not.toHaveBeenCalled();
    });
  });
});
