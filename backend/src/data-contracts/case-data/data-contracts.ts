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
 * ConversationType model
 * @example "INTERNAL"
 */
export enum ConversationType {
  INTERNAL = "INTERNAL",
  EXTERNAL = "EXTERNAL",
}

/**
 * An email header
 * @example "MESSAGE_ID"
 */
export enum Header {
  IN_REPLY_TO = "IN_REPLY_TO",
  REFERENCES = "REFERENCES",
  MESSAGE_ID = "MESSAGE_ID",
}

/** Message classification */
export enum Classification {
  INFORMATION = "INFORMATION",
  COMPLETION_REQUEST = "COMPLETION_REQUEST",
  OBTAIN_OPINION = "OBTAIN_OPINION",
  INTERNAL_COMMUNICATION = "INTERNAL_COMMUNICATION",
  OTHER = "OTHER",
}

/**
 * The type of note
 * @example "INTERNAL"
 */
export enum NoteType {
  INTERNAL = "INTERNAL",
  PUBLIC = "PUBLIC",
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
   * @example "MY_NAMESPACE"
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
   * @example "MY_NAMESPACE"
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
   * Errand id associated with the attachment
   * @format int64
   * @example 123456
   */
  errandId?: number;
  /**
   * Namespace
   * @example "MY_NAMESPACE"
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
   * @example "MY_NAMESPACE"
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
   * @example "MY_NAMESPACE"
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
  status?: Status;
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
  /** List of notifications connected to this errand */
  notifications?: Notification[];
  /** The decisions connected to the errand */
  decisions?: Decision[];
  /** The notes connected to the errand */
  notes?: Note[];
  /** Messages connected to this errand. Get message information from Message-API */
  messageIds?: string[];
  /**
   * List of labels for the errand
   * @example ["label1","label2"]
   */
  labels?: string[];
  /** Other errands related to the errand */
  relatesTo?: RelatedErrand[];
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
   * @example "MY_NAMESPACE"
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

/** List of notifications connected to this errand */
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
   * @example "MY_NAMESPACE"
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
   * @minLength 1
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
   * @minLength 1
   * @example "CREATE"
   */
  type: string;
  /**
   * Sub type of the notification
   * @example "PHASE_CHANGE"
   */
  subType?: string;
  /**
   * Description of the notification
   * @minLength 1
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
   * Acknowledged status of the notification (global level). I.e. this notification is acknowledged by anyone.
   * @example true
   */
  globalAcknowledged?: boolean;
  /**
   * Errand id of the notification
   * @format int64
   * @example 1234
   */
  errandId?: number;
  /**
   * Errand number of the notification
   * @example "PRH-2022-000001"
   */
  errandNumber?: string;
}

/** Related errand for errand */
export interface RelatedErrand {
  /**
   * Errand id
   * @format int64
   * @example 123
   */
  errandId?: number;
  /**
   * Errand number
   * @example "PRH-2022-000001"
   */
  errandNumber: string;
  /**
   * Relation reason
   * @example "Related because of appealed decision on errand"
   */
  relationReason?: string;
}

