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
  DAYS = 'DAYS',
  MONTHS = 'MONTHS',
  YEARS = 'YEARS',
}

/** Status */
export enum Status {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  TERMINATED = 'TERMINATED',
}

/** Stakeholder type */
export enum StakeholderType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  ASSOCIATION = 'ASSOCIATION',
  MUNICIPALITY = 'MUNICIPALITY',
  REGION = 'REGION',
  OTHER = 'OTHER',
}

/** Stakeholder role */
export enum StakeholderRole {
  BUYER = 'BUYER',
  CONTACT_PERSON = 'CONTACT_PERSON',
  GRANTOR = 'GRANTOR',
  LAND_RIGHT_OWNER = 'LAND_RIGHT_OWNER',
  LEASEHOLDER = 'LEASEHOLDER',
  PROPERTY_OWNER = 'PROPERTY_OWNER',
  POWER_OF_ATTORNEY_CHECK = 'POWER_OF_ATTORNEY_CHECK',
  POWER_OF_ATTORNEY_ROLE = 'POWER_OF_ATTORNEY_ROLE',
  SELLER = 'SELLER',
  SIGNATORY = 'SIGNATORY',
  PRIMARY_BILLING_PARTY = 'PRIMARY_BILLING_PARTY',
  LESSOR = 'LESSOR',
  LESSEE = 'LESSEE',
}

/** Party */
export enum Party {
  LESSOR = 'LESSOR',
  LESSEE = 'LESSEE',
  ALL = 'ALL',
}

/** Leasehold type */
enum LeaseholdType {
  AGRICULTURE = 'AGRICULTURE',
  APARTMENT = 'APARTMENT',
  BOATING_PLACE = 'BOATING_PLACE',
  BUILDING = 'BUILDING',
  DEPOT = 'DEPOT',
  DWELLING = 'DWELLING',
  LAND_COMPLEMENT = 'LAND_COMPLEMENT',
  LINEUP = 'LINEUP',
  OTHER = 'OTHER',
  PARKING = 'PARKING',
  RECYCLING_STATION = 'RECYCLING_STATION',
  ROAD = 'ROAD',
  SIGNBOARD = 'SIGNBOARD',
  SNOW_DUMP = 'SNOW_DUMP',
  SPORTS_PURPOSE = 'SPORTS_PURPOSE',
  SURFACE_HEAT = 'SURFACE_HEAT',
  TRAIL = 'TRAIL',
}

/** Lease type */
export enum LeaseType {
  LAND_LEASE_RESIDENTIAL = 'LAND_LEASE_RESIDENTIAL',
  SITE_LEASE_COMMERCIAL = 'SITE_LEASE_COMMERCIAL',
  USUFRUCT_HUNTING = 'USUFRUCT_HUNTING',
  USUFRUCT_FARMING = 'USUFRUCT_FARMING',
  USUFRUCT_MISC = 'USUFRUCT_MISC',
  LAND_LEASE_MISC = 'LAND_LEASE_MISC',
  LAND_LEASE_LICENSE = 'LAND_LEASE_LICENSE',
  LAND_LEASE_MUNICIPALITY = 'LAND_LEASE_MUNICIPALITY',
  OTHER_FEE = 'OTHER_FEE',
}

/** Invoiced in */
export enum InvoicedIn {
  ADVANCE = 'ADVANCE',
  ARREARS = 'ARREARS',
}

/** Interval type */
export enum IntervalType {
  YEARLY = 'YEARLY',
  HALF_YEARLY = 'HALF_YEARLY',
  QUARTERLY = 'QUARTERLY',
  MONTHLY = 'MONTHLY',
}

