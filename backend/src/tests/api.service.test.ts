import axios, { AxiosAdapter, AxiosError } from 'axios';

import ApiService from '@/services/api.service';
import ApiTokenService from '@/services/api-token.service';
import { logger } from '@/utils/logger';

import { mockUser } from './helpers/http';

const user = mockUser({ permissions: { canEditSupportManagement: true } } as never);

/** Every request below targets the token URL, which bypasses the OAuth interceptor, and supplies its
 *  own adapter, so no test here reaches the network. */
const TOKEN_URL = 'token';

const okAdapter =
  (data: unknown, headers: Record<string, string> = {}, status = 200): AxiosAdapter =>
  async config => ({ config, data, headers, status, statusText: status === 201 ? 'Created' : 'OK' });

const failingAdapter =
  (status: number, data: unknown, statusText: string): AxiosAdapter =>
  async config => {
    throw new AxiosError('Upstream request failed', undefined, config, undefined, { config, data, headers: {}, status, statusText });
  };

beforeEach(() => {
  vi.spyOn(ApiTokenService.prototype, 'getToken').mockResolvedValue('test-token');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ApiService', () => {
  it('keeps protected data and credentials out of transport logs on an upstream failure', async () => {
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const infoLog = vi.spyOn(logger, 'info').mockImplementation(() => logger);
    const secret = 'protected-investigation-content';
    await expect(
      new ApiService().put<unknown, { value: string }>(
        {
          adapter: failingAdapter(403, { detail: secret }, secret),
          baseURL: `https://api.test.local/${secret}`,
          url: `/documents?person=${secret}`,
          headers: { Authorization: `Bearer ${secret}`, Cookie: secret },
          data: { value: secret },
          propagateClientError: true,
        },
        user,
      ),
    ).rejects.toMatchObject({ status: 403 });

    const logs = JSON.stringify([...errorLog.mock.calls, ...infoLog.mock.calls]);
    expect(logs).not.toContain(secret);
    expect(logs).not.toContain(user.username);
    expect(logs).toContain('status=403');
    expect(logs).toContain('method=PUT');
    expect(logs).toMatch(/requestId=[a-f0-9-]{36}/u);
  });

  it('does not log network error messages that may contain request data', async () => {
    const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => logger);
    const secret = 'protected-network-error';
    await expect(
      new ApiService().get<unknown>(
        {
          url: TOKEN_URL,
          adapter: async config => {
            throw new AxiosError(secret, 'ECONNRESET', config);
          },
        },
        user,
      ),
    ).rejects.toMatchObject({ status: 500 });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(errorLog.mock.calls)).toContain('status=no-response');
  });

  it('retains upstream response headers for BFF endpoints that need concurrency metadata', async () => {
    const response = await new ApiService().get<{ saved: boolean }>(
      { adapter: okAdapter({ saved: true }, { etag: '"4"' }), includeResponseHeaders: true, url: TOKEN_URL },
      user,
    );

    expect(response.data).toEqual({ saved: true });
    expect(response.headers?.etag).toBe('"4"');
    expect(response.status).toBe(200);
  });

  it('can preserve a create response instead of following its Location header', async () => {
    const follow = vi.spyOn(axios, 'get');
    const response = await new ApiService().put<{ saved: boolean }, { value: string }>(
      {
        adapter: okAdapter({ saved: true }, { location: '/created-resource', etag: '"1"' }, 201),
        data: { value: 'new' },
        followLocation: false,
        includeResponseHeaders: true,
        url: TOKEN_URL,
      },
      user,
    );

    expect(follow).not.toHaveBeenCalled();
    expect(response).toMatchObject({ data: { saved: true }, status: 201 });
    expect(response.headers?.etag).toBe('"1"');
  });

  it('does not add upstream headers to existing controller response wrappers unless requested', async () => {
    const response = await new ApiService().get<{ saved: boolean }>({ adapter: okAdapter({ saved: true }, { etag: '"4"' }), url: TOKEN_URL }, user);

    expect(response).toEqual({ data: { saved: true }, message: 'success' });
  });

  for (const status of [409, 412]) {
    it(`preserves upstream ${status} responses when the caller opts into client-error propagation`, async () => {
      await expect(
        new ApiService().put<{ saved: boolean }, { value: string }>(
          {
            adapter: failingAdapter(status, { detail: 'Investigation version conflict' }, 'Conflict'),
            data: { value: 'new' },
            propagateClientError: true,
            url: TOKEN_URL,
          },
          user,
        ),
      ).rejects.toMatchObject({ status, message: 'Investigation version conflict' });
    });
  }

  it('preserves an upstream client-error status when the response body is empty', async () => {
    await expect(
      new ApiService().patch<{ saved: boolean }, { value: string }>(
        {
          adapter: failingAdapter(400, undefined, 'Bad Request'),
          data: { value: 'new' },
          propagateClientError: true,
          url: TOKEN_URL,
        },
        user,
      ),
    ).rejects.toMatchObject({ status: 400, message: 'Request failed' });
  });

  it('preserves an empty upstream client error from a GET readback', async () => {
    await expect(
      new ApiService().get<{ saved: boolean }>(
        { adapter: failingAdapter(403, undefined, 'Forbidden'), propagateClientError: true, url: TOKEN_URL },
        user,
      ),
    ).rejects.toMatchObject({ status: 403, message: 'Request failed' });
  });
});
