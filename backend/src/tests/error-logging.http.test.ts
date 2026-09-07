import axios, { AxiosError } from 'axios';
import express from 'express';
import request from 'supertest';

import { HttpException } from '@/exceptions/HttpException';
import errorMiddleware from '@/middlewares/error.middleware';
import requestDiagnosticsMiddleware from '@/middlewares/request-diagnostics.middleware';
import ApiService from '@/services/api.service';
import ApiTokenService from '@/services/api-token.service';
import { logApplicationFailure } from '@/services/request-diagnostics';
import { logger } from '@/utils/logger';

import { mockUser } from './helpers/http';

const records = (): unknown[] =>
  [...vi.mocked(logger.error).mock.calls, ...vi.mocked(logger.info).mock.calls].map(([message]): unknown => JSON.parse(String(message)));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(logger, 'error').mockReturnValue(logger);
  vi.spyOn(logger, 'info').mockReturnValue(logger);
  vi.spyOn(ApiTokenService.prototype, 'getToken').mockResolvedValue('private-oauth-token');
});

afterEach(() => vi.restoreAllMocks());

it('returns the error response without writing case data or validation values to logs', async () => {
  const app = express();
  app.use(requestDiagnosticsMiddleware);
  app.use(express.json());
  app.post('/errands/:id', (_req, _res, next) => {
    const error = new HttpException(400, 'Invalid private case description');
    error.errors = [{ property: 'private-property', constraints: { invalid: 'private-validation-value' } }];
    next(error);
  });
  app.use(errorMiddleware);

  const response = await request(app)
    .post('/errands/private-person-id?search=private-search')
    .set('Authorization', 'Bearer private-token')
    .send({ description: 'private-body' });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({ message: 'Invalid private case description' });
  expect(records()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        event: 'http.request.failed',
        requestId: response.headers['x-request-id'],
        route: '/errands/:id',
        method: 'POST',
        status: 400,
        durationMs: expect.any(Number),
        errorKind: 'http',
        errorCode: 'HTTP_ERROR',
      }),
      expect.objectContaining({ event: 'http.request.completed', route: '/errands/:id', status: 400 }),
    ]),
  );
  expect(JSON.stringify(records())).not.toContain('private');
});

it('uses a fixed route marker when no handler matched, including JSON parser errors', async () => {
  const app = express();
  app.use(requestDiagnosticsMiddleware, express.json());
  app.use(errorMiddleware);

  await request(app).get('/private-person-id?query=private-search');
  await request(app).post('/private-person-id').set('Content-Type', 'application/json').send('{"private-body":');

  expect(records()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ event: 'http.request.completed', route: '<unmatched>', status: 404 }),
      expect.objectContaining({ event: 'http.request.failed', route: '<unmatched>', status: 400, errorCode: 'SYNTAX_ERROR' }),
    ]),
  );
  expect(JSON.stringify(records())).not.toContain('private');
});

it.each([
  { error: new TypeError('private-type-error'), errorKind: 'programming', errorCode: 'TYPE_ERROR' },
  { error: new Error('private-unknown-error'), errorKind: 'internal', errorCode: 'UNEXPECTED_ERROR' },
  { error: new AxiosError('private-network-error', 'private-code'), errorKind: 'upstream_network', errorCode: 'UPSTREAM_REQUEST_ERROR' },
])('reports the safe error code $errorCode for an unexpected failure', async ({ error, errorKind, errorCode }) => {
  error.name = 'private-error-name';
  error.stack = 'private-error-stack';
  const app = express();
  app.use(requestDiagnosticsMiddleware);
  app.patch('/errands/:id', (_req, _res, next) => next(error));
  app.use(errorMiddleware);

  const response = await request(app).patch('/errands/private-person-id');
  expect(response.status).toBe(500);
  expect(records()).toEqual(expect.arrayContaining([expect.objectContaining({ event: 'http.request.failed', status: 500, errorKind, errorCode })]));
  expect(JSON.stringify(records())).not.toContain('private');
});

