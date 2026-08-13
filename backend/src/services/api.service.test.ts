import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import { AxiosAdapter, AxiosError } from 'axios';

import { User } from '@/interfaces/users.interface';

import ApiService from './api.service';
import ApiTokenService from './api-token.service';

const user: User = {
  id: 1,
  personId: 'person-id',
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  email: 'test.user@example.com',
  password: '',
  username: 'testuser',
  groups: [],
  permissions: {
    canEditCasedata: false,
    canEditSupportManagement: true,
    canViewAttestations: false,
    canEditAttestations: false,
  },
};

describe('ApiService', () => {
  afterEach(() => mock.restoreAll());

  it('retains upstream response headers for BFF endpoints that need concurrency metadata', async () => {
    mock.method(ApiTokenService.prototype, 'getToken', async () => 'test-token');
    const adapter: AxiosAdapter = async config => ({
      config,
      data: { saved: true },
      headers: { etag: '"4"' },
      status: 200,
      statusText: 'OK',
    });
    const service = new ApiService();

    const response = await service.get<{ saved: boolean }>(
      {
        adapter,
        includeResponseHeaders: true,
        // The token URL bypasses the OAuth interceptor; the adapter keeps this test entirely local.
        url: 'token',
      },
      user,
    );

    assert.deepEqual(response.data, { saved: true });
    assert.equal(response.headers?.etag, '"4"');
  });

  it('does not add upstream headers to existing controller response wrappers unless requested', async () => {
    mock.method(ApiTokenService.prototype, 'getToken', async () => 'test-token');
    const adapter: AxiosAdapter = async config => ({
      config,
      data: { saved: true },
      headers: { etag: '"4"' },
      status: 200,
      statusText: 'OK',
    });
    const service = new ApiService();

    const response = await service.get<{ saved: boolean }>({ adapter, url: 'token' }, user);

    assert.deepEqual(response, { data: { saved: true }, message: 'success' });
  });

  for (const status of [409, 412]) {
    it(`preserves upstream ${status} responses when the caller opts into client-error propagation`, async () => {
      mock.method(ApiTokenService.prototype, 'getToken', async () => 'test-token');
      const adapter: AxiosAdapter = async config => {
        throw new AxiosError('Upstream request failed', undefined, config, undefined, {
          config,
          data: { detail: 'Investigation version conflict' },
          headers: {},
          status,
          statusText: 'Conflict',
        });
      };
      const service = new ApiService();

      await assert.rejects(
        service.put<{ saved: boolean }, { value: string }>(
          {
            adapter,
            data: { value: 'new' },
            propagateClientError: true,
            url: 'token',
          },
          user,
        ),
        (error: unknown) =>
          error instanceof Error && 'status' in error && error.status === status && error.message === 'Investigation version conflict',
      );
    });
  }

  it('preserves an upstream client-error status when the response body is empty', async () => {
    mock.method(ApiTokenService.prototype, 'getToken', async () => 'test-token');
    const adapter: AxiosAdapter = async config => {
      throw new AxiosError('Upstream request failed', undefined, config, undefined, {
        config,
        data: undefined,
        headers: {},
        status: 400,
        statusText: 'Bad Request',
      });
    };
    const service = new ApiService();

    await assert.rejects(
      service.patch<{ saved: boolean }, { value: string }>(
        {
          adapter,
          data: { value: 'new' },
          propagateClientError: true,
          url: 'token',
        },
        user,
      ),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 400 && error.message === 'Request failed',
    );
  });

  it('preserves an empty upstream client error from a GET readback', async () => {
    mock.method(ApiTokenService.prototype, 'getToken', async () => 'test-token');
    const adapter: AxiosAdapter = async config => {
      throw new AxiosError('Upstream request failed', undefined, config, undefined, {
        config,
        data: undefined,
        headers: {},
        status: 403,
        statusText: 'Forbidden',
      });
    };
    const service = new ApiService();

    await assert.rejects(
      service.get<{ saved: boolean }>(
        {
          adapter,
          propagateClientError: true,
          url: 'token',
        },
        user,
      ),
      (error: unknown) => error instanceof Error && 'status' in error && error.status === 403 && error.message === 'Request failed',
    );
  });
});
