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

/** Billing type model */
export enum Type {
  EXTERNAL = "EXTERNAL",
  INTERNAL = "INTERNAL",
}

/** Billing status model */
export enum Status {
  NEW = "NEW",
  APPROVED = "APPROVED",
  INVOICED = "INVOICED",
  REJECTED = "REJECTED",
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

/** Account information model */
export interface AccountInformation {
  /** Cost center */
  costCenter?: string;
  /** Subaccount */
  subaccount?: string;
  /** Department */
  department?: string;
  /** Accural key */
  accuralKey?: string;
  /** Activity */
  activity?: string;
  /** Article */
  article?: string;
  /** Project */
  project?: string;
  /** Counterpart */
  counterpart?: string;
  /** Amount */
  amount?: number;
}

/** Address details model */
export interface AddressDetails {
  /** Street name and number. Mandatory for EXTERNAL billing record. */
  street?: string;
  /** Care of name */
  careOf?: string;
  /** Postal code. Mandatory for EXTERNAL billing record. */
  postalCode?: string;
  /** City. Mandatory for EXTERNAL billing record. */
  city?: string;
}

/** Billing record model */
export interface BillingRecord {
  /** Unique id for the billing record */
  id?: string;
  /**
   * Billing category
   * @pattern ACCESS_CARD|CUSTOMER_INVOICE|SALARY_AND_PENSION|ISYCASE|MEX_INVOICE
   */
  category: string;
  /** Billing type model */
  type: Type;
  /** Billing status model */
  status: Status;
  /** Information regarding the person that has approved the billing record */
  approvedBy?: string;
  /**
   * Timestamp when the billing record got approved status
   * @format date-time
   */
  approved?: string;
  /** Billing recipient model */
  recipient?: Recipient;
  /** Invoice model */
  invoice: Invoice;
  /**
   * Timestamp when the billing record was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the billing record was last modified
   * @format date-time
   */
  modified?: string;
  /** A map of extra parameters for custom values on the billing record */
  extraParameters?: Record<string, string>;
  /**
   * The date when the billing record should be transferred to Raindance. If not specified, defaults to the next 15th of the month.
   * @format date
   */
  transferDate?: string;
}

/** Invoice model */
export interface Invoice {
  /**
   * Customer number in Raindance
   * @minLength 1
   */
  customerId: string;
  /**
   * Description of the invoice
   * @minLength 1
   */
  description: string;
  /** Our reference */
  ourReference?: string;
  /**
   * Customer reference
   * @minLength 1
   */
  customerReference: string;
  /**
   * Date for the invoice
   * @format date
   */
  date?: string;
  /**
   * Due date for the invoice
   * @format date
   */
  dueDate?: string;
  /** Total sum of all invoice rows */
  totalAmount?: number;
  /** @minItems 1 */
  invoiceRows: InvoiceRow[];
}

/** Invoice row model */
export interface InvoiceRow {
  descriptions?: string[];
  detailedDescriptions?: string[];
  /** Total sum of invoice row */
  totalAmount?: number;
  /**
   * VAT code for invoice row
   * @pattern 00|06|12|25
   */
  vatCode?: string;
  /** Cost per unit */
  costPerUnit?: number;
  /** Total amount of units */
  quantity?: number;
  /** Account information */
  accountInformation?: AccountInformation[];
}

/** Billing recipient model */
export interface Recipient {
  /** Unique id for the person issuing the billing record. Mandatory for EXTERNAL billing record if legalId is null. */
  partyId?: string;
  /** LegalId for the organization issuing the billing record. Mandatory for EXTERNAL billing record if partyId is null. */
  legalId?: string;
  /** Name of issuing organization of the billing record if the recipient is an organization */
  organizationName?: string;
  /** First name of the billing record recipient */
  firstName?: string;
  /** Last name of the billing record recipient */
  lastName?: string;
  /** User id of the billing record recipient */
  userId?: string;
  /** Address details model */
  addressDetails: AddressDetails;
}

/** InvoiceFile status model */
export interface InvoiceFileStatus {
  id?: string;
  name?: string;
  type?: string;
  status?: string;
  municipalityId?: string;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  sentAt?: string;
}

export interface PageBillingRecord {
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  size?: number;
  content?: BillingRecord[];
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
  paged?: boolean;
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  pageSize?: number;
  sort?: SortObject;
  unpaged?: boolean;
}

export interface SortObject {
  empty?: boolean;
  sorted?: boolean;
  unsorted?: boolean;
}

export enum GetFileStatusesForMonthParamsMonthEnum {
  JANUARY = "JANUARY",
  FEBRUARY = "FEBRUARY",
  MARCH = "MARCH",
  APRIL = "APRIL",
  MAY = "MAY",
  JUNE = "JUNE",
  JULY = "JULY",
  AUGUST = "AUGUST",
  SEPTEMBER = "SEPTEMBER",
  OCTOBER = "OCTOBER",
  NOVEMBER = "NOVEMBER",
  DECEMBER = "DECEMBER",
}