it('keeps correlation ids isolated across concurrent HTTP calls and overrides untrusted outgoing ids', async () => {
  const app = express();
  const upstreamIds = new Map<string, unknown>();
  const untrustedId = '55555555-5555-4555-8555-555555555555';
  app.use(requestDiagnosticsMiddleware);
  app.get('/errands/:id', (req, res, next) => {
    void new ApiService()
      .get<{ saved: boolean }>(
        {
          url: `/private-upstream/${req.params.id}?private-query`,
          headers: { 'x-request-id': 'private-forged-id' },
          adapter: async config => {
            await new Promise(resolve => setTimeout(resolve, req.params.id === 'first' ? 10 : 0));
            upstreamIds.set(req.params.id, config.headers.get('X-Request-Id'));
            return { config, data: { saved: true }, headers: {}, status: 200, statusText: 'private-status' };
          },
        },
        mockUser(),
      )
      .then(result => res.json(result.data), next);
  });
  app.use(errorMiddleware);

  const responses = await Promise.all([
    request(app).get('/errands/first').set('X-Request-Id', untrustedId),
    request(app).get('/errands/second').set('X-Request-Id', 'private-header'),
  ]);

  for (const [index, id] of ['first', 'second'].entries()) {
    const response = responses[index];
    const requestId: unknown = response.headers['x-request-id'];
    expect(requestId).toMatch(/^[a-f0-9-]{36}$/u);
    expect(upstreamIds.get(id)).toBe(requestId);
    expect(records()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'http.request.completed', requestId, route: '/errands/:id', status: 200 }),
        expect.objectContaining({ event: 'upstream.request.completed', requestId, route: '/errands/:id', status: 200 }),
      ]),
    );
  }
  expect(responses[0].headers['x-request-id']).not.toBe(responses[1].headers['x-request-id']);
  expect(JSON.stringify(records())).not.toContain(untrustedId);
  expect(JSON.stringify(records())).not.toContain('private');
});

it('correlates a failed upstream request with its HTTP response without logging error text, headers or body', async () => {
  const app = express();
  let upstreamId: unknown;
  app.use(requestDiagnosticsMiddleware);
  app.post('/errands/:id/documents', (_req, res, next) => {
    void new ApiService()
      .put<unknown, { description: string }>(
        {
          url: '/private-document-id?private-query',
          data: { description: 'private-description' },
          headers: { Cookie: 'private-cookie', Authorization: 'private-token', 'X-Request-Id': 'private-id' },
          propagateClientError: true,
          adapter: async config => {
            upstreamId = config.headers.get('X-Request-Id');
            const error = new AxiosError('private-error-message', 'private-error-code', config, undefined, {
              config,
              data: { detail: 'private-upstream-response' },
              headers: { 'private-header': 'private-header-value' },
              status: 403,
              statusText: 'private-status',
            });
            error.name = 'private-error-name';
            error.stack = 'private-stack';
            logApplicationFailure('Saving investigation document', error);
            throw error;
          },
        },
        mockUser(),
      )
      .then(result => res.json(result.data), next);
  });
  app.use(errorMiddleware);

  const response = await request(app).post('/errands/private-person-id/documents').send({ private: 'private-body' });
  expect(response.status).toBe(403);
  expect(response.body).toEqual({ message: 'private-upstream-response' });
  expect(upstreamId).toBe(response.headers['x-request-id']);
  expect(records()).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ event: 'upstream.request.failed', requestId: upstreamId, status: 403, errorCode: 'UPSTREAM_HTTP_ERROR' }),
      expect.objectContaining({ event: 'application.failure', requestId: upstreamId, errorCode: 'UPSTREAM_HTTP_ERROR' }),
      expect.objectContaining({ event: 'http.request.failed', requestId: upstreamId, route: '/errands/:id/documents', status: 403 }),
    ]),
  );
  expect(JSON.stringify(records())).not.toContain('private');
});

it('reuses the generated id when following an upstream Location response', async () => {
  const app = express();
  const followed = vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: { saved: true } });
  app.use(requestDiagnosticsMiddleware);
  app.get('/documents/:id', (_req, res, next) => {
    void new ApiService()
      .post<unknown, undefined>(
        {
          url: '/private-document',
          adapter: async config => ({ config, data: {}, headers: { location: '/private-location' }, status: 201, statusText: 'Created' }),
        },
        mockUser(),
      )
      .then(result => res.json(result.data), next);
  });
  app.use(errorMiddleware);

  const response = await request(app).get('/documents/private-id');
  expect(followed).toHaveBeenCalledWith(
    '/private-location',
    expect.objectContaining({ headers: expect.objectContaining({ 'X-Request-Id': response.headers['x-request-id'] }) }),
  );
  expect(JSON.stringify(records())).not.toContain('private');
});
