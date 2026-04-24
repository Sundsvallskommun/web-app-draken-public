import axios, { AxiosError } from 'axios';


export interface Data {
  error?: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
}

export const handleError = (error: AxiosError<ApiResponse>) => {
  if (globalThis.window !== undefined) {
    if (error?.response?.status === 401 && !globalThis.window.location.pathname.includes('login')) {
      const basePath = import.meta.env.VITE_BASEPATH || '';
      globalThis.window.location.href = `${globalThis.window.location.origin}${basePath}/login?path=${globalThis.window.location.pathname}&failMessage=${error.response.data.message}`;
    }
  }

  throw error;
};

const options = {
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
};

const get = <T>(url: string) => axios.get<T>(`${import.meta.env.VITE_API_URL}/${url}`, options).catch(handleError);

const post = <T, U>(url: string, data: U, customOptions: { [key: string]: any } = {}) => {
  return axios
    .post<T>(`${import.meta.env.VITE_API_URL}/${url}`, data, { ...options, ...customOptions })
    .catch(handleError);
};

const patch = <T, U>(url: string, data: U, customOptions: { [key: string]: any } = {}) => {
  return axios
    .patch<T>(`${import.meta.env.VITE_API_URL}/${url}`, data, { ...options, ...customOptions })
    .catch(handleError);
};

const put = <T, U>(url: string, data: U, customOptions: { [key: string]: any } = {}) => {
  return axios
    .put<T>(`${import.meta.env.VITE_API_URL}/${url}`, data, { ...options, ...customOptions })
    .catch(handleError);
};

const deleteRequest = <T>(url: string) => {
  return axios.delete<T>(`${import.meta.env.VITE_API_URL}/${url}`, options).catch(handleError);
};

export const apiService = { get, post, patch, put, deleteRequest };