/** The statuses connected to the errand */
export interface Status {
  /**
   * The type of status
   * @minLength 0
   * @maxLength 255
   * @example "Ärende inkommit"
   */
  statusType: string;
  /**
   * Description of the status
   * @minLength 0
   * @maxLength 255
   * @example "Ärende har kommit in från e-tjänsten."
   */
  description?: string;
  /**
   * The date and time when the status was created
   * @format date-time
   * @example "2023-01-01T12:00:00Z"
   */
  created?: string;
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

/** List of email headers on the message */
export interface EmailHeader {
  /** An email header */
  header?: Header;
  /**
   * The value of the email header
   * @example ["<this-is-a-test@domain.com>"]
   */
  values?: string[];
}

/** MessageResponse */
export interface MessageAttachment {
  /**
   * The attachment (file) content as a BASE64-encoded string
   * @minLength 1
   * @example "aGVsbG8gd29ybGQK"
   */
  content: string;
  /**
   * The attachment filename
   * @minLength 1
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
   * List of email recipients
   * @example ["kalle.anka@ankeborg.se"]
   */
  recipients?: string[];
  /**
   * The user ID of the user that sent the message
   * @example "12"
   */
  userId?: string;
  /** Message classification */
  classification?: Classification;
  /** List of attachments on the message */
  attachments?: MessageAttachment[];
  /** List of email headers on the message */
  emailHeaders?: EmailHeader[];
  /**
   * Is message internal
   * @example true
   */
  internal?: boolean;
}

/** Conversation model */
export interface Conversation {
  /**
   * Conversation ID
   * @example "1aefbbb8-de82-414b-b5d7-ba7c5bbe4506"
   */
  id?: string;
  /**
   * The message-exchange topic
   * @minLength 1
   * @example "The conversation topic"
   */
  topic: string;
  /** ConversationType model */
  type: ConversationType;
  relationIds?: string[];
  participants?: Identifier[];
  metadata?: KeyValues[];
}

/** Identifier model */
export interface Identifier {
  /**
   * The conversation identifier type
   * @pattern ^(adAccount|partyId)$
   * @example "adAccount"
   */
  type?: string;
  /**
   * The conversation identifier value
   * @minLength 1
   * @example "joe01doe"
   */
  value: string;
}

/** KeyValues model */
export interface KeyValues {
  /**
   * The key
   * @example "key1"
   */
  key?: string;
  values?: string[];
}

/** ConversationAttachment model */
export interface ConversationAttachment {
  /**
   * ConversationAttachment ID
   * @example "cb20c51f-fcf3-42c0-b613-de563634a8ec"
   */
  id?: string;
  /**
   * Name of the file
   * @example "my-file.txt"
   */
  fileName?: string;
  /**
   * Size of the file in bytes
   * @format int32
   * @example 1024
   */
  fileSize?: number;
  /** Mime type of the file */
  mimeType?: string;
  /**
   * The attachment created date
   * @format date-time
   * @example "2023-01-01T00:00:00+01:00"
   */
  created?: string;
}

/** Message model */
export interface Message {
  /**
   * Message ID
   * @example "1aefbbb8-de82-414b-b5d7-ba7c5bbe4506"
   */
  id?: string;
  /**
   * The ID of the replied message
   * @example "1aefbbb8-de82-414b-b5d7-ba7c5bbe4506"
   */
  inReplyToMessageId?: string;
  /**
   * The timestamp when the message was created.
   * @format date-time
   */
  created?: string;
  /** Identifier model */
  createdBy?: Identifier;
  /**
   * The content of the message.
   * @minLength 1
   * @example "Hello, how can I help you?"
   */
  content: string;
  readBy?: ReadBy[];
  attachments?: ConversationAttachment[];
}

/** Readby model */
export interface ReadBy {
  /** Identifier model */
  identifier?: Identifier;
  /**
   * The timestamp when the message was read.
   * @format date-time
   * @example "2023-01-01T12:00:00+01:00"
   */
  readAt?: string;
}

export interface PatchNotification {
  /**
   * Unique identifier for the notification
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id?: string;
  /**
   * The Errand Id
   * @format int64
   * @example 123
   */
  errandId: number;
  /**
   * Owner id of the notification
   * @example "AD01"
   */
  ownerId?: string;
  /**
   * Type of the notification
   * @example "CREATE"
   */
  type?: string;
  /**
   * Description of the notification
   * @example "Some description of the notification"
   */
  description?: string;
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
   * Acknowledged status of the notification (global level). I.e. this notification is acknowledged by anyone.
   * @example true
   */
  globalAcknowledged?: boolean;
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
   * @example "NYBYGGNAD_ANSOKAN_OM_BYGGLOV"
   */
  caseType?: string;
  /**
   * The priority of the case
   * @example "MEDIUM"
   */
  priority?: PatchErrandPriorityEnum;
  /**
   * Description of the case
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
  /** Other errands related to the errand */
  relatesTo?: RelatedErrand[];
  /**
   * List of labels for the errand
   * @example ["label1","label2"]
   */
  labels?: string[];
  /** The statuses connected to the errand */
  status?: Status;
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
  sort?: SortObject;
  first?: boolean;
  last?: boolean;
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
  sorted?: boolean;
  empty?: boolean;
  unsorted?: boolean;
}

export interface CommitMetadata {
  author?: string;
  commitDateInstant?: string;
  /** @format double */
  id?: number;
  properties?: object[];
  commitDate?: string;
}

export interface ElementChangesItem {
  elementChangeType?: string;
  /** @format int32 */
  index?: number;
  value?: object;
}

export interface EntryChangesItem {
  entryChangeType?: string;
  value?: string;
  key?: string;
}

export interface GlobalId {
  /** @format int32 */
  cdoId?: number;
  entity?: string;
  valueObject?: string;
  fragment?: string;
  ownerId?: OwnerId;
}

export interface History {
  changeType?: string;
  commitMetadata?: CommitMetadata;
  globalId?: GlobalId;
  property?: string;
  propertyChangeType?: string;
  entryChanges?: EntryChangesItem[];
  left?: object;
  right?: object;
  elementChanges?: ElementChangesItem[];
}

export interface OwnerId {
  /** @format int32 */
  cdoId?: number;
  entity?: string;
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

export interface MessageResponse {
  /**
   * The message ID
   * @example "12"
   */
  messageId?: string;
  /**
   * The errand ID
   * @format int64
   * @example 123
   */
  errandId?: number;
  /**
   * The municipality ID
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Namespace
   * @example "MY_NAMESPACE"
   */
  namespace?: string;
  /**
   * If the message is inbound or outbound from the perspective of case-data/e-service.
   * @example "INBOUND"
   */
  direction?: MessageResponseDirectionEnum;
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
   * The recipients of the message, if email
   * @example ["kalle.anka@ankeborg.se"]
   */
  recipients?: string[];
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
  /**
   * Signal if the message has been viewed or not
   * @example true
   */
  viewed?: boolean;
  /** Message classification */
  classification?: Classification;
  /** List of attachments on the message */
  attachments?: AttachmentResponse[];
  /** List of email headers on the message */
  emailHeaders?: EmailHeader[];
  /**
   * Is message internal
   * @example true
   */
  internal?: boolean;
}

export interface PageMessage {
  /** @format int32 */
  totalPages?: number;
  /** @format int64 */
  totalElements?: number;
  pageable?: PageableObject;
  /** @format int32 */
  size?: number;
  content?: Message[];
  /** @format int32 */
  number?: number;
  sort?: SortObject;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  numberOfElements?: number;
  empty?: boolean;
}

/**
 * Category of the address
 * @example "RESIDENTIAL"
 */
export enum AddressAddressCategoryEnum {
  POSTAL_ADDRESS = "POSTAL_ADDRESS",
  INVOICE_ADDRESS = "INVOICE_ADDRESS",
  VISITING_ADDRESS = "VISITING_ADDRESS",
}

/**
 * The type of contact information
 * @example "EMAIL"
 */
export enum ContactInformationContactTypeEnum {
  CELLPHONE = "CELLPHONE",
  PHONE = "PHONE",
  EMAIL = "EMAIL",
}

/**
 * The type of stakeholder
 * @example "PERSON"
 */
export enum StakeholderTypeEnum {
  PERSON = "PERSON",
  ORGANIZATION = "ORGANIZATION",
}

/**
 * Type of the decision
 * @example "APPROVAL"
 */
export enum DecisionDecisionTypeEnum {
  RECOMMENDED = "RECOMMENDED",
  PROPOSED = "PROPOSED",
  FINAL = "FINAL",
}

/**
 * Outcome of the decision
 * @example "GRANTED"
 */
export enum DecisionDecisionOutcomeEnum {
  APPROVAL = "APPROVAL",
  REJECTION = "REJECTION",
  DISMISSAL = "DISMISSAL",
  CANCELLATION = "CANCELLATION",
}

/**
 * How the errand was created
 * @example "EMAIL"
 */
export enum ErrandChannelEnum {
  ESERVICE = "ESERVICE",
  ESERVICE_KATLA = "ESERVICE_KATLA",
  EMAIL = "EMAIL",
  WEB_UI = "WEB_UI",
  MOBILE = "MOBILE",
  SYSTEM = "SYSTEM",
}

/**
 * Priority of the errand
 * @default "MEDIUM"
 * @example "HIGH"
 */
export enum ErrandPriorityEnum {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/**
 * If the message is inbound or outbound from the perspective of case-data/e-service.
 * @example "INBOUND"
 */
export enum MessageRequestDirectionEnum {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
}

/**
 * The priority of the case
 * @example "MEDIUM"
 */
export enum PatchErrandPriorityEnum {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/**
 * The type of decision
 * @example "APPROVAL"
 */
export enum PatchDecisionDecisionTypeEnum {
  RECOMMENDED = "RECOMMENDED",
  PROPOSED = "PROPOSED",
  FINAL = "FINAL",
}

/**
 * The outcome of the decision
 * @example "GRANTED"
 */
export enum PatchDecisionDecisionOutcomeEnum {
  APPROVAL = "APPROVAL",
  REJECTION = "REJECTION",
  DISMISSAL = "DISMISSAL",
  CANCELLATION = "CANCELLATION",
}

/**
 * If the message is inbound or outbound from the perspective of case-data/e-service.
 * @example "INBOUND"
 */
export enum MessageResponseDirectionEnum {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
}
