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

/** Address model */
export interface Address {
  /**
   * City
   * @example "Sundsvall"
   */
  city?: string;
  /**
   * Street address
   * @example "Storgatan 10"
   */
  street?: string;
  /**
   * Postal code
   * @example "85740"
   */
  postcode?: string;
  /**
   * Care of
   * @example "John Doe"
   */
  careOf?: string;
}

/** Business information model */
export interface BusinessInformation {
  /**
   * The company's name
   * @example "Sundsvalls kommun"
   */
  companyName?: string;
  /** Legal form information model */
  legalForm?: LegalForm;
  /** Address model */
  address?: Address;
  /**
   * The company's contact email
   * @example "somecompany@noreply.com"
   */
  emailAddress?: string;
  /**
   * The company's contact phone number
   * @example "070-1234567"
   */
  phoneNumber?: string;
  /** Municipality information model */
  municipality?: Municipality;
  /** County information model */
  county?: County;
  /** Fiscal year information model */
  fiscalYear?: FiscalYear;
  /** Company form information model */
  companyForm?: CompanyForm;
  /**
   * When the company was registered
   * @format date
   * @example "2022-01-01"
   */
  companyRegistrationTime?: string;
  /** Liquidation information model */
  liquidationInformation?: LiquidationInformation;
  /**
   * When and if the company was deregistered
   * @format date
   * @example "2022-09-01"
   */
  deregistrationDate?: string;
  /** Address model */
  companyLocation?: Address;
  /**
   * Who may sign for the company
   * @example "Firman tecknas av styrelsen"
   */
  businessSignatory?: string;
  /**
   * Information regarding the company's operations
   * @example "Psykologisk forskning på bin samt därmed förenlig verksamhet."
   */
  companyDescription?: string;
  /** Shares information model */
  sharesInformation?: SharesInformation;
  /** Error information model */
  errorInformation?: ErrorInformation;
}

/** Company form information model */
export interface CompanyForm {
  /**
   * Company form
   * @example "AB"
   */
  companyFormCode?: string;
  /**
   * Company form description
   * @example "Aktiebolag"
   */
  companyFormDescription?: string;
}

/** County information model */
export interface County {
  /**
   * County
   * @example "Västernorrland"
   */
  countyName?: string;
  /**
   * County code
   * @example "22"
   */
  countyCode?: string;
}

/** Error information model */
export interface ErrorInformation {
  /**
   * Indicates if there was an error while fetching data and that one or more parameters could not be fetched
   * @example true
   */
  hasErrors?: boolean;
  /**
   * Map with error code (from bolagsverket) as key and the error description as value
   * @example "9071006, Ej behörig - ej firmatecknare."
   */
  errorDescriptions?: Record<string, string>;
}

/** Fiscal year information model */
export interface FiscalYear {
  /**
   * Fiscal year start day
   * @format int32
   * @example 1
   */
  fromDay?: number;
  /**
   * Fiscal year start month
   * @format int32
   * @example 1
   */
  fromMonth?: number;
  /**
   * Fiscal year end day
   * @format int32
   * @example 31
   */
  toDay?: number;
  /**
   * Fiscal year end month
   * @format int32
   * @example 12
   */
  toMonth?: number;
}

/** Legal form information model */
export interface LegalForm {
  /**
   * Legal form
   * @example "Övriga aktiebolag"
   */
  legalFormDescription?: string;
  /**
   * Legal form code
   * @example "49"
   */
  legalFormCode?: string;
}

/** Liquidation information model */
export interface LiquidationInformation {
  liquidationReasons?: LiquidationReason[];
  /** Reason for liquidation or cancellation of liquidation */
  cancelledLiquidation?: LiquidationReason;
}

/** Reason for liquidation or cancellation of liquidation */
export interface LiquidationReason {
  /**
   * Liquidation code
   * @example "21"
   */
  liquidationCode?: string;
  /**
   * Liquidation description
   * @example "Konkurs avslutad"
   */
  liquidationDescription?: string;
  /**
   * Liquidation date
   * @format date
   * @example "2022-09-01"
   */
  liquidationDate?: string;
  /**
   * Type of liquidation
   * @example "Konkurs"
   */
  liquidationType?: string;
}

/** Municipality information model */
export interface Municipality {
  /**
   * Municipality
   * @example "Sundsvalls Kommun"
   */
  municipalityName?: string;
  /**
   * Municipality code
   * @example "2281"
   */
  municipalityCode?: string;
}

/** Share information model */
export interface ShareType {
  /**
   * Label of the shares
   * @example "B"
   */
  label?: string;
  /**
   * Number of shares of this class
   * @example 25000
   */
  numberOfShares?: number;
  /**
   * The vote value for one share
   * @example "1/10"
   */
  voteValue?: string;
}

/** Shares information model */
export interface SharesInformation {
  shareTypes?: ShareType[];
  /**
   * Number of total shares
   * @example 100000
   */
  numberOfShares?: number;
  /**
   * Shares value
   * @example 120000
   */
  shareCapital?: number;
  /**
   * Shares value currency
   * @example "sek"
   */
  shareCurrency?: string;
}

/** Business engagements response model */
export interface BusinessEngagementsResponse {
  engagements?: Engagement[];
  /**
   * In case fetching one or more engagement failed, this will show why it failed. There may be more than one description if several engagements failed.
   * @example "Timeout"
   */
  statusDescriptions?: Record<string, string>;
  /**
   * If fetching all engagements went "OK" or "NOK". A "NOK" may still return engagements but indicates that the information is incomplete.
   * @example "OK"
   */
  status: BusinessEngagementsResponseStatusEnum;
}

/** Represents a persons business engagement. */
export interface Engagement {
  /**
   * Name of the organization
   * @example "Styrbjörns båtar"
   */
  organizationName?: string;
  /**
   * Organization number, may also be personal number in case of enskild firma
   * @example "2021005448"
   */
  organizationNumber?: string;
  /**
   * Unique id for the organization (UUID)
   * @example "bab17d8b-af38-4531-967c-083f15ca1571"
   */
  organizationId?: string;
}

/**
 * If fetching all engagements went "OK" or "NOK". A "NOK" may still return engagements but indicates that the information is incomplete.
 * @example "OK"
 */
export enum BusinessEngagementsResponseStatusEnum {
  OK = 'OK',
  NOK = 'NOK',
}
