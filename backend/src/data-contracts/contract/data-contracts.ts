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

/** Address for stakeholder */
export interface Address {
  /**
   * Address type
   * @example "POSTAL_ADDRESS"
   */
  type?: string;
  /** @example "Testvägen 18" */
  streetAddress?: string;
  /** @example "c/o Test Testorsson" */
  careOf?: string;
  /** @example "123 45" */
  postalCode?: string;
  /** @example "Sundsvall" */
  town?: string;
  /** @example "Sverige" */
  country?: string;
  /** @example "Test Testorsson" */
  attention?: string;
}

/** Attachment metadata */
export interface AttachmentMetaData {
  /**
   * The attachment id
   * @format int64
   * @example 1234
   */
  id?: number;
  /**
   * The attachment category. Possible values: CONTRACT | OTHER
   * @example "CONTRACT"
   */
  category?: string;
  /**
   * The attachment filename
   * @example "LeaseContract12.pdf"
   */
  filename?: string;
  /**
   * The attachment mime-type
   * @example "application/pdf"
   */
  mimeType?: string;
  /**
   * Notes on the attachment
   * @example "The contract was a little wrinkled when scanned"
   */
  note?: string;
}

/** Contract */
export interface Contract {
  /**
   * Version for contract
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * Contract id
   * @example "2024-12345"
   */
  contractId?: string;
  /**
   * A description
   * @example "A simple description of the contract"
   */
  description?: string;
  /**
   * External referenceId
   * @example "123"
   */
  externalReferenceId?: string;
  /**
   * Type of lease
   * @example "LEASEHOLD"
   */
  landLeaseType?: string;
  /**
   * Municipality id for the contract
   * @example "1984"
   */
  municipalityId?: string;
  /**
   * Object identity (from Lantmäteriet)
   * @example "909a6a80-d1a4-90ec-e040-ed8f66444c3f"
   */
  objectIdentity?: string;
  /**
   * Status for contract
   * @example "ACTIVE"
   */
  status?: string;
  /**
   * Contract type.
   * @example "LAND_LEASE"
   */
  type?: string;
  /**
   * Type of right of use
   * @example "HUNTING"
   */
  usufructType?: string;
  /** Leasehold */
  leasehold?: Leasehold;
  attachmentMetaData?: AttachmentMetaData[];
  additionalTerms?: TermGroup[];
  /** Extra parameters */
  extraParameters?: ExtraParameterGroup[];
  indexTerms?: TermGroup[];
  propertyDesignations?: string[];
  stakeholders?: Stakeholder[];
  /**
   * The duration of the lease in years
   * @format int32
   * @example 9
   */
  leaseDuration?: number;
  /** Fees */
  fees?: Fees;
  /** Invoicing details */
  invoicing?: Invoicing;
  /**
   * Lease period start date
   * @format date
   * @example "2020-01-01"
   */
  start?: string;
  /**
   * Lease period end date
   * @format date
   * @example "2022-12-31"
   */
  end?: string;
  /**
   * Marker for whether an agreement should be extended automatically or not
   * @default true
   * @example true
   */
  autoExtend?: boolean;
  /**
   * Extension period in days
   * @format int32
   * @example 30
   */
  leaseExtension?: number;
  /**
   * Termination period in days
   * @format int32
   * @example 30
   */
  periodOfNotice?: number;
  /**
   * Leased area (m2)
   * @format int32
   * @example 150
   */
  area?: number;
  /** Whether the contract is signed by a witness */
  signedByWitness?: boolean;
  /** Part(s) of property covered by the lease. Described by GeoJSON using polygon(s) */
  areaData?: FeatureCollection;
}

export interface Crs {
  type?: CrsTypeEnum;
  properties?: Record<string, object>;
}

/** Extra parameter group */
export interface ExtraParameterGroup {
  /**
   * The group name
   * @example "Fees"
   */
  name?: string;
  /**
   * Parameters
   * @example {"key1":"value1","key2":"value2"}
   */
  parameters?: Record<string, string>;
}

export interface Feature {
  crs?: Crs;
  bbox?: number[];
  properties?: Record<string, object>;
  geometry?: Feature | FeatureCollection | GeometryCollection | LineString | MultiLineString | MultiPoint | MultiPolygon | Point | Polygon;
  id?: string;
}

/**
 * Part(s) of property covered by the lease. Described by GeoJSON using polygon(s)
 * @example {"features":[{"geometry":{"coordinates":[[[1730072021484375,6238137830626575],[17297286987304688,6238050291927199],[17297801971435548,6237922958346664],[17301406860351562,62378194958300900],[17303810119628906,62379149998183050],[17303638458251952,6238066208244492],[1730072021484375,6238137830626575]]],"type":"Polygon"},"properties":{},"type":"Feature"}],"type":"FeatureCollection"}
 */
