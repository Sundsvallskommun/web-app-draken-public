// Measure write handlers, exercised over a real HTTP request.
//
// The service tests call the class directly and the Playwright specs mock the BFF in the browser,
// so neither could see that routing-controllers turns an undefined handler result into
// NotFoundError unless @OnUndefined names the status. That error carries `httpCode` rather than
// `status` and no message, which the app's errorMiddleware renders as "500 Something went wrong"
// after the upstream write had already succeeded.

import request from 'supertest';

import { RequestWithUser } from '@/interfaces/auth.interface';

import { mockUser } from './helpers/http';

const { apiGet, apiPatch, apiPost } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('@/middlewares/auth.middleware', () => ({
  __esModule: true,
  default: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('@/services/api.service', () => ({
  default: class {
    get = apiGet;
    patch = apiPatch;
    post = apiPost;
    delete = vi.fn();
    put = vi.fn();
  },
}));

const registrationConfiguration = JSON.stringify([{ roleName: 'MANAGER', adGroups: ['ad-manager'], measureGroup: 'PREVENTIVE', decides: true }]);
const typeId = 'dd000000-0000-4000-8000-000000000100';
const metadata = {
  measureTypes: [{ id: typeId, name: 'EDUCATION', displayName: 'Utbildning', measureGroups: ['PREVENTIVE'] }],
  roles: [{ name: 'MANAGER', displayName: 'Enhetschef' }],
};
const errand = { id: 'errand-1', status: 'ONGOING', version: 2 };
const measure = {
  id: 'measure-1',
  measureTypeId: typeId,
  version: 3,
  goal: 'Mål',
  description: 'Beskrivning',
  addedByRole: 'MANAGER',
  addedByUser: 'testuser',
};

describe('measure write handlers (over HTTP)', () => {
  let server: import('express').Application;
  const measuresUrl = '/supporterrands/2281/errand-1/measures';

  beforeAll(async () => {
    process.env.SUPPORT_MEASURE_REGISTRATION = registrationConfiguration;
    const { default: express } = await import('express');
    const { useExpressServer } = await import('routing-controllers');
    const { default: errorMiddleware } = await import('@/middlewares/error.middleware');
    const { SupportMeasureController } = await import('@/controllers/supportmanagement/support-measure.controller');

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as RequestWithUser).user = mockUser({
        username: 'testuser',
        name: 'Test User',
        groups: ['ad-manager'],
        permissions: { canEditSupportManagement: true },
      });
      next();
    });
    server = useExpressServer(app, { controllers: [SupportMeasureController], validation: false, defaultErrorHandler: false });
    app.use(errorMiddleware);
  }, 60_000);

  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockImplementation(async (config: { url?: string }) => {
      if (config.url?.endsWith('/metadata')) return { data: metadata };
      if (config.url?.endsWith('/measures/measure-1')) return { data: measure };
      return { data: errand, headers: { etag: '"2"' } };
    });
    apiPatch.mockResolvedValue({ data: { ...measure, version: 4 } });
    apiPost.mockResolvedValue({ data: undefined });
  });

  it('answers 204 after a successful create', async () => {
    const response = await request(server)
      .post(measuresUrl)
      .send({ measureTypeId: typeId, addedByRole: 'MANAGER', goal: 'Mål', description: 'Beskrivning', executed: '2026-09-08T12:00:00+02:00' });
    expect(response.status).toBe(204);
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it('answers 204 after a successful update even though upstream returns the measure body', async () => {
    const response = await request(server).patch(`${measuresUrl}/measure-1`).set('If-Match', '"3"').send({ goal: 'Nytt mål' });
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(apiPatch).toHaveBeenCalledTimes(1);
  });

  it('still reports a stale version as 412 with its message', async () => {
    const response = await request(server).patch(`${measuresUrl}/measure-1`).set('If-Match', '"2"').send({ goal: 'x' });
    expect(response.status).toBe(412);
    expect(response.body.message).toContain('If-Match');
    expect(apiPatch).not.toHaveBeenCalled();
  });

  it('answers 204 after a decision and forwards only the decision fields', async () => {
    const response = await request(server)
      .patch(`${measuresUrl}/measure-1/decision`)
      .set('If-Match', '"3"')
      .send({ accept: 'REWORK', acceptMotivation: '  Genomför endast utbildningen.  ' });
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(apiPatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        data: { accept: 'REWORK', acceptMotivation: 'Genomför endast utbildningen.' },
        headers: { 'If-Match': '"3"' },
      }),
      expect.objectContaining({ username: 'testuser' }),
    );
  });

  it.each([
    { accept: 'REWORK' },
    { accept: 'FALSE', acceptMotivation: '  ' },
    { accept: 'TRUE', addedByUser: 'forged' },
    { accept: 'TRUE', goal: 'Changed proposal' },
    { accept: 'TRUE', addedByRole: 'MANAGER' },
  ])('rejects invalid decision bodies before contacting the API: %j', async body => {
    const response = await request(server).patch(`${measuresUrl}/measure-1/decision`).set('If-Match', '"3"').send(body);
    expect(response.status).toBe(400);
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiPatch).not.toHaveBeenCalled();
  });

  it('requires the measure ETag for a decision', async () => {
    const response = await request(server).patch(`${measuresUrl}/measure-1/decision`).send({ accept: 'TRUE' });
    expect(response.status).toBe(428);
    expect(apiPatch).not.toHaveBeenCalled();
  });

  it('cannot bypass the decision route through an ordinary edit', async () => {
    const response = await request(server).patch(`${measuresUrl}/measure-1`).set('If-Match', '"3"').send({ accept: 'TRUE' });
    expect(response.status).toBe(400);
    expect(apiPatch).not.toHaveBeenCalled();
  });
});
