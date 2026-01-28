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

/** Time unit */
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

/** Stakeholder type */
export enum StakeholderType {
  PERSON = "PERSON",
  ORGANIZATION = "ORGANIZATION",
  ASSOCIATION = "ASSOCIATION",
  MUNICIPALITY = "MUNICIPALITY",
  REGION = "REGION",
  OTHER = "OTHER",
}

/** Stakeholder role */
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

/** Party */
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

/** Interval type */
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

/** Address type */
export enum AddressType {
  POSTAL_ADDRESS = "POSTAL_ADDRESS",
  BILLING_ADDRESS = "BILLING_ADDRESS",
  VISITING_ADDRESS = "VISITING_ADDRESS",
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

export interface Address {
  /** Address type */
  type?: AddressType;
  streetAddress?: string;
  careOf?: string;
  postalCode?: string;
  town?: string;
  country?: string;
  attention?: string;
}

/** Attachment metadata */
export interface AttachmentMetadata {
  /**
   * The attachment id
   * @format int64
   */
  id?: number;
  /** Attachment category */
  category?: AttachmentCategory;
  /**
   * The attachment filename
   * @minLength 1
   */
  filename: string;
  /**
   * The attachment mime-type
   * @minLength 1
   */
  mimeType: string;
  /** Notes on the attachment */
  note?: string;
}

/** Contract */
export interface Contract {
  /**
   * Version for contract
   * @format int32
   */
  version?: number;
  /** Contract id */
  contractId?: string;
  /** A description  */
  description?: string;
  /** External referenceId */
  externalReferenceId?: string;
  /** Lease type */
  leaseType?: LeaseType;
  /** Municipality id for the contract */
  municipalityId?: string;
  /** Object identity (from Lantmäteriet) */
  objectIdentity?: string;
  /** Status */
  status: Status;
  /** Contract type */
  type: ContractType;
  /** Type of leasehold */
  leasehold?: Leasehold;
  attachmentMetaData?: AttachmentMetadata[];
  additionalTerms?: TermGroup[];
  /** Extra parameters */
  extraParameters?: ExtraParameterGroup[];
  indexTerms?: TermGroup[];
  propertyDesignations?: PropertyDesignation[];
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
   */
  start?: string;
  /**
   * Lease period end date
   * @format date
   */
  end?: string;
  notices?: Notice[];
  /**
   * Leased area (m2)
   * @format int32
   */
  area?: number;
  /** Whether the contract is signed by a witness */
  signedByWitness?: boolean;
  /** Part(s) of property covered by the lease. Described by GeoJSON using polygon(s) */
  areaData?: FeatureCollection;
}

export interface Crs {
  type?: CrsTypeEnum;
  properties?: Record<string, any>;
}

/** Duration */
export interface Duration {
  /**
   * The lease duration value
   * @format int32
   */
  leaseDuration: number;
  /** The unit of the duration value */
  unit: TimeUnit;
}

/** Extension */
export interface Extension {
  /**
   * Marker for whether an agreement should be extended automatically or not
   * @default true
   */
  autoExtend?: boolean;
  /**
   * The lease extension value
   * @format int32
   */
  leaseExtension?: number;
  /** The unit of the extension value */
  unit?: TimeUnit;
}

/** Extra parameter group */
export interface ExtraParameterGroup {
  /** The group name */
  name?: string;
  /** Parameters */
  parameters?: Record<string, string>;
}

export interface Feature {
  properties?: Record<string, any>;
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
  crs?: Crs;
  bbox?: number[];
  id?: string;
}

export interface FeatureCollection {
  crs?: Crs;
  bbox?: number[];
  features?: Feature[];
}

/** Fees */
export interface Fees {
  /** The currency of the lease fees */
  currency?: string;
  /** Yearly fee */
  yearly?: number;
  /** Monthly fee */
  monthly?: number;
  /** Total fee */
  total?: number;
  /** Total fee as text */
  totalAsText?: string;
  /**
   * Index type
   * @example "KPI 80"
   */
  indexType?: string;
  /**
   * Index year
   * @format int32
   */
  indexYear?: number;
  /**
   * Index number
   * @format int32
   */
  indexNumber?: number;
  /**
   * Specifies what proportion of the consumer price index should be used for invoicing.
   * @min 0
   * @max 1
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
  /** How often the lease is invoiced */
  invoiceInterval?: IntervalType;
  /** Invoiced in */
  invoicedIn?: InvoicedIn;
}

/** Leasehold */
export interface Leasehold {
  /** Leasehold type */
  purpose?: LeaseholdType;
  /** description  */
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
  /** The party type */
  party?: Party;
  /**
   * The period of notice
   * @format int32
   */
  periodOfNotice: number;
  /** The unit of the periodOfNotice value */
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

/** PropertyDesignation */
export interface PropertyDesignation {
  /**
   * Name of property designation
   * @maxLength 255
   * @example "SUNDSVALL BALDER 5:1"
   */
  name?: string;
  /**
   * District of property designation
   * @maxLength 255
   * @example "Sundsvall"
   */
  district?: string;
}

export interface Stakeholder {
  /** Type of stakeholder */
  type?: StakeholderType;
  roles?: StakeholderRole[];
  /** Name of the organization */
  organizationName?: string;
  /** Swedish organization number */
  organizationNumber?: string;
  /** Stakeholders first name */
  firstName?: string;
  /** Stakeholders last name */
  lastName?: string;
  /** PartyId */
  partyId?: string;
  /** Phone number for stakeholder */
  phoneNumber?: string;
  /** Email adress for stakeholder */
  emailAddress?: string;
  /** Address for stakeholder */
  address?: Address;
  /** Parameters for the stakeholder */
  parameters?: Parameter[];
}

/** Term */
export interface Term {
  /** Term description */
  description?: string;
  /** Term (name) */
  term?: string;
}

/** Term group */
export interface TermGroup {
  /** The term group header */
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

/** Attachment */
export interface Attachment {
  /** Attachment data, i.e. the file */
  attachmentData: AttachmentData;
  /** Attachment metadata */
  metadata: AttachmentMetadata;
}

/** Attachment content */
export interface AttachmentData {
  /**
   * BASE64-encoded attachment file content
   * @format base64
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
