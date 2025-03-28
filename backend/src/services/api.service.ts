import { v4 as uuidv4 } from 'uuid';
import { HttpException } from '@exceptions/HttpException';
import { User } from '@interfaces/users.interface';
import { apiURL } from '@utils/util';
import { logger } from '@utils/logger';
import axios, { AxiosError, AxiosInstance, AxiosInterceptorManager, AxiosRequestConfig, AxiosRequestHeaders } from 'axios';
import ApiTokenService from './api-token.service';

export class ApiResponse<T> {
  data: T;
  message: string;
}

const apiTokenService = new ApiTokenService();

class ApiService {
  private instance: AxiosInstance;
  constructor() {
    this.instance = axios.create();
    this.instance.interceptors.request.use(
      async function (request) {
        if (request.url === apiURL('token')) {
          return Promise.resolve(request);
        }
        const token = await apiTokenService.getToken();
        const defaultHeaders = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-Id': uuidv4(),
        };
        logger.info(`x-request-id: ${defaultHeaders['X-Request-Id']}`);
        request.headers = { ...defaultHeaders, ...request.headers } as any;
        request.headers['Content-Type'] = request.headers['Content-Type'] || defaultHeaders['Content-Type'];
        return Promise.resolve(request);
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
        if (response.headers.location && !response.config.url.includes('messaging')) {
          logger.info(`Response contained location header: ${response.headers.location}`);
          logger.info(`Base URL was: ${response.config.baseURL}`);
          return axios.get(response.headers.location, { baseURL: response.config.baseURL, headers: defaultHeaders }).catch(e => {
            logger.error(`Error in location header request: ${e.details}`);
            logger.error(`Base URL was: ${e.config?.baseURL}`);
            logger.error(`URL was: ${e.config?.url}`);
            logger.error(`Method was: ${e.config?.method}`);
            return Promise.resolve(response);
          });
        }
        return Promise.resolve(response);
      },
      function (error) {
        return Promise.reject(error);
      },
    );
  }
  private async request<T>(config: AxiosRequestConfig, user: User): Promise<ApiResponse<T>> {
    const defaultParams = {};
    const preparedConfig: AxiosRequestConfig = {
      ...config,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      headers: { ...config.headers, sentbyuser: user.username },
      params: { ...defaultParams, ...config.params },
      url: config.baseURL ? config.url : apiURL(config.url),
    };
    try {
      const res = await this.instance(preparedConfig);
      return { data: res.data, message: 'success' };
    } catch (error: unknown | AxiosError) {
      if (axios.isAxiosError(error) && (error as AxiosError).response?.status === 404) {
        logger.error(`ERROR: API request failed with status: ${error.response?.status}`);
        logger.error(`Error details: ${JSON.stringify(error.response.data)}`);
        logger.error(`Error url: ${error.response.config.baseURL || ''}/${error.response.config.url}`);
        logger.error(`Error data: ${error.response.config.data?.slice(0, 1500)}`);
        logger.error(`Error method: ${error.response.config.method}`);
        logger.error(`Error headers: ${error.response.config.headers}`);
        throw new HttpException(404, 'Not found');
      } else if (axios.isAxiosError(error) && (error as AxiosError).response?.data) {
        logger.error(`ERROR: API request failed with status: ${error.response?.status}`);
        logger.error(`Error details: ${JSON.stringify(error.response.data)}`);
        logger.error(`Error url: ${error.response.config.baseURL || ''}/${error.response.config.url}`);
        logger.error(`Error data: ${error.response.config.data?.slice(0, 1500)}`);
        logger.error(`Error method: ${error.response.config.method}`);
        logger.error(`Error headers: ${error.response.config.headers}`);
      } else {
        logger.error(`Unknown error: ${error}`);
      }
      throw new HttpException(500, 'Internal server error');
    }
  }

  public async get<T>(config: AxiosRequestConfig, user: User): Promise<ApiResponse<T>> {
    logger.info(`MAKING GET REQUEST TO URL ${config.baseURL || ''}/${config.url}`);
    return this.request<T>({ ...config, method: 'GET' }, user);
  }

  public async post<T, D>(config: AxiosRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    logger.info(`MAKING POST REQUEST TO URL ${config.baseURL || ''}/${config.url}`);
    return this.request<T>({ ...config, method: 'POST' }, user);
  }

  public async patch<T, D>(config: AxiosRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    logger.info(`MAKING PATCH REQUEST TO URL ${config.baseURL || ''}/${config.url}`);
    return this.request<T>({ ...config, method: 'PATCH' }, user);
  }

  public async put<T, D>(config: AxiosRequestConfig<D>, user: User): Promise<ApiResponse<T>> {
    logger.info(`MAKING PUT REQUEST TO URL ${config.baseURL || ''}/${config.url}`);
    return this.request<T>({ ...config, method: 'PUT' }, user);
  }

  public async delete<T>(config: AxiosRequestConfig, user: User): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE' }, user);
  }
}
export default ApiService;
