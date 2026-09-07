import { performance } from 'node:perf_hooks';

import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import { apiURL } from '@utils/util';
import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import axios, { AxiosHeaders, AxiosInstance, AxiosRequestConfig } from 'axios';

import ApiTokenService from './api-token.service';
import { createRequestDiagnostics, currentRequestDiagnostics, logUpstreamRequest, withRequestDiagnostics } from './request-diagnostics';

export class ApiResponse<T> {
  data!: T;
  message!: string;
  headers?: AxiosResponseHeaders | RawAxiosResponseHeaders;
  status?: number;
}

// Extends AxiosRequestConfig with an opt-in flag. When `propagateClientError` is true, upstream
// 4xx responses are re-thrown with their original status and message instead of a generic 500.
export type ApiRequestConfig<D = unknown> = AxiosRequestConfig<D> & {
  followLocation?: boolean;
  includeResponseHeaders?: boolean;
  propagateClientError?: boolean;
};

const apiTokenService = new ApiTokenService();

const readUpstreamErrorMessage = (data: unknown): string => {
  if (typeof data === 'string') return data.trim() ? data : 'Request failed';
  if (typeof data !== 'object' || data === null) return 'Request failed';

  const errorBody = data as { readonly detail?: unknown; readonly message?: unknown; readonly title?: unknown };
  for (const candidate of [errorBody.detail, errorBody.message, errorBody.title]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return 'Request failed';
};

class ApiService {
  private instance: AxiosInstance;
  constructor() {
    this.instance = axios.create();
    this.instance.interceptors.request.use(
      async function (request) {
        request.headers.set('X-Request-Id', currentRequestDiagnostics()?.requestId ?? createRequestDiagnostics().requestId, true);
        if (request.url === apiURL('token')) {
          return request;
        }
        const token = await apiTokenService.getToken();
        const defaultHeaders = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        request.headers = AxiosHeaders.concat(defaultHeaders, request.headers);
        request.headers['Content-Type'] = request.headers['Content-Type'] || defaultHeaders['Content-Type'];
        return request;
      },
      function (error) {
        return Promise.reject(error);
      },
    );

    this.instance.interceptors.response.use(
      async function (response) {
        // TODO This is an ugly workaround for the fact that setting correct API version
        // in the location header is difficult for some APIs, such as Messaging
        // So, for Messaging specifically, we - for now - ignore the location header
        const diagnostics = currentRequestDiagnostics() ?? createRequestDiagnostics();
        const token = await apiTokenService.getToken();
        const defaultHeaders = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-Id': diagnostics.requestId,
        };
        // Rewerite location header to point to correct resource since the API response header
        // contains an errouneous url - asset-drafts does not have an GET ../{id} endpoint.
        // When this has been fixed, we can remove the rewrite.
        if (response.headers.location && response.config.url?.includes('asset-drafts')) {
          response.headers.location = response.headers.location.replace('/asset-drafts/', '/assets/');
        }
        const followLocation = (response.config as ApiRequestConfig).followLocation !== false;
        if (response.headers.location && followLocation && !response.config.url?.includes('messaging')) {
          const sentBy = response.config.headers?.['X-Sent-By'];
          const headers = sentBy === undefined ? defaultHeaders : { ...defaultHeaders, 'X-Sent-By': sentBy };
          const startedAt = performance.now();
          try {
            const followed = await axios.get(response.headers.location, { baseURL: response.config.baseURL, headers });
            logUpstreamRequest(diagnostics, { method: 'GET', startedAt, status: followed.status });
            return followed;
          } catch (error) {
            logUpstreamRequest(diagnostics, {
              method: 'GET',
              startedAt,
              error,
              ...(axios.isAxiosError(error) ? { status: error.response?.status } : {}),
            });
            return response;
          }
        }
        return response;
      },
      function (error) {
        return Promise.reject(error);
      },
    );
  }
  private async request<T>(config: ApiRequestConfig, user: User): Promise<ApiResponse<T>> {
    const diagnostics = currentRequestDiagnostics() ?? createRequestDiagnostics();
    return withRequestDiagnostics(diagnostics, async () => {
      const startedAt = performance.now();
      const { includeResponseHeaders, propagateClientError, ...axiosConfig } = config;
      const defaultParams = {};
      const preparedConfig: AxiosRequestConfig = {
        ...axiosConfig,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: { ...axiosConfig.headers, 'X-Sent-By': [`type=adAccount; ${user.username}`] },
        params: { ...defaultParams, ...axiosConfig.params },
        url: axiosConfig.baseURL ? axiosConfig.url : apiURL(axiosConfig.url!),
      };
      try {
        const res = await this.instance(preparedConfig);
        logUpstreamRequest(diagnostics, { method: config.method, startedAt, status: res.status });
        return includeResponseHeaders
          ? { data: res.data, message: 'success', headers: res.headers, status: res.status }
          : { data: res.data, message: 'success' };
      } catch (error: unknown) {
        if (!axios.isAxiosError(error)) {
          logUpstreamRequest(diagnostics, { method: config.method, startedAt, error });
          throw new HttpException(500, 'Internal server error');
        }

        logUpstreamRequest(diagnostics, {
          method: config.method,
          startedAt,
          error,
          status: error.response?.status,
        });
        const { response } = error;
        if (response?.status === 404) {
          throw new HttpException(404, 'Not found');
        }

        // Opt-in: surface upstream client errors (4xx) so callers can show the real message in
        // context instead of an opaque 500. Server/network errors still become 500 below.
        const status = response?.status;
        if (propagateClientError && status !== undefined && status >= 400 && status < 500) {
          throw new HttpException(status, readUpstreamErrorMessage(response?.data));
        }
        throw new HttpException(500, 'Internal server error');
      }
    });
  }

  public async get<T>(config: ApiRequestConfig, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'GET' }, user);
  }

  public async post<T, D>(config: ApiRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'POST' }, user);
  }

  public async patch<T, D>(config: ApiRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH' }, user);
  }

  public async put<T, D>(config: ApiRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT' }, user);
  }

  public async delete<T>(config: ApiRequestConfig, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE' }, user);
  }
}
export default ApiService;
