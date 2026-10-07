import { SupportHandoverController } from '@/controllers/supportmanagement/support-handover.controller';
import { Label, NamespaceConfig } from '@/data-contracts/supportmanagement/data-contracts';
import { getNewErrandDefaults } from '@/services/support-errand.service';

import { mockReq, mockRes } from './helpers/http';
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

    const sentMapping = (api: ApiStub) => (api.post.mock.calls[0][0] as { data: { mapping: Record<string, unknown> } }).data.mapping;

    it.each([
      [mockLabelCategorizationNamespace, 'KC'],
      [mockHandoverNamespace, 'LOK'],
    ])('gives label target %s the classification its own new errands start with', async (namespace, application) => {
      process.env.HANDOVER_TARGETS = namespace;
      const { controller, api } = makeController();
      const res = mockRes();
      const body = { target: { namespace, municipalityId: mockMunicipalityId }, mapping: { labels: ['label-id'] } };

      await controller.handoverErrand(mockReq(), mockSupportErrandId, mockMunicipalityId, '', body, res);

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
        '',
        { target: { namespace: mockLabelCategorizationNamespace, municipalityId: mockMunicipalityId }, mapping: { classification } },
        mockRes(),
      );
      expect(sentMapping(api)).toEqual({ classification });

      api.post.mockClear();
      await controller.handoverErrand(
        mockReq(),
        mockSupportErrandId,
        mockMunicipalityId,
        '',
        handoverBody(mockSecondaryHandoverNamespace),
        mockRes(),
      );
      expect(sentMapping(api)).toEqual({});
    });
  });
});