/** Contract type */
export enum ContractType {
  LEASE_AGREEMENT = 'LEASE_AGREEMENT',
  PURCHASE_AGREEMENT = 'PURCHASE_AGREEMENT',
  LAND_LEASE_PUBLIC = 'LAND_LEASE_PUBLIC',
  SHORT_TERM_LEASE_AGREEMENT = 'SHORT_TERM_LEASE_AGREEMENT',
  OBJECT_LEASE = 'OBJECT_LEASE',
  LEASEHOLD = 'LEASEHOLD',
  MAINTENANCE_AGREEMENT = 'MAINTENANCE_AGREEMENT',
}

/** Attachment category */
export enum AttachmentCategory {
  CONTRACT = 'CONTRACT',
  OTHER = 'OTHER',
}

/** Address type */
export enum AddressType {
  POSTAL_ADDRESS = 'POSTAL_ADDRESS',
  BILLING_ADDRESS = 'BILLING_ADDRESS',
  VISITING_ADDRESS = 'VISITING_ADDRESS',
}

interface GeoJsonObject {
  crs?: Crs;
  bbox?: number[];
  type: string;
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
interface AttachmentMetadata {
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
  /**
   * Date when the attachment was created
   * @format date-time
   */
  created?: string;
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
  /** A description of the contract */
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
  /** Extension */
  extension?: Extension;
  /** Fees */
  fees?: Fees;
  /** Invoicing details */
  invoicing?: Invoicing;
  /**
   * Start date of the contract
   * @format date
   */
  startDate?: string;
  /**
   * End date of the contract. Set when the contract is terminated
   * @format date
   */
  endDate?: string;
  /** Notice information */
  notice?: Notice;
  /** Current contract period */
  currentPeriod?: Period;
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

interface Crs {
  type?: CrsTypeEnum;
  properties?: Record<string, any>;
}

/** Extension */
interface Extension {
  /**
   * Marker for whether an agreement should be extended automatically or not
   * @default true
   */
  autoExtend?: boolean;
  /**
   * The lease extension value
   * @format int32
   * @min 0
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

interface Feature {
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

interface FeatureCollection {
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
  /** Index number */
  indexNumber?: number;
  /**
   * Specifies what proportion of the consumer price index should be used for invoicing.
   * @min 0
   * @max 1
   */
  indexationRate?: number;
  /** Additional information. Each entry must be non-blank and between 1 and 30 characters (used as invoice row descriptions). */
  additionalInformation?: string[];
}

type GeometryCollection = GeoJsonObject & {
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
interface Invoicing {
  /** How often the lease is invoiced */
  invoiceInterval: IntervalType;
  /** Invoiced in */
  invoicedIn: InvoicedIn;
}

/** Leasehold */
interface Leasehold {
  /** Leasehold type */
  purpose?: LeaseholdType;
  /** Description of the leasehold */
  description?: string;
  additionalInformation?: string[];
}

type LineString = GeoJsonObject & {
  coordinates?: LngLatAlt[];
};

interface LngLatAlt {
  /** @format double */
  longitude?: number;
  /** @format double */
  latitude?: number;
  /** @format double */
  altitude?: number;
  additionalElements?: number[];
}

type MultiLineString = GeoJsonObject & {
  coordinates?: LngLatAlt[][];
};

type MultiPoint = GeoJsonObject & {
  coordinates?: LngLatAlt[];
};

type MultiPolygon = GeoJsonObject & {
  coordinates?: LngLatAlt[][][];
};

/** Notice information */
interface Notice {
  terms?: NoticeTerm[];
  /**
   * Date when notice was given
   * @format date
   */
  noticeDate?: string;
  /** Party that initiated the notice */
  noticeGivenBy?: Party;
}

/** Notice term */
interface NoticeTerm {
  /** The party type */
  party: Party;
  /**
   * The period of notice
   * @format int32
   * @min 0
   */
  periodOfNotice: number;
  /** The unit of the periodOfNotice value */
  unit: TimeUnit;
}

/** Parameter model */
interface Parameter {
  /**
   * Parameter key
   * @minLength 1
   */
  key: string;
  /** Parameter display name */
  displayName?: string;
  /** Parameter values */
  values?: string[];
}

/** Contract period */
interface Period {
  /**
   * Period start date
   * @format date
   */
  startDate?: string;
  /**
   * Period end date
   * @format date
   */
  endDate?: string;
}

type Point = GeoJsonObject & {
  coordinates?: LngLatAlt;
};

type Polygon = GeoJsonObject & {
  coordinates?: LngLatAlt[][];
};

/** PropertyDesignation */
interface PropertyDesignation {
  /**
   * Name of property designation
   * @minLength 0
   * @maxLength 255
   * @example "SUNDSVALL BALDER 5:1"
   */
  name?: string;
  /**
   * District of property designation
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvall"
   */
  district?: string;
}

export interface Stakeholder {
  /** Type of stakeholder */
  type?: StakeholderType;
  roles?: StakeholderRole[];
  /**
   * Name of the organization
   * @minLength 0
   * @maxLength 255
   */
  organizationName?: string;
  /**
   * Swedish organization number
   * @minLength 0
   * @maxLength 255
   */
  organizationNumber?: string;
  /**
   * Stakeholders first name
   * @minLength 0
   * @maxLength 255
   */
  firstName?: string;
  /**
   * Stakeholders last name
   * @minLength 0
   * @maxLength 255
   */
  lastName?: string;
  /** PartyId */
  partyId?: string;
  /**
   * Phone number for stakeholder
   * @minLength 0
   * @maxLength 255
   */
  phoneNumber?: string;
  /**
   * Email adress for stakeholder
   * @minLength 0
   * @maxLength 255
   */
  emailAddress?: string;
  /** Address for stakeholder */
  address?: Address;
  /** Parameters for the stakeholder */
  parameters?: Parameter[];
}

/** Term */
interface Term {
  /** Term description */
  description?: string;
  /** Term (name) */
  term?: string;
}

/** Term group */
interface TermGroup {
  /** The term group header */
  header?: string;
  terms?: Term[];
}

interface ThrowableProblem {
  /** @format uri */
  type?: string;
  title?: string;
  /** @format int32 */
  status?: number;
  detail?: string;
  /** @format uri */
  instance?: string;
  causeAsProblem?: any;
}

interface Violation {
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
interface AttachmentData {
  /**
   * BASE64-encoded attachment file content
   * @format base64
   */
  content?: string;
}

interface Change {
  type?: ChangeTypeEnum;
  path?: string;
  oldValue?: JsonNode;
  newValue?: JsonNode;
}

interface JsonNode {
  empty?: boolean;
  array?: boolean;
  null?: boolean;
  object?: boolean;
  float?: boolean;
  valueNode?: boolean;
  container?: boolean;
  missingNode?: boolean;
  nodeType?: JsonNodeNodeTypeEnum;
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
  binary?: boolean;
  string?: boolean;
  boolean?: boolean;
  number?: boolean;
  embeddedValue?: boolean;
}

export interface PageContract {
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  size?: number;
  content?: Contract[];
  /** @format int32 */
  number?: number;
  first?: boolean;
  last?: boolean;
  pageable?: PageableObject;
  /** @format int32 */
  numberOfElements?: number;
  sort?: SortObject;
  empty?: boolean;
}

interface PageableObject {
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

interface SortObject {
  empty?: boolean;
  sorted?: boolean;
  unsorted?: boolean;
}

enum CrsTypeEnum {
  Name = 'name',
  Link = 'link',
}

enum ChangeTypeEnum {
  ADDITION = 'ADDITION',
  REMOVAL = 'REMOVAL',
  MODIFICATION = 'MODIFICATION',
}

enum JsonNodeNodeTypeEnum {
  ARRAY = 'ARRAY',
  BINARY = 'BINARY',
  BOOLEAN = 'BOOLEAN',
  MISSING = 'MISSING',
  NULL = 'NULL',
  NUMBER = 'NUMBER',
  OBJECT = 'OBJECT',
  POJO = 'POJO',
  STRING = 'STRING',
}
