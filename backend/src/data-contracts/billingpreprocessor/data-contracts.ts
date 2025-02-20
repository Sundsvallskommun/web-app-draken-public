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

/** Account information model */
export interface AccountInformation {
  /**
   * Cost center
   * @example "15800100"
   */
  costCenter?: string;
  /**
   * Subaccount
   * @example "936300"
   */
  subaccount?: string;
  /**
   * Department
   * @example "920360"
   */
  department?: string;
  /**
   * Accural key
   * @example "5647"
   */
  accuralKey?: string;
  /**
   * Activity
   * @example "5756"
   */
  activity?: string;
  /**
   * Article
   * @example "Electric bicycle"
   */
  article?: string;
  /**
   * Project
   * @example "11041"
   */
  project?: string;
  /**
   * Counterpart
   * @example "11830000"
   */
  counterpart?: string;
}

/** Address details model */
export interface AddressDetails {
  /**
   * Street name and number. Mandatory for EXTERNAL billing record.
   * @example "Sesame Street 7"
   */
  street?: string;
  /**
   * Care of name
   * @example "Abby Cadabby"
   */
  careOf?: string;
  /**
   * Postal code. Mandatory for EXTERNAL billing record.
   * @example "12345"
   */
  postalCode?: string;
  /**
   * City. Mandatory for EXTERNAL billing record.
   * @example "Grouchytown"
   */
  city?: string;
}

/** Billing record model */
export interface BillingRecord {
  /**
   * Unique id for the billing record
   * @example "71258e7d-5285-46ce-b9b2-877f8cad8edd"
   */
  id?: string;
  /**
   * Billing category
   * @pattern ACCESS_CARD|CUSTOMER_INVOICE|SALARY_AND_PENSION|ISYCASE
   */
  category: string;
  /** Billing type model */
  type: Type;
  /** Billing status model */
  status: Status;
  /**
   * Information regarding the person that has approved the billing record
   * @example "Big Bird"
   */
  approvedBy?: string;
  /**
   * Timestamp when the billing record got approved status
   * @format date-time
   * @example "2022-11-21T16:57:13.988+02:00"
   */
  approved?: string;
  /** Billing recipient model */
  recipient?: Recipient;
  /** Invoice model */
  invoice: Invoice;
  /**
   * Timestamp when the billing record was created
   * @format date-time
   * @example "2022-10-31T14:30:00.001+02:00"
   */
  created?: string;
  /**
   * Timestamp when the billing record was last modified
   * @format date-time
   * @example "2022-11-14T08:57:42.358+02:00"
   */
  modified?: string;
  /**
   * A map of extra parameters for custom values on the billing record
   * @example {"caseId":"abc123","uuid":"82a400cf-eb02-4a18-962d-fde55440868f"}
   */
  extraParameters?: Record<string, string>;
}

/** Invoice model */
export interface Invoice {
  /**
   * Customer number in Raindance
   * @example "16"
   */
  customerId: string;
  /**
   * Description of the invoice
   * @example "Errand number: 2113-01784"
   */
  description: string;
  /**
   * Our reference
   * @example "Harvey Kneeslapper"
   */
  ourReference?: string;
  /**
   * Customer reference
   * @example "Alice Snuffleupagus"
   */
  customerReference?: string;
  /**
   * Reference id. Mandatory for INTERNAL billing record.
   * @example "19-ALI22SNU"
   */
  referenceId?: string;
  /**
   * Date for the invoice
   * @format date
   * @example "2022-12-24"
   */
  date?: string;
  /**
   * Due date for the invoice
   * @format date
   * @example "2022-12-24"
   */
  dueDate?: string;
  /**
   * Total sum of all invoice rows
   * @format float
   * @example 1399.95
   */
  totalAmount?: number;
  invoiceRows: InvoiceRow[];
}

/** Invoice row model */
export interface InvoiceRow {
  descriptions?: string[];
  detailedDescriptions?: string[];
  /**
   * Total sum of invoice row
   * @format float
   * @example 1399.95
   */
  totalAmount?: number;
  /**
   * VAT code for invoice row
   * @pattern 00|06|12|25
   * @example "25"
   */
  vatCode?: string;
  /**
   * Cost per unit
   * @format float
   * @example 155.55
   */
  costPerUnit?: number;
  /**
   * Total amount of units
   * @format float
   * @example 9
   */
  quantity?: number;
  /** Account information model */
  accountInformation?: AccountInformation;
}

/** Billing recipient model */
export interface Recipient {
  /**
   * Unique id for the person issuing the billing record. Mandatory for EXTERNAL billing record if legalId is null.
   * @example "f0882f1d-06bc-47fd-b017-1d8307f5ce95"
   */
  partyId?: string;
  /**
   * LegalId for the organization issuing the billing record. Mandatory for EXTERNAL billing record if partyId is null.
   * @example "3456789123"
   */
  legalId?: string;
  /**
   * Name of issuing organization of the billing record if the recipient is an organization
   * @example "Sesame Merc AB"
   */
  organizationName?: string;
  /**
   * First name of the billing record recipient
   * @example "Alice"
   */
  firstName?: string;
  /**
   * Last name of the billing record recipient
   * @example "Snuffleupagus"
   */
  lastName?: string;
  /**
   * User id of the billing record recipient
   * @example "ALI22SNU"
   */
  userId?: string;
  /** Address details model */
  addressDetails: AddressDetails;
}

/**
 * Billing status model
 * @example "APPROVED"
 */
export enum Status {
  NEW = 'NEW',
  APPROVED = 'APPROVED',
  INVOICED = 'INVOICED',
  REJECTED = 'REJECTED',
}

/** Billing type model */
export enum Type {
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
}

export interface PageBillingRecord {
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  pageable?: PageableObject;
  /** @format int32 */
  size?: number;
  content?: BillingRecord[];
  /** @format int32 */
  number?: number;
  sort?: SortObject;
  /** @format int32 */
  numberOfElements?: number;
  empty?: boolean;
}

export interface PageableObject {
  paged?: boolean;
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  pageSize?: number;
  /** @format int64 */
  offset?: number;
  sort?: SortObject;
  unpaged?: boolean;
}

export interface SortObject {
  empty?: boolean;
  sorted?: boolean;
  unsorted?: boolean;
}