export interface FeatureCollection {
  crs?: Crs;
  bbox?: number[];
  features?: Feature[];
}

/** Fees */
export interface Fees {
  /**
   * The currency of the lease fees
   * @example "SEK"
   */
  currency?: string;
  /**
   * Yearly fee
   * @example 1000
   */
  yearly?: number;
  /**
   * Monthly fee
   * @example 100
   */
  monthly?: number;
  /**
   * Total fee
   * @example 1200
   */
  total?: number;
  /**
   * Total fee as text
   * @example "One thousand two hundred"
   */
  totalAsText?: string;
  /**
   * Index year
   * @format int32
   * @example 2021
   */
  indexYear?: number;
  /**
   * Index number
   * @format int32
   * @example 1
   */
  indexNumber?: number;
  /** Additional information */
  additionalInformation?: string[];
}

export interface GeoJsonObject {
  crs?: Crs;
  bbox?: number[];
  type: string;
}

export type GeometryCollection = GeoJsonObject & {
  geometries?: (Feature | FeatureCollection | GeometryCollection | LineString | MultiLineString | MultiPoint | MultiPolygon | Point | Polygon)[];
};

/** Invoicing details */
export interface Invoicing {
  /**
   * How often the lease is invoiced
   * @example "QUARTERLY"
   */
  invoiceInterval?: string;
  /**
   * How the lease is invoiced
   * @example "ADVANCE"
   */
  invoicedIn?: string;
}

/** Leasehold */
export interface Leasehold {
  /**
   * Type of leasehold
   * @example "OTHER"
   */
  purpose?: string;
  /**
   * description
   * @example "A simple description of the leasehold"
   */
  description?: string;
  additionalInformation?: string[];
}

export type LineString = GeoJsonObject & {
  coordinates?: LngLatAlt[];
};

export interface LngLatAlt {
  /** @format double */
  longitude?: number;
  /** @format double */
  latitude?: number;
  /** @format double */
  altitude?: number;
  additionalElements?: number[];
}

export type MultiLineString = GeoJsonObject & {
  coordinates?: LngLatAlt[][];
};

export type MultiPoint = GeoJsonObject & {
  coordinates?: LngLatAlt[];
};

export type MultiPolygon = GeoJsonObject & {
  coordinates?: LngLatAlt[][][];
};

export type Point = GeoJsonObject & {
  coordinates?: LngLatAlt;
};

export type Polygon = GeoJsonObject & {
  coordinates?: LngLatAlt[][];
};

/** List of stakeholders */
export interface Stakeholder {
  /**
   * Type of stakeholder, possible values: PERSON | COMPANY | ASSOCIATION
   * @example "ASSOCIATION"
   */
  type?: string;
  roles?: string[];
  /**
   * Name of the organization
   * @example "Sundsvalls kommun"
   */
  organizationName?: string;
  /**
   * Swedish organization number
   * @example "212000-2411"
   */
  organizationNumber?: string;
  /**
   * Stakeholders first name
   * @example "Test"
   */
  firstName?: string;
  /**
   * Stakeholders last name
   * @example "Testorsson"
   */
  lastName?: string;
  /**
   * PartyId
   * @example "40f14de9-815d-44a5-a34d-b1d38b628e07"
   */
  partyId?: string;
  /**
   * Phone number for stakeholder
   * @example "0701231212"
   */
  phoneNumber?: string;
  /**
   * Email adress for stakeholder
   * @example "test.testorsson@test.se"
   */
  emailAddress?: string;
  /** Address for stakeholder */
  address?: Address;
}

/** Term */
export interface Term {
  /**
   * Term description
   * @example "The parties involved in the lease agreement"
   */
  description?: string;
  /**
   * Term (name)
   * @example "Parties"
   */
  term?: string;
}

/** Term group */
export interface TermGroup {
  /**
   * The term group header
   * @example "Basic Terms"
   */
  header?: string;
  terms?: Term[];
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

/** Attachment */
export interface Attachment {
  /** Attachment content */
  attachmentData: AttachmentData;
  /** Attachment metadata */
  metaData: AttachmentMetaData;
}

/** Attachment content */
export interface AttachmentData {
  /**
   * BASE64-encoded attachment file content
   * @format base64
   * @example "QkFTRTY0LWVuY29kZWQgZGF0YQ=="
   */
  content?: string;
}

/** Paginated response for contracts */
export interface ContractPaginatedResponse {
  contracts?: Contract[];
  /** PagingMetaData model */
  _meta?: PagingMetaData;
}

/** PagingMetaData model */
export interface PagingMetaData {
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
}

export enum CrsTypeEnum {
  Name = 'name',
  Link = 'link',
}
