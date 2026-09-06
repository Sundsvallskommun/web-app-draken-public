import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import { logger } from '@utils/logger';
import { apiURL } from '@utils/util';
import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import axios, { AxiosError, AxiosHeaders, AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import ApiTokenService from './api-token.service';

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

// This transport handles protected documents as well as ordinary errands. Log only
// protocol metadata: bodies, headers, URLs and even error messages may carry personal
// data or credentials. The generated request id correlates failures with upstream logs.
const logAxiosResponseError = (error: AxiosError): void => {
  const config = error.config;
  const method = config?.method?.toUpperCase();
  const safeMethod = method && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(method) ? method : 'unknown';
  const requestId = config?.headers?.['X-Request-Id'];
  const safeRequestId = typeof requestId === 'string' && /^[a-f0-9-]{36}$/iu.test(requestId) ? requestId : 'unavailable';
  const status = typeof error.response?.status === 'number' ? error.response.status : 'no-response';
  logger.error(`API request failed: method=${safeMethod} status=${status} requestId=${safeRequestId}`);
};

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
        if (request.url === apiURL('token')) {
          return request;
        }
        const token = await apiTokenService.getToken();
        const defaultHeaders = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-Id': uuidv4(),
        };
        const isSimulatorRequest = request.url?.includes('simulatorserver');
        if (!isSimulatorRequest) {
          logger.info(`API request: requestId=${defaultHeaders['X-Request-Id']}`);
        }
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
        const token = await apiTokenService.getToken();
        const defaultHeaders = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-Id': uuidv4(),
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
          return axios.get(response.headers.location, { baseURL: response.config.baseURL, headers }).catch(e => {
            if (axios.isAxiosError(e)) logAxiosResponseError(e);
            else logger.error('API location request failed');
            return response;
          });
        }
        return response;
      },
      function (error) {
        return Promise.reject(error);
      },
    );
  }
  private async request<T>(config: ApiRequestConfig, user: User): Promise<ApiResponse<T>> {
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
      return includeResponseHeaders
        ? { data: res.data, message: 'success', headers: res.headers, status: res.status }
        : { data: res.data, message: 'success' };
    } catch (error: unknown) {
      if (!axios.isAxiosError(error)) {
        logger.error('API request failed before an upstream response could be handled');
        throw new HttpException(500, 'Internal server error');
      }

      logAxiosResponseError(error);
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
