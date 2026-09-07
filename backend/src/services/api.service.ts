import { performance } from 'node:perf_hooks';

import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import { apiURL } from '@utils/util';
import type { AxiosResponse, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
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
  }

  /** Follow a create response only after its own status and duration have been recorded. */
  private async followLocation<T>(response: AxiosResponse<T>): Promise<AxiosResponse<T>> {
    const diagnostics = currentRequestDiagnostics() ?? createRequestDiagnostics();
    const token = await apiTokenService.getToken();
    const defaultHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Request-Id': diagnostics.requestId,
    };
    // The upstream asset-drafts Location points to a route without GET support.
    if (response.headers.location && response.config.url?.includes('asset-drafts')) {
      response.headers.location = response.headers.location.replace('/asset-drafts/', '/assets/');
    }
    // Messaging's Location may carry the wrong API version. Preserve its original response.
    const followLocation = (response.config as ApiRequestConfig).followLocation !== false;
    if (!response.headers.location || !followLocation || response.config.url?.includes('messaging')) return response;

    const sentBy = response.config.headers?.['X-Sent-By'];
    const headers = sentBy === undefined ? defaultHeaders : { ...defaultHeaders, 'X-Sent-By': sentBy };
    const startedAt = performance.now();
    try {
      const followed = await axios.get<T>(response.headers.location, { baseURL: response.config.baseURL, headers });
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
      let upstreamResponse: AxiosResponse<T> | undefined;
      try {
        upstreamResponse = await this.instance<T>(preparedConfig);
        logUpstreamRequest(diagnostics, { method: config.method, startedAt, status: upstreamResponse.status });
        const res = await this.followLocation(upstreamResponse);
        return includeResponseHeaders
          ? { data: res.data, message: 'success', headers: res.headers, status: res.status }
          : { data: res.data, message: 'success' };
      } catch (error: unknown) {
        // Response handling can fail after a successful upstream call; do not relabel that call as failed.
        if (!upstreamResponse) {
          logUpstreamRequest(diagnostics, {
            method: config.method,
            startedAt,
            error,
            ...(axios.isAxiosError(error) ? { status: error.response?.status } : {}),
          });
        }
        if (!axios.isAxiosError(error)) {
          throw new HttpException(500, 'Internal server error');
        }

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
