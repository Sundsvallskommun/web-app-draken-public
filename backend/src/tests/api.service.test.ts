import { AxiosAdapter, AxiosError } from 'axios';

import ApiService from '@/services/api.service';
import ApiTokenService from '@/services/api-token.service';

import { mockUser } from './helpers/http';

const user = mockUser({ permissions: { canEditSupportManagement: true } } as never);

/** Every request below targets the token URL, which bypasses the OAuth interceptor, and supplies its
 *  own adapter, so no test here reaches the network. */
const TOKEN_URL = 'token';

const okAdapter =
  (data: unknown, headers: Record<string, string> = {}): AxiosAdapter =>
  async config => ({ config, data, headers, status: 200, statusText: 'OK' });

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
  it('retains upstream response headers for BFF endpoints that need concurrency metadata', async () => {
    const response = await new ApiService().get<{ saved: boolean }>(
      { adapter: okAdapter({ saved: true }, { etag: '"4"' }), includeResponseHeaders: true, url: TOKEN_URL },
      user,
    );

    expect(response.data).toEqual({ saved: true });
    expect(response.headers?.etag).toBe('"4"');
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
