import axios from 'axios';
import Router from 'next/router';

export interface Data {
  error?: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
}

const handleError = (error) => {
  let s = '';
  if (error?.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    s += `Server responded with ${error?.response?.status} ${error?.response?.data?.message}`;
  } else if (error?.request) {
    // The request was made but no response was received
    // `error?.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    s += `Server did not respond`;
  } else {
    // Something happened in setting up the request that triggered an Error
    s += `Unknown error: ${error?.message}`;
  }
  s += ` for url ${error?.config?.url}`;
  console.error(s);

  if (error?.response?.status === 401 && Router.pathname !== '/login') {
    // isRedirectingToLogin = true;
    Router.push('/login');
  }

  throw error;
};

const options = {
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
};

const get = <T>(url: string) => axios.get<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, options).catch(handleError);

const post = <T, U>(url: string, data: U, customOptions: { [key: string]: any } = {}) => {
  return axios
    .post<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, data, { ...options, ...customOptions })
    .catch(handleError);
};

const patch = <T, U>(url: string, data: U, customOptions: { [key: string]: any } = {}) => {
  return axios
    .patch<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, data, { ...options, ...customOptions })
    .catch(handleError);
};

const put = <T, U>(url: string, data: U, customOptions: { [key: string]: any } = {}) => {
  return axios
    .put<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, data, { ...options, ...customOptions })
    .catch(handleError);
};

const deleteRequest = <T>(url: string) => {
  return axios.delete<T>(`${process.env.NEXT_PUBLIC_API_URL}/${url}`, options).catch(handleError);
};

export const apiService = { get, post, patch, put, deleteRequest };
