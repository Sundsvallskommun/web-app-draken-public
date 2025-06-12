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
  parameters?: Record<string, object>;
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
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  parameters?: Record<string, object>;
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

/** Case status response */
export interface CaseStatusResponse {
  /**
   * Case id
   * @example "1234567890"
   */
  caseId?: string;
  /**
   * External case id
   * @example "1234567890"
   */
  externalCaseId?: string;
  /**
   * Case type
   * @example "Building permit"
   */
  caseType?: string;
  /**
   * Status
   * @example "In progress"
   */
  status?: string;
  /**
   * First submitted
   * @example "2021-01-01"
   */
  firstSubmitted?: string;
  /**
   * Last status change
   * @example "2021-01-01"
   */
  lastStatusChange?: string;
  /**
   * The system that the case is in
   * @example "BYGGR"
   */
  system?: string;
  /**
   * The namespace of the case
   * @example "Namespace"
   */
  namespace?: string;
  /**
   * Human readable identifier for the case
   * @example "BYGGR-2024-123456"
   */
  errandNumber?: string;
}

/** Case status response */
export interface CasePdfResponse {
  /**
   * External case id
   * @example "1234567890"
   */
  externalCaseId?: string;
  /**
   * Base64 encoded PDF
   * @example "JVBERi0x"
   */
  base64?: string;
}

/** Case status response */
export interface OepStatusResponse {
  /**
   * Key
   * @example "status"
   */
  key?: string;
  /**
   * Value
   * @example "In progress"
   */
  value?: string;
}
