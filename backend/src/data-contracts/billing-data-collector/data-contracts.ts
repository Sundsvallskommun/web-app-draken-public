/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface Problem {
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  title?: string;
  detail?: string;
  /** @format int32 */
  status?: number;
}

/** Scheduled billing */
export interface ScheduledBilling {
  /** Unique id for scheduled billing */
  id?: string;
  /**
   * External id in source system
   * @minLength 0
   * @maxLength 64
   * @example "66c57446-72e7-4cc5-af7c-053919ce904b"
   */
  externalId: string;
  /**
   * Source system where billing data is collected
   * @example "CONTRACT"
   */
  source: ScheduledBillingSourceEnum;
  /**
   * @minItems 1
   * @uniqueItems true
   */
  billingDaysOfMonth: number[];
  /**
   * @minItems 1
   * @uniqueItems true
   */
  billingMonths: number[];
  /**
   * Timestamp when of last successful billing
   * @format date-time
   * @example "2000-10-31T01:30:00.000+02:00"
   */
  lastBilled?: string;
  /**
   * Date of next scheduled billing if still active
   * @format date
   * @example "2001-05-15"
   */
  nextScheduledBilling?: string;
  /**
   * If set to true, scheduled billing will not be triggered
   * @default false
   * @example false
   */
  paused?: boolean;
}

export interface ConstraintViolationProblem {
  /** @format uri */
  type?: string;
  /** @format int32 */
  status?: number;
  violations?: Violation[];
  title?: string;
  /** @format uri */
  instance?: string;
  detail?: string;
  causeAsProblem?: ThrowableProblem;
}

export interface ThrowableProblem {
  /** @format uri */
  type?: string;
  title?: string;
  /** @format int32 */
  status?: number;
  detail?: string;
  /** @format uri */
  instance?: string;
  causeAsProblem?: any;
}

export interface Violation {
  field?: string;
  message?: string;
}

export interface PageScheduledBilling {
  /** @format int32 */
  totalPages?: number;
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  size?: number;
  content?: ScheduledBilling[];
  /** @format int32 */
  number?: number;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  numberOfElements?: number;
  pageable?: PageableObject;
  sort?: SortObject;
  empty?: boolean;
}

export interface PageableObject {
  /** @format int64 */
  offset?: number;
  unpaged?: boolean;
  paged?: boolean;
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  pageSize?: number;
  sort?: SortObject;
}

export interface SortObject {
  empty?: boolean;
  sorted?: boolean;
  unsorted?: boolean;
}

/**
 * Source system where billing data is collected
 * @example "CONTRACT"
 */
export enum ScheduledBillingSourceEnum {
  CONTRACT = 'CONTRACT',
  OPENE = 'OPENE',
}

/**
 * Source system where data is collected
 * @example "CONTRACT"
 */
export enum GetScheduledBillingExternalIdParamsSourceEnum {
  CONTRACT = 'CONTRACT',
  OPENE = 'OPENE',
}

export enum GetScheduledBillingExternalIdParamsEnum {
  CONTRACT = 'CONTRACT',
  OPENE = 'OPENE',
}
