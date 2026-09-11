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

  it('rejects a request without a municipality id and makes no API call', async () => {
    const { controller, api } = makeController();
    const res = mockRes();

    await controller.updateSupportErrandPhase(mockReq(), mockSupportErrandId, '', { expectedVersion: 1, transitionId: 'next' }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toBe('Municipality id missing');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('applies the selected transition with If-Match and returns the fresh errand version', async () => {
    const { controller, api } = makeController();
    let errandRead = 0;
    api.get.mockImplementation(async (config: { url?: string }) => {
      if (config.url === metadataUrl) return { data: { phases }, message: 'success' };
      errandRead += 1;
      return errandRead === 1
        ? {
            data: { id: mockSupportErrandId, phases: [{ phaseId: 'received' }], status: 'ONGOING', version: 7 },
            message: 'success',
            headers: { etag: '"7"' },
          }
        : {
            data: { id: mockSupportErrandId, phases: [{ phaseId: 'closed' }], status: 'ONGOING', version: 8 },
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
    expect(res.body).toMatchObject({ phases: [{ phaseId: 'closed' }], version: 8 });
  });

  it('rejects a stale request before applying a transition', async () => {
    const { controller, api } = makeController();
    api.get.mockImplementation(async (config: { url?: string }) =>
      config.url === metadataUrl
        ? { data: { phases }, message: 'success' }
        : { data: { phases: [{ phaseId: 'received' }], status: 'ONGOING', version: 8 }, message: 'success' },
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
