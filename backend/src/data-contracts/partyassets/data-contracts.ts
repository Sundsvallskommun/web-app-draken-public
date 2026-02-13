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

/** Status model */
export enum Status {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  BLOCKED = "BLOCKED",
  TEMPORARY = "TEMPORARY",
}

export interface Problem {
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  parameters?: Record<string, any>;
  status?: StatusType;
  title?: string;
  detail?: string;
}

export interface StatusType {
  /** @format int32 */
  statusCode?: number;
  reasonPhrase?: string;
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
  title?: string;
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

export interface Violation {
  field?: string;
  message?: string;
}

export interface AssetCreateRequest {
  /**
   * Asset id
   * @minLength 1
   */
  assetId: string;
  /** Source of origin for the asset */
  origin?: string;
  /** PartyId */
  partyId: string;
  /** Case reference ids */
  caseReferenceIds?: string[];
  /**
   * Asset type
   * @minLength 1
   */
  type: string;
  /**
   * Issued date
   * @format date
   */
  issued: string;
  /**
   * Valid to date
   * @format date
   */
  validTo?: string;
  /** Asset status */
  status: Status;
  /** Status reason */
  statusReason?: string;
  /** Asset description */
  description?: string;
  /** Additional parameters */
  additionalParameters?: Record<string, string>;
  /** JSON parameters */
  jsonParameters?: AssetJsonParameter[];
}

export interface AssetJsonParameter {
  /**
   * Parameter key
   * @minLength 1
   */
  key: string;
  /**
   * Parameter value with the JSON structure
   * @example {"firstName":"Joe","lastName":"Doe"}
   */
  value: JsonNode;
  /**
   * Schema ID
   * @minLength 1
   */
  schemaId: string;
}

export type JsonNode = any;

export interface AssetUpdateRequest {
  /** Case reference ids */
  caseReferenceIds?: string[];
  /**
   * Valid to date
   * @format date
   */
  validTo?: string;
  /** Asset status */
  status?: Status;
  /** Status reason */
  statusReason?: string;
  /** Additional parameters */
  additionalParameters?: Record<string, string>;
  /** JSON parameters */
  jsonParameters?: AssetJsonParameter[];
}

export interface Asset {
  /** Unique id of asset */
  id?: string;
  /** External asset id */
  assetId?: string;
  /** Source of origin for the asset */
  origin?: string;
  /** PartyId */
  partyId?: string;
  /** Case reference ids */
  caseReferenceIds?: string[];
  /** Asset type */
  type?: string;
  /**
   * Issued date
   * @format date
   */
  issued?: string;
  /**
   * Valid to date
   * @format date
   */
  validTo?: string;
  /** Asset status */
  status?: Status;
  /** Status reason */
  statusReason?: string;
  /** Asset description */
  description?: string;
  /** Additional parameters */
  additionalParameters?: Record<string, string>;
  /** JSON parameters */
  jsonParameters?: AssetJsonParameter[];
}
