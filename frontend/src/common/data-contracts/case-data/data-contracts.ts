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

export interface Status {
  /**
   * The type of status
   * @minLength 0
   * @maxLength 255
   * @example "Ärende inkommit"
   */
  statusType?: string;
  /**
   * Description of the status
   * @minLength 0
   * @maxLength 255
   * @example "Ärende har kommit in från e-tjänsten."
   */
  description?: string;
  /**
   * The date and time when the status was recorded
   * @format date-time
   * @example "2023-01-01T12:00:00Z"
   */
  dateTime?: string;
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

/** A stakeholder may have one or more addresses. For example, one POSTAL_ADDRESS and another INVOICE_ADDRESS. */
export interface Address {
  /**
   * Category of the address
   * @example "RESIDENTIAL"
   */
  addressCategory?: AddressAddressCategoryEnum;
  /**
   * Street name
   * @minLength 0
   * @maxLength 255
   * @example "Testvägen"
   */
  street?: string;
  /**
   * House number
   * @minLength 0
   * @maxLength 255
   * @example "18"
   */
  houseNumber?: string;
  /**
   * Postal code
   * @minLength 0
   * @maxLength 255
   * @example "123 45"
   */
  postalCode?: string;
  /**
   * City name
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvall"
   */
  city?: string;
  /**
   * Country name
   * @minLength 0
   * @maxLength 255
   * @example "Sverige"
   */
  country?: string;
  /**
   * Care of (c/o)
   * @minLength 0
   * @maxLength 255
   * @example "Test Testorsson"
   */
  careOf?: string;
  /**
   * Attention to
   * @minLength 0
   * @maxLength 255
   * @example "Test Testorsson"
   */
  attention?: string;
  /**
   * Property designation
   * @minLength 0
   * @maxLength 255
   * @example "SUNDSVALL LJUSTA 7:2"
   */
  propertyDesignation?: string;
  /**
   * Apartment number
   * @minLength 0
   * @maxLength 255
   * @example "LGH 1001"
   */
  apartmentNumber?: string;
  /**
   * Indicates if the address is within a zoning plan area
   * @example true
   */
  isZoningPlanArea?: boolean;
  /**
   * Invoice marking, only in combination with addressCategory: INVOICE_ADDRESS
   * @minLength 0
   * @maxLength 255
   * @example "1234567890"
   */
  invoiceMarking?: string;
  /** The location of the address */
  location?: Coordinates;
}

/** The contact information of the stakeholder */
export interface ContactInformation {
  /**
   * The type of contact information
   * @example "EMAIL"
   */
  contactType?: ContactInformationContactTypeEnum;
  /**
   * The value of the contact information
   * @minLength 0
   * @maxLength 255
   * @example "someEmail@sundsvall.se@"
   */
  value?: string;
}

/**
 * The location of the address
 * @example {"latitude":62.3908,"longitude":17.3069}
 */
export interface Coordinates {
  /**
   * Decimal Degrees (DD)
   * @format double
   * @example 62.390205
   */
  latitude?: number;
  /**
   * Decimal Degrees (DD)
   * @format double
   * @example 17.306616
   */
  longitude?: number;
}

export interface Stakeholder {
  /**
   * The unique identifier of the stakeholder
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * The version of the stakeholder
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "my.namespace"
   */
  namespace?: string;
  /**
   * The type of stakeholder
   * @example "PERSON"
   */
  type: StakeholderTypeEnum;
  /**
   * The first name of the stakeholder
   * @minLength 0
   * @maxLength 255
   * @example "Test"
   */
  firstName?: string;
  /**
   * The last name of the stakeholder
   * @minLength 0
   * @maxLength 255
   * @example "Testorsson"
   */
  lastName?: string;
  /**
   * The person ID of the stakeholder
   * @example "3ed5bc30-6308-4fd5-a5a7-78d7f96f4438"
   */
  personId?: string;
  /**
   * The organization name of the stakeholder
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvalls testfabrik"
   */
  organizationName?: string;
  /**
   * Organization number with 10 or 12 digits.
   * @minLength 0
   * @maxLength 13
   * @pattern ^((18|19|20|21)\d{6}|\d{6})-(\d{4})$
   * @example "19901010-1234"
   */
  organizationNumber?: string;
  /**
   * The authorized signatory of the stakeholder
   * @minLength 0
   * @maxLength 255
   * @example "Test Testorsson"
   */
  authorizedSignatory?: string;
  /**
   * The AD-account of the stakeholder
   * @minLength 0
   * @maxLength 36
   * @example "user"
   */
  adAccount?: string;
  /** A stakeholder can have one or more roles. */
  roles: string[];
  /** A stakeholder may have one or more addresses. For example, one POSTAL_ADDRESS and another INVOICE_ADDRESS. */
  addresses?: Address[];
  /** The contact information of the stakeholder */
  contactInformation?: ContactInformation[];
  /**
   * Additional parameters for the stakeholder
   * @example {"key1":"value1","key2":"value2"}
   */
  extraParameters?: Record<string, string>;
  /**
   * The timestamp when the stakeholder was created
   * @format date-time
   * @example "2023-01-01T12:00:00Z"
   */
  created?: string;
  /**
   * The timestamp when the stakeholder was last updated
   * @format date-time
   * @example "2023-01-02T12:00:00Z"
   */
  updated?: string;
}

export interface Facility {
  /**
   * The id of the facility
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * The version of the facility
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "my.namespace"
   */
  namespace?: string;
  /**
   * Description of the facility
   * @minLength 0
   * @maxLength 255
   * @example "En fritextbeskrivning av facility."
   */
  description?: string;
  /** A stakeholder may have one or more addresses. For example, one POSTAL_ADDRESS and another INVOICE_ADDRESS. */
  address?: Address;
  /**
   * The name on the sign
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvalls testfabrik"
   */
  facilityCollectionName?: string;
  /**
   * Is this the main facility for the case?
   * @example true
   */
  mainFacility?: boolean;
  /**
   * Type of the facility
   * @example "INDUSTRIAL"
   */
  facilityType?: string;
  /**
   * Date and time when the facility was created
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  created?: string;
  /**
   * Date and time when the facility was last updated
   * @format date-time
   * @example "2023-10-02T12:00:00Z"
   */
  updated?: string;
  /**
   * Extra parameters
   * @example {"key1":"value1","key2":"value2"}
   */
  extraParameters?: Record<string, string>;
}

/** List of attachments related to the decision */
export interface Attachment {
  /**
   * The id of the attachment
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * The version of the attachment
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "my.namespace"
   */
  namespace?: string;
  /**
   * The date when this attachment was created
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  created?: string;
  /**
   * The date when this attachment was last updated
   * @format date-time
   * @example "2023-10-02T12:00:00Z"
   */
  updated?: string;
  /**
   * Category of the attachment
   * @example "DOCUMENT"
   */
  category?: string;
  /**
   * Name of the attachment
   * @example "Test Document"
   */
  name?: string;
  /**
   * Note about the attachment
   * @example "This is a test document."
   */
  note?: string;
  /**
   * File extension of the attachment
   * @example "pdf"
   */
  extension?: string;
  /**
   * MIME type of the attachment
   * @example "application/pdf"
   */
  mimeType?: string;
  /**
   * Base64 encoded file content
   * @example "dGVzdCBjb250ZW50"
   */
  file?: string;
  /**
   * Errand number associated with the attachment
   * @example "ERR123456"
   */
  errandNumber?: string;
  /**
   * Additional parameters for the attachment
   * @example {"key1":"value1","key2":"value2"}
   */
  extraParameters?: Record<string, string>;
}

export interface Decision {
  /**
   * The id of the decision
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * The version of the decision
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "my.namespace"
   */
  namespace?: string;
  /**
   * Type of the decision
   * @example "APPROVAL"
   */
  decisionType?: DecisionDecisionTypeEnum;
  /**
   * Outcome of the decision
   * @example "GRANTED"
   */
  decisionOutcome?: DecisionDecisionOutcomeEnum;
  /**
   * Description of the decision
   * @minLength 0
   * @maxLength 100000
   * @example "This decision approves the application."
   */
  description?: string;
  /** List of laws related to the decision */
  law?: Law[];
  decidedBy?: Stakeholder;
  /**
   * Date and time when the decision was made
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  decidedAt?: string;
  /**
   * Date and time when the decision becomes valid
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  validFrom?: string;
  /**
   * Date and time when the decision expires
   * @format date-time
   * @example "2024-10-01T12:00:00Z"
   */
  validTo?: string;
  /** List of attachments related to the decision */
  attachments?: Attachment[];
  /**
   * Additional parameters for the decision
   * @example {"key1":"value1","key2":"value2"}
   */
  extraParameters?: Record<string, string>;
  /**
   * Date and time when the decision was created
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  created?: string;
  /**
   * Date and time when the decision was last updated
   * @format date-time
   * @example "2023-10-02T12:00:00Z"
   */
  updated?: string;
}

/** List of laws related to the decision */
export interface Law {
  /**
   * Heading of the law
   * @minLength 0
   * @maxLength 255
   * @example "Building Act"
   */
  heading?: string;
  /**
   * Swedish Code of Statutes (SFS)
   * @minLength 0
   * @maxLength 255
   * @example "SFS 2010:900"
   */
  sfs?: string;
  /**
   * Chapter of the law
   * @minLength 0
   * @maxLength 255
   * @example "3"
   */
  chapter?: string;
  /**
   * Article of the law
   * @minLength 0
   * @maxLength 255
   * @example "1"
   */
  article?: string;
}

export interface Appeal {
  /**
   * The id of the appeal
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * The version of the appeal.
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "my.namespace"
   */
  namespace?: string;
  /**
   * Description of the appeal
   * @minLength 0
   * @maxLength 100000
   * @example "Some description of the appeal."
   */
  description?: string;
  /**
   * The date when this appeal was first registered (timestamp from e-service, mail or letter)
   * @format date-time
   */
  registeredAt?: string;
  /**
   * The date when the decision or corresponding that this appeal concerns was sent out
   * @format date-time
   */
  appealConcernCommunicatedAt?: string;
  /**
   * Current status for this appeal. Values [NEW, REJECTED, SENT_TO_COURT, COMPLETED]
   * @default "NEW"
   */
  status?: string;
  /**
   * Status of whether measures have been taken within statutory time limits. Values: [NOT_CONDUCTED, NOT_RELEVANT, APPROVED, REJECTED]
   * @default "NOT_CONDUCTED"
   */
  timelinessReview?: string;
  /**
   * Id for decision that is appealed
   * @format int64
   */
  decisionId?: number | null;
  /**
   * The date when this appeal was created
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  created?: string;
  /**
   * The date when this appeal was last updated
   * @format date-time
   * @example "2023-10-02T12:00:00Z"
   */
  updated?: string;
}

export interface Notification {
  /**
   * Unique identifier for the notification
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id?: string;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "my.namespace"
   */
  namespace?: string;
  /**
   * Timestamp when the notification was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the notification was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
  /**
   * Name of the owner of the notification
   * @example "Test Testorsson"
   */
  ownerFullName?: string;
  /**
   * Owner id of the notification
   * @example "AD01"
   */
  ownerId: string;
  /**
   * User who created the notification
   * @example "TestUser"
   */
  createdBy?: string;
  /**
   * Full name of the user who created the notification
   * @example "Test Testorsson"
   */
  createdByFullName?: string;
  /**
   * Type of the notification
   * @example "CREATE"
   */
  type: string;
  /**
   * Description of the notification
   * @example "Some description of the notification"
   */
  description: string;
  /**
   * Content of the notification
   * @example "Some content of the notification"
   */
  content?: string;
  /**
   * Timestamp when the notification expires
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  expires?: string;
  /**
   * Acknowledged status of the notification
   * @example true
   */
  acknowledged?: boolean;
  /**
   * Global acknowledged status of the notification
   * @example true
   */
  globalAcknowledged?: boolean;
  /**
   * Errand id of the notification
   * @format int64
   * @example 1234
   */
  errandId: number;
  /**
   * Errand number of the notification
   * @example "PRH-2022-000001"
   */
  errandNumber?: string;
}

export interface Errand {
  /**
   * The id of the errand
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * The version of the errand
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * Errand number
   * @example "PRH-2022-000001"
   */
  errandNumber?: string;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "my.namespace"
   */
  namespace?: string;
  /**
   * Case ID from the client
   * @minLength 0
   * @maxLength 255
   * @example "caa230c6-abb4-4592-ad9a-34e263c2787b"
   */
  externalCaseId?: string;
  /**
   * Type of the case
   * @example "BUILDING_PERMIT"
   */
  caseType?: string;
  /**
   * How the errand was created
   * @example "EMAIL"
   */
  channel?: ErrandChannelEnum;
  /**
   * Priority of the errand
   * @default "MEDIUM"
   * @example "HIGH"
   */
  priority?: ErrandPriorityEnum;
  /**
   * Description of the errand
   * @minLength 0
   * @maxLength 8192
   * @example "Some description of the case."
   */
  description?: string;
  /**
   * Additions to the case title. Right now only applicable to cases of CaseType: NYBYGGNAD_ANSOKAN_OM_BYGGLOV.
   * @minLength 0
   * @maxLength 255
   * @example "Eldstad/rökkanal, Skylt"
   */
  caseTitleAddition?: string;
  /**
   * Diary number
   * @minLength 0
   * @maxLength 255
   * @example "DIA123456"
   */
  diaryNumber?: string;
  /**
   * Phase of the errand
   * @minLength 0
   * @maxLength 255
   * @example "Aktualisering"
   */
  phase?: string;
  /** The statuses connected to the errand */
  statuses?: Status[];
  /**
   * Start date for the business
   * @format date
   * @example "2022-01-01"
   */
  startDate?: string;
  /**
   * End date of the business if it is time-limited
   * @format date
   * @example "2022-06-01"
   */
  endDate?: string;
  /**
   * The time the application was received
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  applicationReceived?: string;
  /**
   * Process-ID from ProcessEngine
   * @example "c3cb9123-4ed2-11ed-ac7c-0242ac110003"
   */
  processId?: string;
  /** The applicant and other stakeholders connected to the errand */
  stakeholders?: Stakeholder[];
  /** The facilities connected to the errand */
  facilities?: Facility[];
  /** The decisions connected to the errand */
  decisions?: Decision[];
  /** The appeals connected to the errand */
  appeals?: Appeal[];
  /** The notes connected to the errand */
  notes?: Note[];
  /** Messages connected to this errand. Get message information from Message-API */
  messageIds?: string[];
  /** The client who created the errand. WSO2-username */
  createdByClient?: string;
  /** The most recent client who updated the errand. WSO2-username */
  updatedByClient?: string;
  /** The user who created the errand */
  createdBy?: string;
  /** The most recent user who updated the errand */
  updatedBy?: string;
  /** Suspension information */
  suspension?: Suspension;
  /** Extra parameters for the errand */
  extraParameters?: ExtraParameter[];
  /**
   * Date and time when the errand was created
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  created?: string;
  /**
   * Date and time when the errand was last updated
   * @format date-time
   * @example "2023-10-02T12:00:00Z"
   */
  updated?: string;
}

/** Extra parameters for the errand */
export interface ExtraParameter {
  /** Parameter key */
  key: string;
  /** Parameter display name */
  displayName?: string;
  /** Parameter values */
  values?: string[];
}

/** The notes connected to the errand */
export interface Note {
  /**
   * The unique identifier of the note
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * The version of the note
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "my.namespace"
   */
  namespace?: string;
  /**
   * The title of the note
   * @minLength 0
   * @maxLength 255
   * @example "Motivering till bifall"
   */
  title?: string;
  /**
   * The content of the note
   * @minLength 0
   * @maxLength 10000
   * @example "Den sökande har rätt till parkeringstillstånd eftersom alla kriterier uppfylls."
   */
  text?: string;
  /**
   * AD-account for the user who created the note
   * @minLength 0
   * @maxLength 36
   * @example "user"
   */
  createdBy?: string;
  /**
   * AD-account for the user who last modified the note
   * @minLength 0
   * @maxLength 36
   * @example "user"
   */
  updatedBy?: string;
  /** The type of note */
  noteType?: NoteType;
  /** Additional parameters for the note */
  extraParameters?: Record<string, string>;
  /**
   * The timestamp when the note was created
   * @format date-time
   * @example "2023-01-01T12:00:00Z"
   */
  created?: string;
  /**
   * The timestamp when the note was last updated
   * @format date-time
   * @example "2023-01-02T12:00:00Z"
   */
  updated?: string;
}

/**
 * The type of note
 * @example "INTERNAL"
 */
export enum NoteType {
  INTERNAL = 'INTERNAL',
  PUBLIC = 'PUBLIC',
}

/** Suspension information */
export interface Suspension {
  /**
   * Timestamp when the suspension wears off
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  suspendedTo?: string;
  /**
   * Timestamp when the suspension started
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  suspendedFrom?: string;
}

/** Message classification */
export enum Classification {
  INFORMATION = 'INFORMATION',
  COMPLETION_REQUEST = 'COMPLETION_REQUEST',
  OBTAIN_OPINION = 'OBTAIN_OPINION',
  INTERNAL_COMMUNICATION = 'INTERNAL_COMMUNICATION',
  OTHER = 'OTHER',
}

/** List of email headers on the message */
export interface EmailHeader {
  /** An email header */
  header?: Header;
  /**
   * The value of the email header
   * @example "[<this-is-a-test@domain.com>]"
   */
  values?: string[];
}

/**
 * An email header
 * @example "MESSAGE_ID"
 */
export enum Header {
  IN_REPLY_TO = 'IN_REPLY_TO',
  REFERENCES = 'REFERENCES',
  MESSAGE_ID = 'MESSAGE_ID',
}

/** MessageResponse */
export interface MessageAttachment {
  /**
   * The attachment (file) content as a BASE64-encoded string
   * @example "aGVsbG8gd29ybGQK"
   */
  content: string;
  /**
   * The attachment filename
   * @example "test.txt"
   */
  name: string;
  /**
   * The attachment content type
   * @example "text/plain"
   */
  contentType?: string;
}

export interface MessageRequest {
  /**
   * The message ID
   * @example "12"
   */
  messageId?: string;
  /**
   * The errand number
   * @example "PRH-2022-000001"
   */
  errandNumber?: string;
  /**
   * If the message is inbound or outbound from the perspective of case-data/e-service.
   * @example "INBOUND"
   */
  direction?: MessageRequestDirectionEnum;
  /**
   * The E-service ID that the message was created in
   * @example "12"
   */
  familyId?: string;
  /**
   * OpenE caseID
   * @example "12"
   */
  externalCaseId?: string;
  /**
   * The message
   * @example "Hello world"
   */
  message?: string;
  /**
   * The time the message was sent
   * @example "2020-01-01 12:00:00"
   */
  sent?: string;
  /**
   * The email-subject of the message
   * @example "Hello world"
   */
  subject?: string;
  /**
   * The username of the user that sent the message
   * @example "username"
   */
  username?: string;
  /**
   * The first name of the user that sent the message
   * @example "Kalle"
   */
  firstName?: string;
  /**
   * The last name of the user that sent the message
   * @example "Anka"
   */
  lastName?: string;
  /**
   * The message was delivered by
   * @example "EMAIL"
   */
  messageType?: string;
  /**
   * The mobile number of the recipient
   * @example "+46701234567"
   */
  mobileNumber?: string;
  /**
   * The email of the user that sent the message
   * @example "kalle.anka@ankeborg.se"
   */
  email?: string;
  /**
   * The user ID of the user that sent the message
   * @example "12"
   */
  userId?: string;
  /** Message classification */
  classification?: Classification;
  /** List of attachmentRequests on the message */
  attachmentRequests?: MessageAttachment[];
  /** List of email headers on the message */
  emailHeaders?: EmailHeader[];
}

export interface PatchErrand {
  /**
   * Case ID from the client.
   * @minLength 0
   * @maxLength 255
   * @example "caa230c6-abb4-4592-ad9a-34e263c2787b"
   */
  externalCaseId?: string;
  /**
   * The type of case
   * @example "PARKING_PERMIT"
   */
  caseType?: PatchErrandCaseTypeEnum;
  /**
   * The priority of the case
   * @example "MEDIUM"
   */
  priority?: PatchErrandPriorityEnum;
  /**
   * Description of the case
   * @minLength 0
   * @maxLength 255
   * @example "Some description of the case."
   */
  description?: string;
  /**
   * Additions to the case title. Right now only applicable to cases of CaseType: NYBYGGNAD_ANSOKAN_OM_BYGGLOV.
   * @minLength 0
   * @maxLength 255
   * @example "Eldstad/rökkanal, Skylt"
   */
  caseTitleAddition?: string;
  /**
   * Diary number of the case
   * @minLength 0
   * @maxLength 255
   * @example "D123456"
   */
  diaryNumber?: string;
  /**
   * Phase of the case
   * @minLength 0
   * @maxLength 255
   * @example "Aktualisering"
   */
  phase?: string;
  /** The facilities in the case */
  facilities?: Facility[];
  /**
   * Start date for the business.
   * @format date
   * @example "2022-01-01"
   */
  startDate?: string;
  /**
   * End date of the business if it is time-limited.
   * @format date
   * @example "2022-06-01"
   */
  endDate?: string;
  /** Suspension information */
  suspension?: Suspension;
  /**
   * The time the application was received.
   * @format date-time
   * @example "2022-01-01T12:00:00Z"
   */
  applicationReceived?: string;
  /** Extra parameters for the errand */
  extraParameters?: ExtraParameter[];
}

export interface PatchDecision {
  /**
   * The type of decision
   * @example "APPROVAL"
   */
  decisionType?: PatchDecisionDecisionTypeEnum;
  /**
   * The outcome of the decision
   * @example "GRANTED"
   */
  decisionOutcome?: PatchDecisionDecisionOutcomeEnum;
  /**
   * Description of the decision
   * @minLength 0
   * @maxLength 1000
   * @example "The application has been approved."
   */
  description?: string;
  /**
   * The date and time when the decision was made
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  decidedAt?: string;
  /**
   * The date and time when the decision becomes valid
   * @format date-time
   * @example "2023-10-01T12:00:00Z"
   */
  validFrom?: string;
  /**
   * The date and time when the decision expires
   * @format date-time
   * @example "2023-12-31T12:00:00Z"
   */
  validTo?: string;
  /**
   * Additional parameters for the decision
   * @example {"key1":"value1","key2":"value2"}
   */
  extraParameters?: Record<string, string>;
}

export interface PatchAppeal {
  /**
   * Description of the appeal
   * @minLength 0
   * @maxLength 100000
   * @example "The decision is not correct"
   */
  description?: string;
  /**
   * Current status for this appeal. Values [NEW, REJECTED, SENT_TO_COURT, COMPLETED]
   * @default "NEW"
   */
  status?: string;
  /**
   * Status of whether measures have been taken within statutory time limits. Values: [NOT_CONDUCTED, NOT_RELEVANT, APPROVED, REJECTED]
   * @default "NOT_CONDUCTED"
   */
  timelinessReview?: string;
}

export interface GetParkingPermit {
  /**
   * The permit number of the artefact
   * @example "PARK123456"
   */
  artefactPermitNumber?: string;
  /**
   * The status of the artefact permit
   * @example "ACTIVE"
   */
  artefactPermitStatus?: string;
  /**
   * The ID of the associated errand
   * @format int64
   * @example 1
   */
  errandId?: number;
  errandDecision?: Decision;
}

/** List of attachments on the message */
export interface AttachmentResponse {
  /**
   * The attachment ID
   * @example "aGVsbG8gd29ybGQK"
   */
  attachmentId: string;
  /**
   * The attachment filename
   * @example "test.txt"
   */
  name: string;
  /**
   * The attachment content type
   * @example "text/plain"
   */
  contentType?: string;
}

export interface PageErrand {
  /** @format int32 */
  totalPages?: number;
  /** @format int64 */
  totalElements?: number;
  pageable?: PageableObject;
  /** @format int32 */
  size?: number;
  content?: Errand[];
  /** @format int32 */
  number?: number;
  sort?: SortObject[];
  /** @format int32 */
  numberOfElements?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface PageableObject {
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  pageSize?: number;
  paged?: boolean;
  /** @format int64 */
  offset?: number;
  sort?: SortObject[];
  unpaged?: boolean;
}

export interface SortObject {
  direction?: string;
  nullHandling?: string;
  ascending?: boolean;
  property?: string;
  ignoreCase?: boolean;
}

/**
 * Category of the address
 * @example "RESIDENTIAL"
 */
export enum AddressAddressCategoryEnum {
  POSTAL_ADDRESS = 'POSTAL_ADDRESS',
  INVOICE_ADDRESS = 'INVOICE_ADDRESS',
  VISITING_ADDRESS = 'VISITING_ADDRESS',
}

/**
 * The type of contact information
 * @example "EMAIL"
 */
export enum ContactInformationContactTypeEnum {
  CELLPHONE = 'CELLPHONE',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
}

/**
 * The type of stakeholder
 * @example "PERSON"
 */
export enum StakeholderTypeEnum {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
}

/**
 * Type of the decision
 * @example "APPROVAL"
 */
export enum DecisionDecisionTypeEnum {
  RECOMMENDED = 'RECOMMENDED',
  PROPOSED = 'PROPOSED',
  FINAL = 'FINAL',
}

/**
 * Outcome of the decision
 * @example "GRANTED"
 */
export enum DecisionDecisionOutcomeEnum {
  APPROVAL = 'APPROVAL',
  REJECTION = 'REJECTION',
  DISMISSAL = 'DISMISSAL',
  CANCELLATION = 'CANCELLATION',
}

/**
 * How the errand was created
 * @example "EMAIL"
 */
export enum ErrandChannelEnum {
  ESERVICE = 'ESERVICE',
  EMAIL = 'EMAIL',
  WEB_UI = 'WEB_UI',
  MOBILE = 'MOBILE',
  SYSTEM = 'SYSTEM',
}

/**
 * Priority of the errand
 * @default "MEDIUM"
 * @example "HIGH"
 */
export enum ErrandPriorityEnum {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * If the message is inbound or outbound from the perspective of case-data/e-service.
 * @example "INBOUND"
 */
export enum MessageRequestDirectionEnum {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

/**
 * The type of case
 * @example "PARKING_PERMIT"
 */
export enum PatchErrandCaseTypeEnum {
  NYBYGGNAD_ANSOKAN_OM_BYGGLOV = 'NYBYGGNAD_ANSOKAN_OM_BYGGLOV',
  ANMALAN_ATTEFALL = 'ANMALAN_ATTEFALL',
  REGISTRERING_AV_LIVSMEDEL = 'REGISTRERING_AV_LIVSMEDEL',
  ANMALAN_INSTALLATION_VARMEPUMP = 'ANMALAN_INSTALLATION_VARMEPUMP',
  ANSOKAN_TILLSTAND_VARMEPUMP = 'ANSOKAN_TILLSTAND_VARMEPUMP',
  ANSOKAN_OM_TILLSTAND_ENSKILT_AVLOPP = 'ANSOKAN_OM_TILLSTAND_ENSKILT_AVLOPP',
  ANMALAN_INSTALLATION_ENSKILT_AVLOPP_UTAN_WC = 'ANMALAN_INSTALLATION_ENSKILT_AVLOPP_UTAN_WC',
  ANMALAN_ANDRING_AVLOPPSANLAGGNING = 'ANMALAN_ANDRING_AVLOPPSANLAGGNING',
  ANMALAN_ANDRING_AVLOPPSANORDNING = 'ANMALAN_ANDRING_AVLOPPSANORDNING',
  ANMALAN_HALSOSKYDDSVERKSAMHET = 'ANMALAN_HALSOSKYDDSVERKSAMHET',
  PARKING_PERMIT = 'PARKING_PERMIT',
  PARKING_PERMIT_RENEWAL = 'PARKING_PERMIT_RENEWAL',
  LOST_PARKING_PERMIT = 'LOST_PARKING_PERMIT',
  MEX_LEASE_REQUEST = 'MEX_LEASE_REQUEST',
  MEX_BUY_LAND_FROM_THE_MUNICIPALITY = 'MEX_BUY_LAND_FROM_THE_MUNICIPALITY',
  MEX_SELL_LAND_TO_THE_MUNICIPALITY = 'MEX_SELL_LAND_TO_THE_MUNICIPALITY',
  MEX_APPLICATION_SQUARE_PLACE = 'MEX_APPLICATION_SQUARE_PLACE',
  MEX_BUY_SMALL_HOUSE_PLOT = 'MEX_BUY_SMALL_HOUSE_PLOT',
  MEX_APPLICATION_FOR_ROAD_ALLOWANCE = 'MEX_APPLICATION_FOR_ROAD_ALLOWANCE',
  MEX_UNAUTHORIZED_RESIDENCE = 'MEX_UNAUTHORIZED_RESIDENCE',
  MEX_LAND_RIGHT = 'MEX_LAND_RIGHT',
  MEX_EARLY_DIALOG_PLAN_NOTIFICATION = 'MEX_EARLY_DIALOG_PLAN_NOTIFICATION',
  MEX_PROTECTIVE_HUNTING = 'MEX_PROTECTIVE_HUNTING',
  MEX_LAND_INSTRUCTION = 'MEX_LAND_INSTRUCTION',
  MEX_OTHER = 'MEX_OTHER',
  MEX_LAND_SURVEYING_OFFICE = 'MEX_LAND_SURVEYING_OFFICE',
  MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE = 'MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE',
  MEX_INVOICE = 'MEX_INVOICE',
  MEX_REQUEST_FOR_PUBLIC_DOCUMENT = 'MEX_REQUEST_FOR_PUBLIC_DOCUMENT',
  MEX_TERMINATION_OF_LEASE = 'MEX_TERMINATION_OF_LEASE',
  MEX_TERMINATION_OF_HUNTING_LEASE = 'MEX_TERMINATION_OF_HUNTING_LEASE',
  MEX_FORWARDED_FROM_CONTACTSUNDSVALL = 'MEX_FORWARDED_FROM_CONTACTSUNDSVALL',
}

/**
 * The priority of the case
 * @example "MEDIUM"
 */
export enum PatchErrandPriorityEnum {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * The type of decision
 * @example "APPROVAL"
 */
export enum PatchDecisionDecisionTypeEnum {
  RECOMMENDED = 'RECOMMENDED',
  PROPOSED = 'PROPOSED',
  FINAL = 'FINAL',
}

/**
 * The outcome of the decision
 * @example "GRANTED"
 */
export enum PatchDecisionDecisionOutcomeEnum {
  APPROVAL = 'APPROVAL',
  REJECTION = 'REJECTION',
  DISMISSAL = 'DISMISSAL',
  CANCELLATION = 'CANCELLATION',
}

/**
 * If the message is inbound or outbound from the perspective of case-data/e-service.
 * @example "INBOUND"
 */
export enum MessageResponseDirectionEnum {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}
