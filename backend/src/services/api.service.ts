import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import { logger } from '@utils/logger';
import { apiURL } from '@utils/util';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import ApiTokenService from './api-token.service';

export class ApiResponse<T> {
  data!: T;
  message!: string;
}

// Extends AxiosRequestConfig with an opt-in flag. When `propagateClientError` is true, upstream
// 4xx responses are re-thrown with their original status and message instead of a generic 500.
export type ApiRequestConfig<D = any> = AxiosRequestConfig<D> & { propagateClientError?: boolean };

const apiTokenService = new ApiTokenService();

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
          const fullUrl = `${request.baseURL || ''}/${request.url}`;
          logger.info(`MAKING ${request.method?.toUpperCase()} REQUEST TO URL ${fullUrl}`);
          logger.info(`x-request-id: ${defaultHeaders['X-Request-Id']}`);
        }
        request.headers = { ...defaultHeaders, ...request.headers } as any;
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
        if (response.headers.location && !response.config.url?.includes('messaging')) {
          logger.info(`Response contained location header: ${response.headers.location}`);
          logger.info(`Base URL was: ${response.config.baseURL}`);
          return axios.get(response.headers.location, { baseURL: response.config.baseURL, headers: defaultHeaders }).catch(e => {
            logger.error(`Error in location header request: ${e.details}`);
            logger.error(`Base URL was: ${e.config?.baseURL}`);
            logger.error(`URL was: ${e.config?.url}`);
            logger.error(`Method was: ${e.config?.method}`);
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
    const { propagateClientError, ...axiosConfig } = config;
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
      return { data: res.data, message: 'success' };
    } catch (error: unknown | AxiosError) {
      if (axios.isAxiosError(error) && (error as AxiosError).response?.status === 404) {
        logger.error(`ERROR: API request failed with status: ${error.response?.status}`);
        logger.error(`Error details: ${JSON.stringify(error.response!.data)}`);
        logger.error(`Error url: ${error.response!.config.baseURL || ''}/${error.response!.config.url}`);
        logger.error(`Error data: ${error.response!.config.data?.slice(0, 1500)}`);
        logger.error(`Error method: ${error.response!.config.method}`);
        logger.error(`Error headers: ${error.response!.config.headers}`);
        throw new HttpException(404, 'Not found');
      } else if (axios.isAxiosError(error) && (error as AxiosError).response?.data) {
        logger.error(`ERROR: API request failed with status: ${error.response?.status}`);
        logger.error(`Error details: ${JSON.stringify(error.response!.data)}`);
        logger.error(`Error url: ${error.response!.config.baseURL || ''}/${error.response!.config.url}`);
        logger.error(`Error data: ${error.response!.config.data?.slice(0, 1500)}`);
        logger.error(`Error method: ${error.response!.config.method}`);
        logger.error(`Error headers: ${error.response!.config.headers}`);
        // Opt-in: surface upstream client errors (4xx) so callers can show the real message in
        // context instead of an opaque 500. Server/network errors still become 500 below.
        const status = error.response!.status;
        if (propagateClientError && status >= 400 && status < 500) {
          const data = error.response!.data as { detail?: string; message?: string; title?: string };
          const message = (typeof data === 'object' && (data.detail || data.message || data.title)) || 'Request failed';
          throw new HttpException(status, message);
        }
      } else {
        logger.error(`Unknown error: ${error}`);
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

  public async patch<T, D>(config: AxiosRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH' }, user);
  }

  public async put<T, D>(config: AxiosRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT' }, user);
  }

  public async delete<T>(config: AxiosRequestConfig, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE' }, user);
  }
}
export default ApiService;
