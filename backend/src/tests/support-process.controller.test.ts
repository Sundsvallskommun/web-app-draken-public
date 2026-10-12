import { SupportProcessController } from '@/controllers/supportmanagement/support-process.controller';

import { mockReq, mockRes } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId, mockSupportNamespace } from './helpers/mock-data';

const processesUrl = `${mockMunicipalityId}/${mockSupportNamespace}/errands/${mockSupportErrandId}/processes`;

const process = {
  processInstanceId: 'process-1',
  processStatus: 'WAITING',
  currentActivityId: 'review_phase',
  awaitingSignals: [{ name: 'review_completed' }],
};

const makeController = (overview: object | undefined) => {
  const controller = new SupportProcessController();
  const api = {
    get: vi.fn(async (_config: { url?: string }) => ({ data: overview, message: 'success' })),
    post: vi.fn(async (_config: { url?: string }) => ({ data: undefined, message: 'success' })),
  };
  Object.assign(controller as object, { apiService: api });
  return { controller, api };
};

describe('fetchProcessState', () => {
  it('answers with what Support Management says about the processes of the errand', async () => {
    const overview = { processes: [process], startable: { status: 'LIVE_INSTANCE' } };
    const { controller, api } = makeController(overview);
    const res = mockRes();

    await controller.fetchProcessState(mockReq(), mockSupportErrandId, mockMunicipalityId, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(overview);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.mock.calls[0][0]).toMatchObject({ url: expect.stringContaining(processesUrl) });
  });

  it('reads the processes of the errand rather than the errand, which costs a personal number lookup', async () => {
    const { controller, api } = makeController({ processes: [process] });

    await controller.fetchProcessState(mockReq(), mockSupportErrandId, mockMunicipalityId, mockRes() as never);

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get.mock.calls[0][0].url).not.toMatch(/errands\/[^/]+$/);
  });

  it('rejects a municipality id other than the configured one and reads nothing', async () => {
    const { controller, api } = makeController({ processes: [process] });
    const res = mockRes();

    await controller.fetchProcessState(mockReq(), mockSupportErrandId, '9999', res as never);

    expect(res.statusCode).toBe(400);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('answers with nothing in particular for an errand that runs no process', async () => {
    const { controller } = makeController(undefined);
    const res = mockRes();

    await controller.fetchProcessState(mockReq(), mockSupportErrandId, mockMunicipalityId, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({});
  });
});

describe('sendProcessSignal', () => {
  it('leaves it to Support Management to judge the signal, and only looks up the instance', async () => {
    const { controller, api } = makeController({ processes: [process] });
    const res = mockRes();

    await controller.sendProcessSignal(mockReq(), mockSupportErrandId, mockMunicipalityId, { signal: 'something_else_entirely' }, res);

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post.mock.calls[0][0]).toMatchObject({
      url: expect.stringContaining(`${processesUrl}/process-1/signals`),
      data: { signal: 'something_else_entirely' },
    });
  });

  it('refuses when the errand has no process to step', async () => {
    const { controller, api } = makeController({ processes: [] });

    await expect(
      controller.sendProcessSignal(mockReq(), mockSupportErrandId, mockMunicipalityId, { signal: 'review_completed' }, mockRes()),
    ).rejects.toThrow();

    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('startProcess', () => {
  it('asks Support Management to start the process the labels point at', async () => {
    const { controller, api } = makeController({ processes: [], startable: { status: 'AVAILABLE', processKeys: ['internal-inspection'] } });
    const res = mockRes();

    await controller.startProcess(mockReq(), mockSupportErrandId, mockMunicipalityId, { processKey: 'internal-inspection' }, res);

    expect(res.statusCode).toBe(202);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post.mock.calls[0][0]).toMatchObject({
      url: expect.stringContaining(`${processesUrl}/start`),
      data: { processKey: 'internal-inspection' },
      propagateClientError: true,
    });
  });

  it('sends no key when none is given, since Support Management picks the only eligible one itself', async () => {
    const { controller, api } = makeController({ processes: [] });

    await controller.startProcess(mockReq(), mockSupportErrandId, mockMunicipalityId, {}, mockRes());

    expect(api.post.mock.calls[0][0]).toMatchObject({ data: {} });
  });

  it('rejects a municipality id other than the configured one and starts nothing', async () => {
    const { controller, api } = makeController({ processes: [] });
    const res = mockRes();

    await controller.startProcess(mockReq(), mockSupportErrandId, '9999', {}, res);

    expect(res.statusCode).toBe(400);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('passes on the refusal of Support Management rather than claiming a start', async () => {
    const { controller, api } = makeController({ processes: [] });
    api.post.mockRejectedValueOnce(new Error('409'));

    await expect(controller.startProcess(mockReq(), mockSupportErrandId, mockMunicipalityId, {}, mockRes())).rejects.toThrow('409');
  });
});
