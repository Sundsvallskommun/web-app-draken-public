import { Response } from 'express';

import { resolveIafVofInvestigationClassificationPolicy } from '@/config/iaf-vof-investigation-classification';
import { createSupportInvestigationProfile, getSupportInvestigationProfile } from '@/config/support-investigation-profile';
import {
  SupportErrandJsonParameter,
  SupportErrandJsonParameterController,
  UpdateSupportErrandJsonParameterDto,
} from '@/controllers/supportmanagement/support-errand-json-parameter.controller';
import ApiService from '@/services/api.service';
import { SupportInvestigationAccessService } from '@/services/support-investigation-access.service';
import { SupportInvestigationPolicyService } from '@/services/support-investigation-policy.service';
import { SupportJsonParameterService } from '@/services/support-json-parameter.service';

import { ABSENT_HEADER, mockReq, mockRes, MockResponse, mockUser } from './helpers/http';
import { MOCK_HSL_INVESTIGATOR_GROUP, MOCK_UNIT_MANAGER_GROUP, mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';
import { mockErrandAccess } from './helpers/support-errand-access';

interface DocumentServiceStub {
  readJsonParameter: ReturnType<typeof vi.fn>;
  writeJsonParameter: ReturnType<typeof vi.fn>;
  readParentErrandSnapshot: ReturnType<typeof vi.fn>;
}

const makeController = (
  application = 'IAF',
  state: 'active' | 'inactive' | 'unavailable' = 'active',
  documentAccess: 'edit' | 'read' | 'hidden' = 'edit',
) => {
  const documentService: DocumentServiceStub = {
    readJsonParameter: vi.fn(),
    writeJsonParameter: vi.fn(),
    readParentErrandSnapshot: vi.fn(),
  };
  const profile = getSupportInvestigationProfile(application);
  const policyService = {
    getState: vi.fn(async () => state),
    iafVofClassificationPolicy: resolveIafVofInvestigationClassificationPolicy(profile),
  };
  const accessApi = new ApiService();
  vi.spyOn(accessApi, 'get').mockResolvedValue({
    status: 200,
    message: 'success',
    data: {
      ...mockErrandAccess(),
      fields: documentAccess === 'hidden' ? [] : mockErrandAccess().fields,
      resources: [{ resource: 'errand/json-parameter', level: documentAccess === 'read' ? 'R' : 'RW' }],
    },
  });
  const controller = new SupportErrandJsonParameterController(
    profile,
    documentService as unknown as SupportJsonParameterService,
    policyService as unknown as SupportInvestigationPolicyService,
    new SupportInvestigationAccessService({ apiService: accessApi }),
  );
  return { controller, documentService, policyService };
};

const resDouble = () => mockRes() as unknown as MockResponse & Response;
const UNSUPPORTED_KEY_ERROR = { status: 400, message: 'Unsupported investigation JSON parameter key' };

beforeEach(() => {
  vi.restoreAllMocks();
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

  it('refuses both writing and reading a document absent from the errand access', async () => {
    const { controller, documentService } = makeController('IAF', 'active', 'hidden');
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
    ).rejects.toMatchObject({ status: 403, message: 'Missing write permissions for this investigation document' });

    expect(documentService.writeJsonParameter).not.toHaveBeenCalled();

    await expect(
      controller.getJsonParameter(unitManager, mockMunicipalityId, mockSupportErrandId, 'utredning-hsl', resDouble()),
    ).rejects.toMatchObject({ status: 403, message: 'Missing permissions for this investigation document' });

    expect(documentService.readJsonParameter).not.toHaveBeenCalled();
  });

  it('serves a read-only document but refuses its write', async () => {
    const { controller, documentService } = makeController('IAF', 'active', 'read');
    const parameter: SupportErrandJsonParameter = {
      key: 'utredning-hsl',
      schemaId: '2281_utredning-hsl_1.0',
      value: { summary: 'Test' },
      version: 3,
    };
    documentService.readJsonParameter.mockResolvedValue({ document: parameter, etag: '"3"', status: 200 });
    const unitManager = mockReq(mockUser({ groups: [MOCK_UNIT_MANAGER_GROUP] }));

    await controller.getJsonParameter(unitManager, mockMunicipalityId, mockSupportErrandId, 'utredning-hsl', resDouble());

    expect(documentService.readJsonParameter).toHaveBeenCalledTimes(1);

    await expect(
      controller.updateJsonParameter(
        unitManager,
        mockMunicipalityId,
        mockSupportErrandId,
        'utredning-hsl',
        '"3"',
        ABSENT_HEADER,
        '10',
        { schemaId: '2281_utredning-hsl_1.0', value: {} },
        resDouble(),
      ),
    ).rejects.toMatchObject({ status: 403, message: 'Missing write permissions for this investigation document' });

    expect(documentService.writeJsonParameter).not.toHaveBeenCalled();
  });

  it('lets an upstream-authorized user write without an application edit permission', async () => {
    const { controller, documentService } = makeController('IAF', 'active', 'edit');
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

  describe('a document declared for reported misconduct only', () => {
    const decisionKey = 'beslut-sol-lss';
    const update = { schemaId: '2281_beslut-sol-lss_1.1', value: { ivoNotification: 'no' } };
    const deviationErrand = { id: mockSupportErrandId, parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }] };
    const savedInvestigation = { key: 'utredning-sol-lss', schemaId: '2281_utredning-sol-lss_1.0', value: {} };
    const misconductErrand = {
      id: mockSupportErrandId,
      parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE'] }],
      jsonParameters: [savedInvestigation],
    };
    const NOT_APPLICABLE_ERROR = { status: 409, message: 'This investigation document applies to reported misconduct errands only' };

    it('is served and written on a reported misconduct errand', async () => {
      const { controller, documentService } = makeController();
      documentService.readParentErrandSnapshot.mockResolvedValue(misconductErrand);
      documentService.readJsonParameter.mockResolvedValue({ document: { key: decisionKey, ...update, version: 1 }, etag: '"1"', status: 200 });
      documentService.writeJsonParameter.mockResolvedValue({
        document: { key: decisionKey, ...update, version: 2 },
        etag: '"2"',
        status: 200,
        parentErrandVersion: 5,
      });
      const req = mockReq();

      await controller.getJsonParameter(req, mockMunicipalityId, mockSupportErrandId, decisionKey, resDouble());
      await controller.updateJsonParameter(req, mockMunicipalityId, mockSupportErrandId, decisionKey, '"1"', ABSENT_HEADER, '4', update, resDouble());

      // One parent read per call: the prerequisite check reuses the applicability snapshot.
      expect(documentService.readParentErrandSnapshot).toHaveBeenCalledTimes(2);
      expect(documentService.readParentErrandSnapshot).toHaveBeenCalledWith({
        definition: expect.objectContaining({ key: decisionKey, appliesTo: 'reported-misconduct', placement: 'decision' }),
        municipalityId: mockMunicipalityId,
        errandId: mockSupportErrandId,
        user: req.user,
      });
      expect(documentService.readJsonParameter).toHaveBeenCalledTimes(1);
      expect(documentService.writeJsonParameter).toHaveBeenCalledTimes(1);
    });

    it('is refused on an ordinary deviation errand before the document is touched', async () => {
      const { controller, documentService } = makeController();
      documentService.readParentErrandSnapshot.mockResolvedValue(deviationErrand);

      await expect(controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, decisionKey, resDouble())).rejects.toMatchObject(
        NOT_APPLICABLE_ERROR,
      );
      await expect(
        controller.updateJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, decisionKey, ABSENT_HEADER, '*', '4', update, resDouble()),
      ).rejects.toMatchObject(NOT_APPLICABLE_ERROR);

      expect(documentService.readJsonParameter).not.toHaveBeenCalled();
      expect(documentService.writeJsonParameter).not.toHaveBeenCalled();
    });

    it('is read but not written while the SoL/LSS investigation it answers is missing from the errand', async () => {
      const { controller, documentService } = makeController();
      documentService.readParentErrandSnapshot.mockResolvedValue({ ...misconductErrand, jsonParameters: [] });
      documentService.readJsonParameter.mockResolvedValue({ document: { key: decisionKey, ...update, version: 1 }, etag: '"1"', status: 200 });

      await controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, decisionKey, resDouble());
      await expect(
        controller.updateJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, decisionKey, ABSENT_HEADER, '*', '4', update, resDouble()),
      ).rejects.toMatchObject({ status: 409, message: 'This investigation document requires utredning-sol-lss to be saved on the errand first' });

      expect(documentService.writeJsonParameter).not.toHaveBeenCalled();
    });

    it('is checked only after document access, so a hidden document reveals nothing about the errand', async () => {
      const { controller, documentService } = makeController('IAF', 'active', 'hidden');

      await expect(
        controller.getJsonParameter(
          mockReq(mockUser({ groups: [MOCK_UNIT_MANAGER_GROUP] })),
          mockMunicipalityId,
          mockSupportErrandId,
          decisionKey,
          resDouble(),
        ),
      ).rejects.toMatchObject({ status: 403 });

      expect(documentService.readParentErrandSnapshot).not.toHaveBeenCalled();
    });

    it('never reads the parent errand for documents that apply to every errand', async () => {
      const { controller, documentService } = makeController();
      documentService.readJsonParameter.mockResolvedValue({
        document: { key: 'utredning-hsl', schemaId: '2281_utredning-hsl_1.0', value: {}, version: 1 },
        etag: '"1"',
        status: 200,
      });

      await controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, 'utredning-hsl', resDouble());

      expect(documentService.readParentErrandSnapshot).not.toHaveBeenCalled();
    });

    it('fails closed when the application has no classification policy to decide applicability', async () => {
      const profile = createSupportInvestigationProfile({
        application: 'FUTURE',
        documents: [{ key: decisionKey, schemaName: 'beslut-sol-lss', tabLabel: 'Beslut', ownerLabel: 'Owner', appliesTo: 'reported-misconduct' }],
      });
      const documentService = { readJsonParameter: vi.fn(), readParentErrandSnapshot: vi.fn() } as unknown as SupportJsonParameterService;
      const policyService = { getState: vi.fn().mockResolvedValue('active'), iafVofClassificationPolicy: undefined };
      const accessApi = new ApiService();
      vi.spyOn(accessApi, 'get').mockResolvedValue({ status: 200, message: 'success', data: mockErrandAccess() });
      const controller = new SupportErrandJsonParameterController(
        profile,
        documentService,
        policyService as unknown as SupportInvestigationPolicyService,
        new SupportInvestigationAccessService({ apiService: accessApi }),
      );

      await expect(controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, decisionKey, resDouble())).rejects.toMatchObject({
        status: 409,
        message: 'Restricted investigation documents require an investigation classification policy',
      });
      expect(documentService.readParentErrandSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('a document declared for HSL deviations only', () => {
    const decisionKey = 'beslut-hsl';
    const update = { schemaId: '2281_beslut-hsl_1.0', value: { ivoNotification: 'no' } };
    const hslLabel = { classification: 'PROVISION', resourcePath: 'PROVISION/HSL', resourceName: 'HSL' };
    const solLabel = { classification: 'PROVISION', resourcePath: 'PROVISION/SOL', resourceName: 'SOL' };
    const hslDeviation = { id: mockSupportErrandId, parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }], labels: [hslLabel] };
    const solDeviation = { id: mockSupportErrandId, parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }], labels: [solLabel] };
    const hslMisconduct = { id: mockSupportErrandId, parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE'] }], labels: [hslLabel] };
    const NOT_APPLICABLE_ERROR = { status: 409, message: 'This investigation document applies to HSL deviation errands only' };

    it('is served and written on an ordinary deviation under HSL', async () => {
      const { controller, documentService } = makeController();
      documentService.readParentErrandSnapshot.mockResolvedValue(hslDeviation);
      documentService.readJsonParameter.mockResolvedValue({ document: { key: decisionKey, ...update, version: 1 }, etag: '"1"', status: 200 });
      documentService.writeJsonParameter.mockResolvedValue({
        document: { key: decisionKey, ...update, version: 2 },
        etag: '"2"',
        status: 200,
        parentErrandVersion: 5,
      });
      const req = mockReq();

      await controller.getJsonParameter(req, mockMunicipalityId, mockSupportErrandId, decisionKey, resDouble());
      await controller.updateJsonParameter(req, mockMunicipalityId, mockSupportErrandId, decisionKey, '"1"', ABSENT_HEADER, '4', update, resDouble());

      expect(documentService.readParentErrandSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ definition: expect.objectContaining({ key: decisionKey, appliesTo: 'hsl-deviation', placement: 'decision' }) }),
      );
      expect(documentService.readJsonParameter).toHaveBeenCalledTimes(1);
      expect(documentService.writeJsonParameter).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a deviation without HSL', solDeviation],
      ['a reported misconduct, even under HSL', hslMisconduct],
    ])('is refused on %s before the document is touched', async (_case, errand) => {
      const { controller, documentService } = makeController();
      documentService.readParentErrandSnapshot.mockResolvedValue(errand);

      await expect(controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, decisionKey, resDouble())).rejects.toMatchObject(
        NOT_APPLICABLE_ERROR,
      );
      await expect(
        controller.updateJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, decisionKey, ABSENT_HEADER, '*', '4', update, resDouble()),
      ).rejects.toMatchObject(NOT_APPLICABLE_ERROR);

      expect(documentService.readJsonParameter).not.toHaveBeenCalled();
      expect(documentService.writeJsonParameter).not.toHaveBeenCalled();
    });

    it('keeps the lex Sarah decision closed on the same HSL deviation', async () => {
      const { controller, documentService } = makeController();
      documentService.readParentErrandSnapshot.mockResolvedValue(hslDeviation);

      await expect(
        controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, 'beslut-sol-lss', resDouble()),
      ).rejects.toMatchObject({
        status: 409,
        message: 'This investigation document applies to reported misconduct errands only',
      });
    });
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
    const accessApi = new ApiService();
    vi.spyOn(accessApi, 'get').mockResolvedValue({ status: 200, message: 'success', data: mockErrandAccess() });
    const controller = new SupportErrandJsonParameterController(
      profile,
      documentService,
      policyService as unknown as SupportInvestigationPolicyService,
      new SupportInvestigationAccessService({ apiService: accessApi }),
    );

    await controller.getJsonParameter(mockReq(), mockMunicipalityId, mockSupportErrandId, 'custom-document', resDouble());

    expect(documentService.readJsonParameter).toHaveBeenCalledWith(expect.objectContaining({ definition: profile.documents[0] }));
  });
});
