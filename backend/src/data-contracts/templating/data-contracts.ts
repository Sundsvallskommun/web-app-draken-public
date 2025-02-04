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

/** Template default value */
export interface DefaultValue {
  /** Field name */
  fieldName?: string;
  /** Value */
  value?: string;
}

/** Version increment mode */
export enum IncrementMode {
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
}

/** Metadata */
export interface Metadata {
  key?: string;
  value?: string;
}

/** Template request */
export interface TemplateRequest {
  /** Identifier. May contain letters, digits, dashes and dots */
  identifier: string;
  /** Version increment mode */
  versionIncrement?: IncrementMode;
  /** Name */
  name: string;
  /** Description */
  description?: string | null;
  /** Content, as a BASE64-encoded string */
  content: string;
  metadata?: Metadata[];
  defaultValues?: DefaultValue[];
  /** A changelog */
  changeLog?: string;
}

/** Template */
export interface TemplateResponse {
  /** Identifier */
  identifier?: string;
  /** Version */
  version?: string;
  /** Type */
  type?: TemplateResponseTypeEnum;
  /** Name */
  name?: string;
  /** Description */
  description?: string;
  metadata?: Metadata[];
  defaultValues?: DefaultValue[];
  /** Changelog */
  changeLog?: string;
  /**
   * Last modification timestamp
   * @format date-time
   */
  lastModifiedAt?: string;
}

export interface Problem {
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  parameters?: Record<string, object>;
  status?: StatusType;
  title?: string;
  detail?: string;
}

export interface StatusType {
  /** @format int32 */
  statusCode?: number;
  reasonPhrase?: string;
}

/**
 * Search filter expression
 * @example {"or":[{"eq":{"process":"PRH"}},{"eq":{"verksamhet":"SBK"}}]}
 */
export type Expression = object;

/** Template metadata */
export interface KeyValue {
  key: string;
  value: string;
}

/** Request to render a template */
export interface RenderRequest {
  /** Template identifier */
  identifier?: string | null;
  /** Template version */
  version?: string | null;
  metadata?: KeyValue[];
  /**
   * Parameters (string values may be BASE64-encoded, and in that case they should be on the form "BASE64:<base64-encoded-value>")
   * @example {"someKey":"someValue","otherKey":["otherValue1","otherValue2"],"anotherKey":{"someKey":"BASE64:c29tZUJhc2VFbmNvZGVkVmFsdWU="}}
   */
  parameters?: Record<string, object | null>;
}

export interface RenderResponse {
  /** Output, as a BASE64-encoded string */
  output?: string;
}

/** Request to render a template directly */
export interface DirectRenderRequest {
  /** The template content, as a BASE64-encoded string */
  content: string;
  /**
   * Parameters (string values may be BASE64-encoded, and in that case they should be on the form "BASE64:<base64-encoded-value>")
   * @example {"someKey":"someValue","otherKey":["otherValue1","otherValue2"],"anotherKey":{"someKey":"BASE64:c29tZUJhc2VFbmNvZGVkVmFsdWU="}}
   */
  parameters?: Record<string, object | null>;
}

export interface DirectRenderResponse {
  /** Output, as a BASE64-encoded string */
  output?: string;
}

/** @example [{"op":"add|remove|replace","path":"/some/attribute/path","value":"..."}] */
export type JsonPatch = object;

/** Detailed template */
export interface DetailedTemplateResponse {
  /** Identifier */
  identifier?: string;
  /** Version */
  version?: string;
  /** Type */
  type?: DetailedTemplateResponseTypeEnum;
  /** Name */
  name?: string;
  /** Description */
  description?: string;
  metadata?: Metadata[];
  defaultValues?: DefaultValue[];
  /** Changelog */
  changeLog?: string;
  /**
   * Last modification timestamp
   * @format date-time
   */
  lastModifiedAt?: string;
  /** Content, as a BASE64-encoded string */
  content?: string;
}

/** Type */
export enum TemplateResponseTypeEnum {
  PEBBLE = 'PEBBLE',
  WORD = 'WORD',
}

/** Type */
export enum DetailedTemplateResponseTypeEnum {
  PEBBLE = 'PEBBLE',
  WORD = 'WORD',
}
