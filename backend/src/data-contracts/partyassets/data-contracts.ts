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
  title?: string;
  detail?: string;
  /** @format int32 */
  status?: number;
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

export interface AssetCreateRequest {
  /** External asset id (e.g. PRH-123456789) used as an identifier by external systems */
  assetId?: string;
  /** Source of origin for the asset */
  origin?: string;
  /** PartyId */
  partyId: string;
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

export interface JsonNode {
  empty?: boolean;
  array?: boolean;
  null?: boolean;
  object?: boolean;
  float?: boolean;
  valueNode?: boolean;
  container?: boolean;
  missingNode?: boolean;
  nodeType?: JsonNodeNodeTypeEnum;
  pojo?: boolean;
  floatingPointNumber?: boolean;
  short?: boolean;
  int?: boolean;
  long?: boolean;
  double?: boolean;
  bigDecimal?: boolean;
  bigInteger?: boolean;
  /** @deprecated */
  textual?: boolean;
  binary?: boolean;
  integralNumber?: boolean;
  number?: boolean;
  string?: boolean;
  boolean?: boolean;
  embeddedValue?: boolean;
}

export interface AssetUpdateRequest {
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
  /** External asset id (e.g. PRH-123456789) used as an identifier by external systems */
  assetId?: string;
  /** Source of origin for the asset */
  origin?: string;
  /** PartyId */
  partyId?: string;
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

export enum JsonNodeNodeTypeEnum {
  ARRAY = "ARRAY",
  BINARY = "BINARY",
  BOOLEAN = "BOOLEAN",
  MISSING = "MISSING",
  NULL = "NULL",
  NUMBER = "NUMBER",
  OBJECT = "OBJECT",
  POJO = "POJO",
  STRING = "STRING",
}
