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

/**
 * The sort order direction
 * @example "ASC"
 */
export enum Direction {
  ASC = "ASC",
  DESC = "DESC",
}

export interface Problem {
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  parameters?: Record<string, any>;
  status?: StatusType;
  detail?: string;
  title?: string;
}

export interface StatusType {
  /** @format int32 */
  statusCode?: number;
  reasonPhrase?: string;
}

/** Relation between objects */
export interface Relation {
  /** Unique id for the relation */
  id?: string;
  /**
   * Type of relation. Valid types can be fetch via /relation-types
   * @minLength 1
   */
  type: string;
  /**
   * Timestamp when relations was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when relations was last modified
   * @format date-time
   */
  modified?: string;
  /** Source identifiers */
  source: ResourceIdentifier;
  /** Target identifiers */
  target: ResourceIdentifier;
}

/** Resource identifier for source and target */
export interface ResourceIdentifier {
  /**
   * Unique id for the object
   * @minLength 1
   */
  resourceId: string;
  /**
   * Type of object
   * @minLength 1
   */
  type: string;
  /**
   * Name of service where object exists
   * @minLength 1
   */
  service: string;
  /** Namespace of object */
  namespace?: string;
}

export interface ConstraintViolationProblem {
  cause?: ThrowableProblem;
  stackTrace?: {
    classLoaderName?: string;
    moduleName?: string;
    moduleVersion?: string;
    methodName?: string;
    fileName?: string;
    /** @format int32 */
    lineNumber?: number;
    className?: string;
    nativeMethod?: boolean;
  }[];
  /** @format uri */
  type?: string;
  status?: StatusType;
  violations?: Violation[];
  title?: string;
  message?: string;
  /** @format uri */
  instance?: string;
  parameters?: Record<string, any>;
  detail?: string;
  suppressed?: {
    stackTrace?: {
      classLoaderName?: string;
      moduleName?: string;
      moduleVersion?: string;
      methodName?: string;
      fileName?: string;
      /** @format int32 */
      lineNumber?: number;
      className?: string;
      nativeMethod?: boolean;
    }[];
    message?: string;
    localizedMessage?: string;
  }[];
  localizedMessage?: string;
}

export interface ThrowableProblem {
  cause?: any;
  stackTrace?: {
    classLoaderName?: string;
    moduleName?: string;
    moduleVersion?: string;
    methodName?: string;
    fileName?: string;
    /** @format int32 */
    lineNumber?: number;
    className?: string;
    nativeMethod?: boolean;
  }[];
  message?: string;
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  parameters?: Record<string, any>;
  status?: StatusType;
  detail?: string;
  title?: string;
  suppressed?: {
    stackTrace?: {
      classLoaderName?: string;
      moduleName?: string;
      moduleVersion?: string;
      methodName?: string;
      fileName?: string;
      /** @format int32 */
      lineNumber?: number;
      className?: string;
      nativeMethod?: boolean;
    }[];
    message?: string;
    localizedMessage?: string;
  }[];
  localizedMessage?: string;
}

export interface Violation {
  field?: string;
  message?: string;
}

/** Type of relation */
export interface RelationType {
  /**
   * Name of type
   * @minLength 1
   */
  name: string;
  /** Display value */
  displayName?: string;
  /** Inverse value of type (if applicable) */
  counterName?: string;
  /** Display value */
  counterDisplayName?: string;
}

/** PagingAndSortingMetaData model */
export interface PagingAndSortingMetaData {
  /**
   * Current page
   * @format int32
   * @example 5
   */
  page?: number;
  /**
   * Displayed objects per page
   * @format int32
   * @example 20
   */
  limit?: number;
  /**
   * Displayed objects on current page
   * @format int32
   * @example 13
   */
  count?: number;
  /**
   * Total amount of hits based on provided search parameters
   * @format int64
   * @example 98
   */
  totalRecords?: number;
  /**
   * Total amount of pages based on provided search parameters
   * @format int32
   * @example 23
   */
  totalPages?: number;
  sortBy?: string[];
  /**
   * The sort order direction
   * @example "ASC"
   */
  sortDirection?: Direction;
}

/** Paged relation response */
export interface RelationPagedResponse {
  relations?: Relation[];
  /** PagingAndSortingMetaData model */
  _meta?: PagingAndSortingMetaData;
}
