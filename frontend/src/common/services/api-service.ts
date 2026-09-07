'use client';

import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

export interface Data {
  error?: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  code?: string;
}

export interface ApiDeployment {
  readonly dragon: string;
  readonly revision: string;
  readonly deployment: string;
}

export const DEPLOYMENT_MISMATCH_CODE = 'DRAKEN_DEPLOYMENT_MISMATCH';
export const DEPLOYMENT_MISMATCH_MESSAGE =
  'Sidan och servern tillhör olika versioner eller drakar. Ladda om sidan. Om felet kvarstår, kontakta supporten.';

export class ApiDeploymentMismatchError extends Error {
  constructor() {
    super(DEPLOYMENT_MISMATCH_MESSAGE);
    this.name = 'ApiDeploymentMismatchError';
  }
}

let configuredDeployment: ApiDeployment | undefined;
let deploymentError: ApiDeploymentMismatchError | null = null;
const deploymentErrorListeners = new Set<() => void>();

/** The shell configures the client graph before any application requests run. */
export const configureApiDeployment = (deployment: ApiDeployment): void => {
  if (
    !/^[A-Z][A-Z0-9]*$/u.test(deployment.dragon) ||
    !(deployment.revision === 'development' || /^[a-f0-9]{40}$/u.test(deployment.revision)) ||
    !(deployment.deployment === 'development' || /^[a-f0-9]{64}$/u.test(deployment.deployment))
  ) {
    throw new Error('Invalid API deployment configuration');
  }
  if (
    configuredDeployment &&
    (configuredDeployment.dragon !== deployment.dragon ||
      configuredDeployment.revision !== deployment.revision ||
      configuredDeployment.deployment !== deployment.deployment)
  ) {
    throw new Error('The API deployment cannot change without reloading the application');
  }
  configuredDeployment = Object.freeze({ ...deployment });
};

export const getApiDeploymentError = (): ApiDeploymentMismatchError | null => deploymentError;

export const subscribeApiDeploymentError = (listener: () => void): (() => void) => {
  deploymentErrorListeners.add(listener);
  return () => deploymentErrorListeners.delete(listener);
};

export const handleError = (error: AxiosError<ApiResponse>) => {
  if (
    error.response?.status === 409 &&
    (error.response.data?.code === DEPLOYMENT_MISMATCH_CODE ||
      error.response.data?.message === DEPLOYMENT_MISMATCH_CODE)
  ) {
    if (!deploymentError) {
      deploymentError = new ApiDeploymentMismatchError();
      deploymentErrorListeners.forEach((listener) => listener());
    }
    throw deploymentError;
  }
  if (globalThis.window !== undefined) {
    if (error?.response?.status === 401 && !globalThis.window.location.pathname.includes('login')) {
      const basePath = process.env.NEXT_PUBLIC_BASEPATH || '';
      globalThis.window.location.href = `${globalThis.window.location.origin}${basePath}/login?path=${globalThis.window.location.pathname}&failMessage=${error.response.data.message}`;
    }
  }

  throw error;
};

const client = axios.create({ withCredentials: true, headers: { 'Content-Type': 'application/json' } });

client.interceptors.request.use((config) => {
  if (!configuredDeployment) throw new Error('The application shell has not configured the API deployment');
  if (deploymentError) throw deploymentError;
  // Axios has normalized casing and flattened method defaults before this interceptor runs.
  // The caller cannot override a deployment header, even with
  // another spelling or a false value that would otherwise disable transmission of that header.
  config.headers.set('X-Draken-Dragon', configuredDeployment.dragon, true);
  config.headers.set('X-Draken-Revision', configuredDeployment.revision, true);
  config.headers.set('X-Draken-Deployment', configuredDeployment.deployment, true);
  return config;
});

const get = <T>(url: string, customOptions: AxiosRequestConfig = {}) =>
  client.get<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, customOptions).catch(handleError);

const post = <T, U>(url: string, data: U, customOptions: AxiosRequestConfig = {}) => {
  return client.post<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, data, customOptions).catch(handleError);
};

const patch = <T, U>(url: string, data: U, customOptions: AxiosRequestConfig = {}) => {
  return client.patch<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, data, customOptions).catch(handleError);
};

const put = <T, U>(url: string, data: U, customOptions: AxiosRequestConfig = {}) => {
  return client.put<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, data, customOptions).catch(handleError);
};

const deleteRequest = <T>(url: string, customOptions: AxiosRequestConfig = {}) => {
  return client.delete<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, customOptions).catch(handleError);
};

export const apiService = { get, post, patch, put, deleteRequest };
