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
  title?: string;
  detail?: string;
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  parameters?: Record<string, object>;
  status?: StatusType;
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
  detail?: string;
  /** @format uri */
  instance?: string;
  parameters?: Record<string, object>;
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
  message?: string;
  title?: string;
  detail?: string;
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  parameters?: Record<string, object>;
  status?: StatusType;
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

export interface JsonSchemaCreateRequest {
  /**
   * Schema name
   * @minLength 1
   * @example "person"
   */
  name: string;
  /**
   * Schema version on the format [major version].[minor version]
   * @minLength 1
   * @pattern ^(\d+\.)?(\d+)$
   * @example "1.0"
   */
  version: string;
  /**
   * The JSON schema, specified by: https://json-schema.org/draft/2020-12/schema
   * @example "{"$id":"https://example.com/person.schema.json","$schema":"https://json-schema.org/draft/2020-12/schema","title":"Person","type":"object","properties":{"firstName":{"type":"string","description":"The person's first name."},"lastName":{"type":"string","description":"The person's last name."}}}"
   */
  value: string;
  /**
   * Description of the schema purpose
   * @example "A JSON-schema that defines a person object"
   */
  description?: string;
}

export interface AssetCreateRequest {
  /**
   * Asset id
   * @minLength 1
   * @example "PRH-123456789"
   */
  assetId: string;
  /**
   * Source of origin for the asset
   * @example "CASEDATA"
   */
  origin?: string;
  /**
   * PartyId
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  partyId: string;
  /**
   * Case reference ids
   * @example ["123e4567-e89b-12d3-a456-426614174000"]
   */
  caseReferenceIds?: string[];
  /**
   * Asset type
   * @minLength 1
   * @example "PERMIT"
   */
  type: string;
  /**
   * Issued date
   * @format date
   * @example "2021-01-01"
   */
  issued: string;
  /**
   * Valid to date
   * @format date
   * @example "2021-12-31"
   */
  validTo?: string;
  /** Status model */
  status: Status;
  /**
   * Status reason
   * @example "Status reason"
   */
  statusReason?: string;
  /**
   * Asset description
   * @example "Asset description"
   */
  description?: string;
  /**
   * Additional parameters
   * @example {"foo":"bar"}
   */
  additionalParameters?: Record<string, string>;
  /** JSON parameters */
  jsonParameters?: AssetJsonParameter[];
}

/** JSON parameters */
export interface AssetJsonParameter {
  /**
   * Parameter key
   * @minLength 1
   * @example "personParameter"
   */
  key: string;
  /**
   * Parameter value with the JSON structure
   * @minLength 1
   * @example "{"firstName":"Joe","lastName":"Doe"}"
   */
  value: string;
  /**
   * Schema ID
   * @minLength 1
   * @example "person_1.0"
   */
  schemaId: string;
}

export interface AssetUpdateRequest {
  /**
   * Case reference ids
   * @example ["123e4567-e89b-12d3-a456-426614174000"]
   */
  caseReferenceIds?: string[];
  /**
   * Valid to date
   * @format date
   * @example "2021-12-31"
   */
  validTo?: string;
  /** Status model */
  status?: Status;
  /**
   * Status reason
   * @example "Status reason"
   */
  statusReason?: string;
  /**
   * Additional parameters
   * @example {"foo":"bar"}
   */
  additionalParameters?: Record<string, string>;
  /** JSON parameters */
  jsonParameters?: AssetJsonParameter[];
}

export interface JsonSchema {
  /**
   * Schema ID. The ID is composed by the municipalityId, schema name and version. I.e.: [municipality_id]_[schema_name]_[schema_version]
   * @example "2281_person_1.0"
   */
  id?: string;
  /**
   * Schema name
   * @example "person"
   */
  name?: string;
  /**
   * Schema version on the format [major version].[minor version]
   * @example "1.0"
   */
  version?: string;
  /**
   * The number of schema references. I.e. number of json-objects that references the schema.
   * @format int64
   * @example 42
   */
  numberOfReferences?: number;
  /**
   * The JSON schema
   * @example "{"$id":"https://example.com/person.schema.json","$schema":"https://json-schema.org/draft/2020-12/schema","title":"Person","type":"object","properties":{"firstName":{"type":"string","description":"The person's first name."},"lastName":{"type":"string","description":"The person's last name."}}}"
   */
  value?: string;
  /**
   * Description of the schema purpose
   * @example "A JSON-schema that defines a person object"
   */
  description?: string;
  /**
   * Created timestamp
   * @format date-time
   */
  created?: string;
}

export interface Asset {
  /**
   * Unique id of asset
   * @example "1c8f38a6-b492-4037-b7dc-de5bc6c629f0"
   */
  id?: string;
  /**
   * External asset id
   * @example "PRH-123456789"
   */
  assetId?: string;
  /**
   * Source of origin for the asset
   * @example "CASEDATA"
   */
  origin?: string;
  /**
   * PartyId
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  partyId?: string;
  /**
   * Case reference ids
   * @example ["945576d3-6e92-4118-ba33-53582d338ad3"]
   */
  caseReferenceIds?: string[];
  /**
   * Asset type
   * @example "PERMIT"
   */
  type?: string;
  /**
   * Issued date
   * @format date
   * @example "2021-01-01"
   */
  issued?: string;
  /**
   * Valid to date
   * @format date
   * @example "2021-12-31"
   */
  validTo?: string;
  /** Status model */
  status?: Status;
  /**
   * Status reason
   * @example "Status reason"
   */
  statusReason?: string;
  /**
   * Asset description
   * @example "Asset description"
   */
  description?: string;
  /**
   * Additional parameters
   * @example {"foo":"bar"}
   */
  additionalParameters?: Record<string, string>;
  /** JSON parameters */
  jsonParameters?: AssetJsonParameter[];
}
