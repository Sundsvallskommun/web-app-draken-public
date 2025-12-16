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

/**
 * Time unit
 * @example "MONTHS"
 */
export enum TimeUnit {
  DAYS = "DAYS",
  MONTHS = "MONTHS",
  YEARS = "YEARS",
}

/** Status */
export enum Status {
  ACTIVE = "ACTIVE",
  DRAFT = "DRAFT",
  TERMINATED = "TERMINATED",
}

/**
 * Stakeholder type
 * @example "ASSOCIATION"
 */
export enum StakeholderType {
  PERSON = "PERSON",
  COMPANY = "COMPANY",
  ASSOCIATION = "ASSOCIATION",
  MUNICIPALITY = "MUNICIPALITY",
  REGION = "REGION",
  OTHER = "OTHER",
}

/**
 * Stakeholder role
 * @example "BUYER"
 */
export enum StakeholderRole {
  BUYER = "BUYER",
  CONTACT_PERSON = "CONTACT_PERSON",
  GRANTOR = "GRANTOR",
  LAND_RIGHT_OWNER = "LAND_RIGHT_OWNER",
  LEASEHOLDER = "LEASEHOLDER",
  PROPERTY_OWNER = "PROPERTY_OWNER",
  POWER_OF_ATTORNEY_CHECK = "POWER_OF_ATTORNEY_CHECK",
  POWER_OF_ATTORNEY_ROLE = "POWER_OF_ATTORNEY_ROLE",
  SELLER = "SELLER",
  SIGNATORY = "SIGNATORY",
  PRIMARY_BILLING_PARTY = "PRIMARY_BILLING_PARTY",
  LESSOR = "LESSOR",
  LESSEE = "LESSEE",
}

/**
 * Party
 * @example "LESSOR"
 */
export enum Party {
  LESSOR = "LESSOR",
  LESSEE = "LESSEE",
}

/** Leasehold type */
export enum LeaseholdType {
  AGRICULTURE = "AGRICULTURE",
  APARTMENT = "APARTMENT",
  BOATING_PLACE = "BOATING_PLACE",
  BUILDING = "BUILDING",
  DEPOT = "DEPOT",
  DWELLING = "DWELLING",
  LAND_COMPLEMENT = "LAND_COMPLEMENT",
  LINEUP = "LINEUP",
  OTHER = "OTHER",
  PARKING = "PARKING",
  RECYCLING_STATION = "RECYCLING_STATION",
  ROAD = "ROAD",
  SIGNBOARD = "SIGNBOARD",
  SNOW_DUMP = "SNOW_DUMP",
  SPORTS_PURPOSE = "SPORTS_PURPOSE",
  SURFACE_HEAT = "SURFACE_HEAT",
  TRAIL = "TRAIL",
}

/** Lease type */
export enum LeaseType {
  LAND_LEASE_PUBLIC = "LAND_LEASE_PUBLIC",
  LAND_LEASE_RESIDENTIAL = "LAND_LEASE_RESIDENTIAL",
  SITE_LEASE_COMMERCIAL = "SITE_LEASE_COMMERCIAL",
  USUFRUCT_MOORING = "USUFRUCT_MOORING",
  USUFRUCT_HUNTING = "USUFRUCT_HUNTING",
  USUFRUCT_FARMING = "USUFRUCT_FARMING",
  USUFRUCT_MISC = "USUFRUCT_MISC",
  OBJECT_LEASE = "OBJECT_LEASE",
  LAND_LEASE_MISC = "LAND_LEASE_MISC",
  LEASEHOLD = "LEASEHOLD",
  OTHER_FEE = "OTHER_FEE",
}

/** Invoiced in */
export enum InvoicedIn {
  ADVANCE = "ADVANCE",
  ARREARS = "ARREARS",
}

/**
 * Interval type
 * @example "QUARTERLY"
 */
export enum IntervalType {
  YEARLY = "YEARLY",
  HALF_YEARLY = "HALF_YEARLY",
  QUARTERLY = "QUARTERLY",
  MONTHLY = "MONTHLY",
}

/** Contract type */
export enum ContractType {
  LEASE_AGREEMENT = "LEASE_AGREEMENT",
  PURCHASE_AGREEMENT = "PURCHASE_AGREEMENT",
}

/** Attachment category */
export enum AttachmentCategory {
  CONTRACT = "CONTRACT",
  OTHER = "OTHER",
}

