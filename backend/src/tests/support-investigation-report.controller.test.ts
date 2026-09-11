import { Response } from 'express';

import { createSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { SupportInvestigationReportController } from '@/controllers/supportmanagement/support-investigation-report.controller';
import ApiService from '@/services/api.service';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { SupportJsonParameterService } from '@/services/support-json-parameter.service';

import { mockReq, mockRes, MockResponse } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';
import { mockErrandAccess } from './helpers/support-errand-access';

const KEY = 'utredning-hsl';
const profile = createSupportInvestigationProfile({
  application: 'IAF',
  documents: [{ key: KEY, schemaName: KEY, tabLabel: 'Utredning HSL', ownerLabel: 'MAS/MAR' }],
});
const schema = {
  id: '2281_utredning-hsl_1.2',
  name: KEY,
  version: '1.2',
  value: {
    title: 'Utredning HSL',
    type: 'object',
    'x-draken-completion': { field: 'completed', reportsField: 'reports' },
    properties: {
      assignment: { title: 'Uppdrag', type: 'string' },
      completed: { title: 'Klar', type: 'string' },
      reports: { title: 'Rapporter', type: 'array', 'x-draken-server-owned': true },
    },
  },
};
const uiSchema = { 'ui:sections': [{ id: 'a', title: 'Uppdrag', fields: ['assignment', 'completed', 'reports'] }] };
const storedDocument = (value: Record<string, unknown>) => ({
  document: { key: KEY, schemaId: schema.id, value, version: 3 },
  etag: '"3"',
  status: 200,
});

const makeController = (value: Record<string, unknown>, state: 'active' | 'inactive' | 'unavailable' = 'active') => {
  const documentService = {
    readJsonParameter: vi.fn().mockResolvedValue(storedDocument(value)),
    readBoundSchema: vi.fn().mockResolvedValue(schema),
    readUiSchema: vi.fn().mockResolvedValue(uiSchema),
    readParentErrandWithVersion: vi.fn().mockResolvedValue({ errand: { errandNumber: 'IAF-2026-0001', title: 'Avvikelse', labels: [] }, version: 9 }),
    writeJsonParameter: vi.fn().mockImplementation(async request => ({
      document: { key: KEY, schemaId: schema.id, value: { ...request.data.value, ...request.internal.serverOwnedOverrides }, version: 4 },
      etag: '"4"',
      status: 200,
      parentErrandVersion: 10,
    })),
  };
  const policyService = { getState: vi.fn(async () => state) };
  const accessApi = new ApiService();
  vi.spyOn(accessApi, 'get').mockResolvedValue({ status: 200, message: 'success', data: mockErrandAccess() });
  const apiService = {
    post: vi.fn().mockImplementation(async config => {
      if (String(config.url).includes('/render/direct/pdf')) return { status: 200, message: 'success', data: { output: 'UERG' } };
      return { status: 201, message: 'success', data: { id: 'attachment-1', fileName: 'x' }, headers: {} };
    }),
  };
  const controller = new SupportInvestigationReportController({
    investigationProfile: profile,
    documentService: documentService as unknown as SupportJsonParameterService,
    policyService: policyService as unknown as SupportInvestigationPolicyService,
    accessService: new SupportInvestigationAccessService({ apiService: accessApi }),
    apiService,
    namespace: 'NS',
    supportManagementService: 'supportmanagement/1.0',
    templatingService: 'templating/2.0',
    clock: () => new Date('2026-09-11T12:30:00.000Z'),
  });
  return { controller, documentService, apiService };
};

const resDouble = () => mockRes() as unknown as MockResponse & Response;

describe('SupportInvestigationReportController', () => {
  it('renders, attaches and records the next numbered report for a completed document', async () => {
    const { controller, documentService, apiService } = makeController({
      assignment: 'Klart',
      completed: 'yes',
      reports: [{ generatedAt: '2026-09-10T10:00:00.000Z', generatedBy: 'earlier', fileName: 'Utredning HSL_1.pdf' }],
    });
    const res = resDouble();

    await controller.createReport(mockReq(), mockMunicipalityId, mockSupportErrandId, KEY, {}, res);

    expect(apiService.post).toHaveBeenCalledTimes(2);
    const [renderCall, attachCall] = apiService.post.mock.calls.map(([config]) => config);
    expect(renderCall.url).toBe(`templating/2.0/${mockMunicipalityId}/render/direct/pdf`);
    expect(renderCall.data.parameters.report).toMatchObject({
      title: 'Utredning HSL',
      sequence: 2,
      generatedAt: '2026-09-11 12:30',
      errand: { errandNumber: 'IAF-2026-0001' },
      sections: [{ title: 'Uppdrag', fields: [{ label: 'Uppdrag', kind: 'text', text: 'Klart' }] }],
    });
    expect(Buffer.from(renderCall.data.content, 'base64').toString('utf8')).toContain('{{ report.title }}');
    expect(attachCall.url).toBe(`supportmanagement/1.0/${mockMunicipalityId}/NS/errands/${mockSupportErrandId}/attachments`);

    expect(documentService.writeJsonParameter).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { schemaId: schema.id, value: expect.objectContaining({ completed: 'yes' }) },
        preconditions: { ifMatch: '"3"', parentErrandVersion: '9' },
        internal: {
          allowLocked: true,
          serverOwnedOverrides: {
            reports: [
              { generatedAt: '2026-09-10T10:00:00.000Z', generatedBy: 'earlier', fileName: 'Utredning HSL_1.pdf' },
              {
                generatedAt: '2026-09-11T12:30:00.000Z',
                generatedBy: mockReq().user.username,
                fileName: 'Utredning HSL_2.pdf',
                attachmentId: 'attachment-1',
              },
            ],
          },
        },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.setHeader).toHaveBeenCalledWith('ETag', '"4"');
    expect(res.setHeader).toHaveBeenCalledWith('X-Errand-Version', '10');
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ report: expect.objectContaining({ fileName: 'Utredning HSL_2.pdf' }) }) }),
    );
  });

  it('previews by rendering only, without attaching or recording anything', async () => {
    const { controller, documentService, apiService } = makeController({ completed: 'yes' });
    const res = resDouble();

    await controller.createReport(mockReq(), mockMunicipalityId, mockSupportErrandId, KEY, { preview: true }, res);

    expect(apiService.post).toHaveBeenCalledTimes(1);
    expect(documentService.writeJsonParameter).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ data: { fileName: 'Utredning HSL_1.pdf', pdfBase64: 'UERG' } }));
  });

  it('refuses a report for a document that is not marked completed', async () => {
    const { controller, documentService, apiService } = makeController({ completed: 'no' });

    await expect(controller.createReport(mockReq(), mockMunicipalityId, mockSupportErrandId, KEY, {}, resDouble())).rejects.toMatchObject({
      status: 409,
      message: 'Mark the investigation as completed before generating a report',
    });
    expect(apiService.post).not.toHaveBeenCalled();
    expect(documentService.writeJsonParameter).not.toHaveBeenCalled();
  });

  it('refuses an unknown document key and an inactive investigation policy', async () => {
    await expect(
      makeController({}).controller.createReport(mockReq(), mockMunicipalityId, mockSupportErrandId, 'unknown', {}, resDouble()),
    ).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      makeController({ completed: 'yes' }, 'inactive').controller.createReport(
        mockReq(),
        mockMunicipalityId,
        mockSupportErrandId,
        KEY,
        {},
        resDouble(),
      ),
    ).rejects.toMatchObject({
      status: 409,
    });
  });
});
