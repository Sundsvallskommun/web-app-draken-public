import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { SupportPhaseController, UpdateSupportErrandPhaseDto } from '@/controllers/supportmanagement/support-phase.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

const MUNICIPALITY_ID = mockMunicipalityId;
const NAMESPACE = mockSupportNamespace;

interface ApiStub {
  get: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
}

const makeController = () => {
  const controller = new SupportPhaseController();
  const api: ApiStub = {
    get: vi.fn(async () => ({ data: { version: 7, status: 'ONGOING' }, headers: { etag: '"7"' }, message: 'success' })),
    patch: vi.fn(async () => ({ data: {}, message: 'success' })),
  };
  (controller as unknown as { apiService: ApiStub }).apiService = api;
  return { controller, api };
};

describe('UpdateSupportErrandPhaseDto', () => {
  it('accepts the phase the client saw and an explicit transition id, and nothing that names a target', async () => {
    const valid = plainToInstance(UpdateSupportErrandPhaseDto, { expectedActivePhaseId: 'received', transitionId: 'start-investigation' });
    const entering = plainToInstance(UpdateSupportErrandPhaseDto, { expectedActivePhaseId: null });
    const invalid = plainToInstance(UpdateSupportErrandPhaseDto, {
      expectedActivePhaseId: '',
      transitionId: '',
      activePhaseId: 'client-selected-target-is-not-accepted',
    });

    await expect(validate(valid, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    await expect(validate(entering, { whitelist: true, forbidNonWhitelisted: true })).resolves.toEqual([]);
    const serializedErrors = JSON.stringify(await validate(invalid, { whitelist: true, forbidNonWhitelisted: true }));
    expect(serializedErrors).toMatch(/expectedActivePhaseId/);
    expect(serializedErrors).toMatch(/transitionId/);
    expect(serializedErrors).toMatch(/activePhaseId/);
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

  /** The errand as upstream holds it at the first read, and after the transition. */
  const stubErrand = (api: ApiStub, before: { phaseId: string; version: number }) => {
    let errandRead = 0;
    api.get.mockImplementation(async (config: { url?: string }) => {
      if (config.url === metadataUrl) return { data: { phases }, message: 'success' };
      errandRead += 1;
      return errandRead === 1
        ? {
            data: { id: mockSupportErrandId, phases: [{ phaseId: before.phaseId }], status: 'ONGOING', version: before.version },
            message: 'success',
            headers: { etag: `"${before.version}"` },
          }
        : {
            data: { id: mockSupportErrandId, phases: [{ phaseId: 'closed' }], status: 'ONGOING', version: before.version + 1 },
            message: 'success',
            headers: { etag: `"${before.version + 1}"` },
          };
    });
  };

  it('rejects a request without a municipality id and makes no API call', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.updateSupportErrandPhase(mockReq(), mockSupportErrandId, '', { expectedActivePhaseId: 'received', transitionId: 'next' }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toBe('Municipality id missing');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('applies the selected transition with If-Match on the version it read and returns the fresh errand version', async () => {
    const { controller, api } = makeController();
    stubErrand(api, { phaseId: 'received', version: 7 });
    const req = mockReq();
    const res = mockRes();

    await controller.updateSupportErrandPhase(
      req,
      mockSupportErrandId,
      MUNICIPALITY_ID,
      { expectedActivePhaseId: 'received', transitionId: 'close-directly' },
      res,
    );

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
    expect(res.body).toMatchObject({ phases: [{ phaseId: 'closed' }], version: 8 });
  });

  // A measure, document or label written since the page loaded moves the errand's version, not its phase.
  it('moves an errand whose version has moved on while its phase has not', async () => {
    const { controller, api } = makeController();
    stubErrand(api, { phaseId: 'received', version: 14 });

    await controller.updateSupportErrandPhase(
      mockReq(),
      mockSupportErrandId,
      MUNICIPALITY_ID,
      { expectedActivePhaseId: 'received', transitionId: 'close-directly' },
      mockRes(),
    );

    expect(api.patch).toHaveBeenCalledWith(expect.objectContaining({ headers: { 'If-Match': '"14"' } }), expect.anything());
  });

  it.each([
    ['another phase', 'investigation'],
    ['no phase', undefined],
  ])('rejects a transition chosen from %s than the errand is in, before applying it', async (_seen, expectedActivePhaseId) => {
    const { controller, api } = makeController();
    stubErrand(api, { phaseId: 'received', version: 7 });

    await expect(
      controller.updateSupportErrandPhase(
        mockReq(),
        mockSupportErrandId,
        MUNICIPALITY_ID,
        { expectedActivePhaseId, transitionId: 'start-investigation' },
        mockRes(),
      ),
    ).rejects.toMatchObject({ status: 409, message: 'Support errand phase has changed since it was loaded' });
    expect(api.patch).not.toHaveBeenCalled();
  });
});
