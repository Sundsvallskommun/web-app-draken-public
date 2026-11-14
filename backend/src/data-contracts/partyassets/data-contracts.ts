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

/** The sort order direction */
export enum Direction {
  ASC = "ASC",
  DESC = "DESC",
}

/** Status model */
export enum Status {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
  EXPIRED = "EXPIRED",
  BLOCKED = "BLOCKED",
  TEMPORARY = "TEMPORARY",
  REPLACED = "REPLACED",
  REVOKED = "REVOKED",
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
  /**
   * Asset title, shown to the party
   * @minLength 0
   * @maxLength 255
   */
  title?: string;
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
  string?: boolean;
  integralNumber?: boolean;
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
  boolean?: boolean;
  binary?: boolean;
  valueNode?: boolean;
  container?: boolean;
  missingNode?: boolean;
  nodeType?: JsonNodeNodeTypeEnum;
  number?: boolean;
  embeddedValue?: boolean;
}

export interface AssetUpdateRequest {
  /** Asset status */
  status?: Status;
  /** Reason for the status, set together with it. A status sent without a reason clears the reason the asset had */
  statusReason?: string;
  /**
   * Valid to date. Can only be changed while the asset is ACTIVE or TEMPORARY
   * @format date
   */
  validTo?: string;
  /** If true, validTo will be cleared (asset becomes indefinite). Takes precedence over validTo when both are supplied. Can only be used while the asset is ACTIVE or TEMPORARY */
  indefinitely?: boolean;
  /**
   * Asset title, shown to the party. Can only be changed while the asset is ACTIVE or TEMPORARY
   * @minLength 0
   * @maxLength 255
   */
  title?: string;
  /** Additional parameters, replacing the current ones. Can only be changed while the asset is ACTIVE or TEMPORARY */
  additionalParameters?: Record<string, string>;
  /** JSON parameters, replacing the current ones. Can only be changed while the asset is ACTIVE or TEMPORARY */
  jsonParameters?: AssetJsonParameter[];
}

/** Attachment update request. Null values are left untouched */
export interface AssetAttachmentUpdateRequest {
  /**
   * Name of the file
   * @minLength 0
   * @maxLength 255
   */
  fileName?: string;
  /**
   * What the attachment depicts
   * @minLength 0
   * @maxLength 255
   */
  category?: string;
  /**
   * Attachment description
   * @minLength 0
   * @maxLength 255
   */
  description?: string;
}

/** Metadata for a file attached to an asset */
export interface AssetAttachment {
  /** Unique id of attachment */
  id?: string;
  /** Name of the file */
  fileName?: string;
  /** Mime type of the file */
  mimeType?: string;
  /**
   * Size of the file in bytes
   * @format int32
   */
  fileSize?: number;
  /** What the attachment depicts */
  category?: string;
  /** Attachment description */
  description?: string;
  /**
   * Timestamp when the attachment was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the attachment was last updated
   * @format date-time
   */
  updated?: string;
}

export interface DraftAssetUpdateRequest {
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
  /** If true, validTo will be cleared (asset becomes indefinite). Takes precedence over validTo when both are supplied. */
  indefinitely?: boolean;
  /** Asset status. DRAFT keeps the asset a draft and ACTIVE activates it; no other status is accepted */
  status?: Status;
  /** Reason for the status, set together with it. A status sent without a reason clears the reason the asset had */
  statusReason?: string;
  /**
   * Asset title, shown to the party
   * @minLength 0
   * @maxLength 255
   */
  title?: string;
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
  /** Asset title, shown to the party */
  title?: string;
  /** Additional parameters */
  additionalParameters?: Record<string, string>;
  /** JSON parameters */
  jsonParameters?: AssetJsonParameter[];
  /** Id of the asset this asset replaces */
  replacesId?: string;
  /**
   * When the asset was created
   * @format date-time
   */
  created?: string;
  /**
   * When the asset was last updated
   * @format date-time
   */
  updated?: string;
}

/** An asset as it looked at one point in its history. The newest revision is the asset as it is now */
export interface AssetRevision {
  /** Unique id of the asset this revision belongs to */
  id?: string;
  /**
   * Revision number. Numbering starts at 0, which is the asset as it was created, and increases by one for every recorded change
   * @format int32
   */
  revision?: number;
  /** Who created this revision, taken from the X-Sent-By header. Null when the header was absent, and for revisions written by the nightly expiration job */
  actor?: string;
  /**
   * When this revision was superseded, or when the asset was last changed for the current revision
   * @format date-time
   */
  recordedAt?: string;
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
  /** Asset title, shown to the party */
  title?: string;
  /** Additional parameters */
  additionalParameters?: Record<string, string>;
  /** JSON parameters */
  jsonParameters?: AssetJsonParameter[];
  /** Id of the asset this asset replaces */
  replacesId?: string;
  /** Attachment metadata as it was at this revision. The files themselves never change, so each one is still downloadable by its id even if it has since been removed */
  attachments?: AssetAttachment[];
}

/** Paged asset response */
export interface AssetPagedResponse {
  assets?: Asset[];
  /** PagingAndSortingMetaData model */
  _meta?: PagingAndSortingMetaData;
}

/** PagingAndSortingMetaData model */
export interface PagingAndSortingMetaData {
  /**
   * Current page
   * @format int32
   */
  page?: number;
  /**
   * Displayed objects per page
   * @format int32
   */
  limit?: number;
  /**
   * Displayed objects on current page
   * @format int32
   */
  count?: number;
  /**
   * Total amount of hits based on provided search parameters
   * @format int64
   */
  totalRecords?: number;
  /**
   * Total amount of pages based on provided search parameters
   * @format int32
   */
  totalPages?: number;
  sortBy?: string[];
  /** The sort order direction */
  sortDirection?: Direction;
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
