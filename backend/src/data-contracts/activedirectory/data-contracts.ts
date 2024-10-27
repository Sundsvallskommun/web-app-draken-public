/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface OUChildren {
  name?: string | null;
  displayName?: string | null;
  schemaClassName?: string | null;
  /** @format uuid */
  guid?: string | null;
  ouPath?: string | null;
  description?: string | null;
  domain?: string | null;
  isLinked?: boolean;
  /** @format uuid */
  personId?: string | null;
}

export interface ProblemDetails {
  type?: string | null;
  title?: string | null;
  /** @format int32 */
  status?: number | null;
  detail?: string | null;
  instance?: string | null;
  [key: string]: any;
}

export enum SchemaFilter {
  OrganizationalUnit = 'organizationalUnit',
  Container = 'container',
  Group = 'group',
  User = 'user',
  Computer = 'computer',
  All = 'all',
}