/**
 * Address type
 * @example "POSTAL_ADDRESS"
 */
export enum AddressType {
  POSTAL_ADDRESS = "POSTAL_ADDRESS",
  BILLING_ADDRESS = "BILLING_ADDRESS",
  VISITING_ADDRESS = "VISITING_ADDRESS",
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

/** Address for stakeholder */
export interface Address {
  /** Address type */
  type?: AddressType;
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
export interface AttachmentMetadata {
  /**
   * The attachment id
   * @format int64
   * @example 1234
   */
  id?: number;
  /** Attachment category */
  category?: AttachmentCategory;
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
  /** Lease type */
  leaseType?: LeaseType;
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
  /** Status */
  status: Status;
  /** Contract type */
  type: ContractType;
  /** Leasehold */
  leasehold?: Leasehold;
  attachmentMetaData?: AttachmentMetadata[];
  additionalTerms?: TermGroup[];
  /** Extra parameters */
  extraParameters?: ExtraParameterGroup[];
  indexTerms?: TermGroup[];
  propertyDesignations?: string[];
  stakeholders?: Stakeholder[];
  /** Duration */
  duration?: Duration;
  /** Extension */
  extension?: Extension;
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
  notices?: Notice[];
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

/** Duration */
export interface Duration {
  /**
   * The lease duration value
   * @format int32
   * @example 9
   */
  leaseDuration: number;
  /** Time unit */
  unit: TimeUnit;
}

/** Extension */
export interface Extension {
  /**
   * Marker for whether an agreement should be extended automatically or not
   * @default true
   * @example true
   */
  autoExtend?: boolean;
  /**
   * The lease extension value
   * @format int32
   * @example 2
   */
  leaseExtension: number;
  /** Time unit */
  unit: TimeUnit;
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
  geometry?:
    | Feature
    | FeatureCollection
    | GeometryCollection
    | LineString
    | MultiLineString
    | MultiPoint
    | MultiPolygon
    | Point
    | Polygon;
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
   * @example 1000.5
   */
  yearly?: number;
  /**
   * Monthly fee
   * @example 100.5
   */
  monthly?: number;
  /**
   * Total fee
   * @example 1200.5
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
  /**
   * Specifies what proportion of the consumer price index should be used for invoicing.
   * @min 0
   * @exclusiveMin false
   * @max 1
   * @exclusiveMax false
   * @example 0.5
   */
  indexationRate?: number;
  /** Additional information */
  additionalInformation?: string[];
}

export interface GeoJsonObject {
  crs?: Crs;
  bbox?: number[];
  type: string;
}

export type GeometryCollection = GeoJsonObject & {
  geometries?: (
    | Feature
    | FeatureCollection
    | GeometryCollection
    | LineString
    | MultiLineString
    | MultiPoint
    | MultiPolygon
    | Point
    | Polygon
  )[];
};

/** Invoicing details */
export interface Invoicing {
  /** Interval type */
  invoiceInterval?: IntervalType;
  /** Invoiced in */
  invoicedIn?: InvoicedIn;
}

/** Leasehold */
export interface Leasehold {
  /** Leasehold type */
  purpose?: LeaseholdType;
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

/** Notice */
export interface Notice {
  /** Party */
  party?: Party;
  /**
   * The period of notice
   * @format int32
   * @example 3
   */
  periodOfNotice: number;
  /** Time unit */
  unit: TimeUnit;
}

/** Parameter model */
export interface Parameter {
  /**
   * Parameter key
   * @minLength 1
   */
  key: string;
  /** Parameter display name */
  displayName?: string;
  /** Parameter group name */
  group?: string;
  /** Parameter values */
  values?: string[];
}

export type Point = GeoJsonObject & {
  coordinates?: LngLatAlt;
};

export type Polygon = GeoJsonObject & {
  coordinates?: LngLatAlt[][];
};

/** List of stakeholders */
export interface Stakeholder {
  /** Stakeholder type */
  type?: StakeholderType;
  roles?: StakeholderRole[];
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
  /** Parameters for the stakeholder */
  parameters?: Parameter[];
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

/** Attachment */
export interface Attachment {
  /** Attachment content */
  attachmentData: AttachmentData;
  /** Attachment metadata */
  metadata: AttachmentMetadata;
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
  Name = "name",
  Link = "link",
}
