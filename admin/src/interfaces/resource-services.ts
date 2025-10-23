import { RequestParams } from '@config/http-client';

export type ID = string | number;
export type GetOne<TResponse> = (id: ID, params?: RequestParams) => TResponse;
export type GetMany<TResponse> = (params?: RequestParams) => TResponse;
export type Create<TData, TResponse> = (data: TData, params?: RequestParams) => TResponse;
export type Update<TData, TResponse> = (id: ID, data: TData, params?: RequestParams) => TResponse;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Remove<T = any> = (id: ID, params?: RequestParams) => T;
