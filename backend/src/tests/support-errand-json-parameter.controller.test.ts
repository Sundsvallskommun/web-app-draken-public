import { Response } from 'express';

import { resolveSupportInvestigationDocumentGroups } from '@/config/support-investigation-document-groups';
import { createSupportInvestigationProfile, getSupportInvestigationProfile } from '@/config/support-investigation-profile';
import {
  SupportErrandJsonParameter,
  SupportErrandJsonParameterController,
  UpdateSupportErrandJsonParameterDto,
} from '@/controllers/supportmanagement/support-errand-json-parameter.controller';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { SupportJsonParameterService } from '@/services/support-json-parameter.service';

import { ABSENT_HEADER, mockReq, mockRes, MockResponse, mockUser } from './helpers/http';
import { MOCK_HSL_INVESTIGATOR_GROUP, MOCK_UNIT_MANAGER_GROUP, mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';

interface DocumentServiceStub {
  readJsonParameter: ReturnType<typeof vi.fn>;
  writeJsonParameter: ReturnType<typeof vi.fn>;
}

const makeController = (application = 'IAF', state: 'active' | 'inactive' | 'unavailable' = 'active', configuredDocumentGroups = '') => {
  const documentService: DocumentServiceStub = {
    readJsonParameter: vi.fn(),
    writeJsonParameter: vi.fn(),
  };
  const policyService = {
    getState: vi.fn(async () => state),
  };
  const controller = new SupportErrandJsonParameterController(
    getSupportInvestigationProfile(application),
    documentService as unknown as SupportJsonParameterService,
    policyService as unknown as SupportInvestigationPolicyService,
    new SupportInvestigationAccessService(resolveSupportInvestigationDocumentGroups(configuredDocumentGroups)),
  );
  return { controller, documentService, policyService };
};

const resDouble = () => mockRes() as unknown as MockResponse & Response;
const UNSUPPORTED_KEY_ERROR = { status: 400, message: 'Unsupported investigation JSON parameter key' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SupportErrandJsonParameterController', () => {
  it('reads the profile-selected document and forwards its strong ETag', async () => {
    const parameter: SupportErrandJsonParameter = {
      key: 'utredning-enhetschef',
      schemaId: '2281_utredning-enhetschef_1.0',
      value: { summary: 'Test' },
      version: 3,
    };
    const { controller, documentService } = makeController();
    documentService.readJsonParameter.mockResolvedValue({ document: parameter, etag: '"3"', status: 200 });
    const req = mockReq();
    const res = resDouble();

    await controller.getJsonParameter(req, mockMunicipalityId, mockSupportErrandId, parameter.key, res);

    expect(documentService.readJsonParameter).toHaveBeenCalledWith({
      definition: expect.objectContaining({ key: parameter.key, schemaName: 'utredning-enhetschef' }),
      municipalityId: mockMunicipalityId,
      errandId: mockSupportErrandId,
      user: req.user,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers.ETag).toBe('"3"');
    expect(res.body).toEqual(parameter);
  });

  it('fails closed before document reads when the runtime policy is unavailable', async () => {
    const { controller, documentService } = makeController('IAF', 'unavailable');

    await expect(
      controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, 'utredning-enhetschef', resDouble()),
    ).rejects.toMatchObject({ status: 503, message: 'Investigation read policy is temporarily unavailable' });

    expect(documentService.readJsonParameter).not.toHaveBeenCalled();
  });

  it('writes through the deep document boundary and returns status, ETag and fresh parent version', async () => {
    const update: UpdateSupportErrandJsonParameterDto = {
      schemaId: '2281_utredning-hsl_1.0',
      value: { assessment: 'Test' },
    };
    const updated: SupportErrandJsonParameter = { key: 'utredning-hsl', ...update, version: 8 };
    const { controller, documentService, policyService } = makeController();
    documentService.writeJsonParameter.mockResolvedValue({
      document: updated,
      etag: '"8"',
      status: 200,
      parentErrandVersion: 13,
    });
    const req = mockReq();
    const res = resDouble();

    await controller.updateJsonParameter(req, mockMunicipalityId, mockSupportErrandId, updated.key, '"7"', ABSENT_HEADER, '12', update, res);

    expect(policyService.getState).toHaveBeenCalledWith(req.user);
    expect(documentService.writeJsonParameter).toHaveBeenCalledWith({
      definition: expect.objectContaining({ key: updated.key, schemaName: 'utredning-hsl' }),
      municipalityId: mockMunicipalityId,
      errandId: mockSupportErrandId,
      user: req.user,
      data: update,
      preconditions: { ifMatch: '"7"', ifNoneMatch: undefined, parentErrandVersion: '12' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers.ETag).toBe('"8"');
    expect(res.headers['X-Errand-Version']).toBe('13');
    expect(res.body).toEqual(updated);
  });

  it('preserves create status and forwards the create-only precondition', async () => {
    const update = { schemaId: '2281_utredning-enhetschef_1.0', value: {} };
    const document = { key: 'utredning-enhetschef', ...update, version: 0 };
    const { controller, documentService } = makeController();
    documentService.writeJsonParameter.mockResolvedValue({
      document,
      etag: '"0"',
      status: 201,
      parentErrandVersion: 4,
    });
    const res = resDouble();

    await controller.updateJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, document.key, ABSENT_HEADER, '*', '3', update, res);

    expect(documentService.writeJsonParameter.mock.calls[0][0].preconditions).toEqual({
      ifMatch: undefined,
      ifNoneMatch: '*',
      parentErrandVersion: '3',
    });
    expect(res.statusCode).toBe(201);
  });

  it.each([
    ['inactive', 409, 'Investigation documents are not active for this application'],
    ['unavailable', 503, 'Investigation write policy is temporarily unavailable'],
  ] as const)('fails closed before document writes when policy is %s', async (state, status, message) => {
    const { controller, documentService } = makeController('IAF', state);

    await expect(
      controller.updateJsonParameter(
        mockReq(),
        mockMunicipalityId,
        mockSupportErrandId,
        'utredning-enhetschef',
        ABSENT_HEADER,
        '*',
        '10',
        { schemaId: '2281_utredning-enhetschef_1.0', value: {} },
        resDouble(),
      ),
    ).rejects.toMatchObject({ status, message });

    expect(documentService.writeJsonParameter).not.toHaveBeenCalled();
  });

  it('refuses both the write and the read of a document the user is not mapped to', async () => {
    const configuredDocumentGroups = JSON.stringify([{ documentKey: 'utredning-hsl', groups: [MOCK_HSL_INVESTIGATOR_GROUP] }]);
    const { controller, documentService } = makeController('IAF', 'active', configuredDocumentGroups);
    const unitManager = mockReq(mockUser({ groups: [MOCK_UNIT_MANAGER_GROUP] }));

    await expect(
      controller.updateJsonParameter(
        unitManager,
        mockMunicipalityId,
        mockSupportErrandId,
        'utredning-hsl',
        ABSENT_HEADER,
        '*',
        '10',
        { schemaId: '2281_utredning-hsl_1.0', value: {} },
        resDouble(),
      ),
    ).rejects.toMatchObject({ status: 403, message: 'Missing permissions for this investigation document' });

    expect(documentService.writeJsonParameter).not.toHaveBeenCalled();

    await expect(
      controller.getJsonParameter(unitManager, mockMunicipalityId, mockSupportErrandId, 'utredning-hsl', resDouble()),
    ).rejects.toMatchObject({ status: 403, message: 'Missing permissions for this investigation document' });

    expect(documentService.readJsonParameter).not.toHaveBeenCalled();
  });

  it('lets the mapped group write its own document', async () => {
    const configuredDocumentGroups = JSON.stringify([{ documentKey: 'utredning-hsl', groups: [MOCK_HSL_INVESTIGATOR_GROUP] }]);
    const { controller, documentService } = makeController('IAF', 'active', configuredDocumentGroups);
    documentService.writeJsonParameter.mockResolvedValue({
      document: { key: 'utredning-hsl', schemaId: '2281_utredning-hsl_1.0', value: {}, version: 2 },
      etag: '"2"',
      status: 200,
      parentErrandVersion: 11,
    });

    await controller.updateJsonParameter(
      mockReq(mockUser({ groups: [MOCK_HSL_INVESTIGATOR_GROUP] })),
      mockMunicipalityId,
      mockSupportErrandId,
      'utredning-hsl',
      ABSENT_HEADER,
      '*',
      '10',
      { schemaId: '2281_utredning-hsl_1.0', value: {} },
      resDouble(),
    );

    expect(documentService.writeJsonParameter).toHaveBeenCalledTimes(1);
  });

  it('rejects keys outside the configured profile before any upstream or policy call', async () => {
    const { controller, documentService, policyService } = makeController();

    await expect(
      controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, 'other-document', resDouble()),
    ).rejects.toMatchObject(UNSUPPORTED_KEY_ERROR);
    await expect(
      controller.updateJsonParameter(
        mockReq(),
        mockMunicipalityId,
        mockSupportErrandId,
        'other-document',
        ABSENT_HEADER,
        '*',
        '10',
        { schemaId: '2281_other-document_1.0', value: {} },
        resDouble(),
      ),
    ).rejects.toMatchObject(UNSUPPORTED_KEY_ERROR);

    expect(documentService.readJsonParameter).not.toHaveBeenCalled();
    expect(documentService.writeJsonParameter).not.toHaveBeenCalled();
    expect(policyService.getState).not.toHaveBeenCalled();
  });

  it('fails closed when the application has no investigation profile', async () => {
    const { controller, documentService } = makeController('KC', 'inactive');

    await expect(
      controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, 'utredning-enhetschef', resDouble()),
    ).rejects.toMatchObject(UNSUPPORTED_KEY_ERROR);
    expect(documentService.readJsonParameter).not.toHaveBeenCalled();
  });

  it('passes the complete injected definition for a future application without app-name branches', async () => {
    const profile = createSupportInvestigationProfile({
      application: 'FUTURE',
      documents: [{ key: 'custom-document', schemaName: 'shared-schema', tabLabel: 'Custom', ownerLabel: 'Owner' }],
    });
    const documentService = {
      readJsonParameter: vi.fn(async () => ({
        document: { key: 'custom-document', schemaId: '2281_shared-schema_1.0', value: {} },
        etag: '"1"',
        status: 200,
      })),
    } as unknown as SupportJsonParameterService;
    const policyService = { getState: vi.fn().mockResolvedValue('active') };
    const controller = new SupportErrandJsonParameterController(
      profile,
      documentService,
      policyService as unknown as SupportInvestigationPolicyService,
    );

    await controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, 'custom-document', resDouble());

    expect(documentService.readJsonParameter).toHaveBeenCalledWith(expect.objectContaining({ definition: profile.documents[0] }));
  });
});
