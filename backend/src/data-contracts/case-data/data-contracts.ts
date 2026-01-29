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

/** ConversationType model */
export enum ConversationType {
  INTERNAL = "INTERNAL",
  EXTERNAL = "EXTERNAL",
}

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

export enum NoteType {
  INTERNAL = "INTERNAL",
  PUBLIC = "PUBLIC",
}

export interface Address {
  /** Category of the address */
  addressCategory?: AddressAddressCategoryEnum;
  /**
   * Street name
   * @minLength 0
   * @maxLength 255
   */
  street?: string;
  /**
   * House number
   * @minLength 0
   * @maxLength 255
   */
  houseNumber?: string;
  /**
   * Postal code
   * @minLength 0
   * @maxLength 255
   */
  postalCode?: string;
  /**
   * City name
   * @minLength 0
   * @maxLength 255
   */
  city?: string;
  /**
   * Country name
   * @minLength 0
   * @maxLength 255
   */
  country?: string;
  /**
   * Care of (c/o)
   * @minLength 0
   * @maxLength 255
   */
  careOf?: string;
  /**
   * Attention to
   * @minLength 0
   * @maxLength 255
   */
  attention?: string;
  /**
   * Property designation
   * @minLength 0
   * @maxLength 255
   */
  propertyDesignation?: string;
  /**
   * Apartment number
   * @minLength 0
   * @maxLength 255
   */
  apartmentNumber?: string;
  /** Indicates if the address is within a zoning plan area */
  isZoningPlanArea?: boolean;
  /**
   * Invoice marking, only in combination with addressCategory: INVOICE_ADDRESS
   * @minLength 0
   * @maxLength 255
   */
  invoiceMarking?: string;
  /** The location of the address */
  location?: Coordinates;
}

export interface ContactInformation {
  /** The type of contact information */
  contactType?: ContactInformationContactTypeEnum;
  /**
   * The value of the contact information
   * @minLength 0
   * @maxLength 255
   */
  value?: string;
}

export interface Coordinates {
  /**
   * Decimal Degrees (DD)
   * @format double
   */
  latitude?: number;
  /**
   * Decimal Degrees (DD)
   * @format double
   */
  longitude?: number;
}

export interface Stakeholder {
  /**
   * The unique identifier of the stakeholder
   * @format int64
   */
  id?: number;
  /**
   * The version of the stakeholder
   * @format int32
   */
  version?: number;
  /** The municipality ID */
  municipalityId?: string;
  /** Namespace */
  namespace?: string;
  /** The type of stakeholder */
  type: StakeholderTypeEnum;
  /**
   * The first name of the stakeholder
   * @minLength 0
   * @maxLength 255
   */
  firstName?: string;
  /**
   * The last name of the stakeholder
   * @minLength 0
   * @maxLength 255
   */
  lastName?: string;
  /** The person ID of the stakeholder */
  personId?: string;
  /**
   * The organization name of the stakeholder
   * @minLength 0
   * @maxLength 255
   */
  organizationName?: string;
  /**
   * Organization number with 10 or 12 digits.
   * @minLength 0
   * @maxLength 13
   * @pattern ^((18|19|20|21)\d{6}|\d{6})-(\d{4})$
   */
  organizationNumber?: string;
  /**
   * The authorized signatory of the stakeholder
   * @minLength 0
   * @maxLength 255
   */
  authorizedSignatory?: string;
  /**
   * The AD-account of the stakeholder
   * @minLength 0
   * @maxLength 36
   */
  adAccount?: string;
  /** A stakeholder can have one or more roles. */
  roles: string[];
  /** A stakeholder may have one or more addresses. For example, one POSTAL_ADDRESS and another INVOICE_ADDRESS. */
  addresses?: Address[];
  /** The contact information of the stakeholder */
  contactInformation?: ContactInformation[];
  /** Additional parameters for the stakeholder */
  extraParameters?: Record<string, string>;
  /**
   * The timestamp when the stakeholder was created
   * @format date-time
   */
  created?: string;
  /**
   * The timestamp when the stakeholder was last updated
   * @format date-time
   */
  updated?: string;
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

export interface Facility {
  /**
   * The id of the facility
   * @format int64
   */
  id?: number;
  /**
   * The version of the facility
   * @format int32
   */
  version?: number;
  /** The municipality ID */
  municipalityId?: string;
  /** Namespace */
  namespace?: string;
  /**
   * Description of the facility
   * @minLength 0
   * @maxLength 255
   */
  description?: string;
  /** The address of the facility */
  address?: Address;
  /**
   * The name on the sign
   * @minLength 0
   * @maxLength 255
   */
  facilityCollectionName?: string;
  /** Is this the main facility for the case? */
  mainFacility?: boolean;
  /** Type of the facility */
  facilityType?: string;
  /**
   * Date and time when the facility was created
   * @format date-time
   */
  created?: string;
  /**
   * Date and time when the facility was last updated
   * @format date-time
   */
  updated?: string;
  /** Extra parameters */
  extraParameters?: Record<string, string>;
}

export interface Attachment {
  /**
   * The id of the attachment
   * @format int64
   */
  id?: number;
  /**
   * The version of the attachment
   * @format int32
   */
  version?: number;
  /** The municipality ID */
  municipalityId?: string;
  /**
   * Errand id associated with the attachment
   * @format int64
   */
  errandId?: number;
  /** Namespace */
  namespace?: string;
  /**
   * The date when this attachment was created
   * @format date-time
   */
  created?: string;
  /**
   * The date when this attachment was last updated
   * @format date-time
   */
  updated?: string;
  /** Category of the attachment */
  category?: string;
  /** Name of the attachment */
  name?: string;
  /** Note about the attachment */
  note?: string;
  /** File extension of the attachment */
  extension?: string;
  /** MIME type of the attachment */
  mimeType?: string;
  /** Base64 encoded file content */
  file?: string;
  /** Additional parameters for the attachment */
  extraParameters?: Record<string, string>;
}

export interface Decision {
  /**
   * The id of the decision
   * @format int64
   */
  id?: number;
  /**
   * The version of the decision
   * @format int32
   */
  version?: number;
  /** The municipality ID */
  municipalityId?: string;
  /** Namespace */
  namespace?: string;
  /** Type of the decision */
  decisionType?: DecisionDecisionTypeEnum;
  /** Outcome of the decision */
  decisionOutcome?: DecisionDecisionOutcomeEnum;
  /**
   * Description of the decision
   * @minLength 0
   * @maxLength 100000
   */
  description?: string;
  /** List of laws related to the decision */
  law?: Law[];
  /** Stakeholder who made the decision */
  decidedBy?: Stakeholder;
  /**
   * Date and time when the decision was made
   * @format date-time
   */
  decidedAt?: string;
  /**
   * Date and time when the decision becomes valid
   * @format date-time
   */
  validFrom?: string;
  /**
   * Date and time when the decision expires
   * @format date-time
   */
  validTo?: string;
  /** List of attachments related to the decision */
  attachments?: Attachment[];
  /** Additional parameters for the decision */
  extraParameters?: Record<string, string>;
  /**
   * Date and time when the decision was created
   * @format date-time
   */
  created?: string;
  /**
   * Date and time when the decision was last updated
   * @format date-time
   */
  updated?: string;
}

export interface Law {
  /**
   * Heading of the law
   * @minLength 0
   * @maxLength 255
   */
  heading?: string;
  /**
   * Swedish Code of Statutes (SFS)
   * @minLength 0
   * @maxLength 255
   */
  sfs?: string;
  /**
   * Chapter of the law
   * @minLength 0
   * @maxLength 255
   */
  chapter?: string;
  /**
   * Article of the law
   * @minLength 0
   * @maxLength 255
   */
  article?: string;
}

export interface CaseType {
  /** The case type */
  type?: string;
  /** The display name of the case type */
  displayName?: string;
}

export interface Errand {
  /**
   * The id of the errand
   * @format int64
   */
  id?: number;
  /**
   * The version of the errand
   * @format int32
   */
  version?: number;
  /** Errand number */
  errandNumber?: string;
  /** The municipality ID */
  municipalityId?: string;
  /** Namespace */
  namespace?: string;
  /**
   * Case ID from the client
   * @minLength 0
   * @maxLength 255
   */
  externalCaseId?: string;
  /** Type of the case */
  caseType?: string;
  /** How the errand was created */
  channel?: ErrandChannelEnum;
  /**
   * Priority of the errand
   * @default "MEDIUM"
   */
  priority?: ErrandPriorityEnum;
  /** Description of the errand */
  description?: string;
  /**
   * Additions to the case title. Right now only applicable to cases of CaseType: NYBYGGNAD_ANSOKAN_OM_BYGGLOV.
   * @minLength 0
   * @maxLength 255
   */
  caseTitleAddition?: string;
  /**
   * Diary number
   * @minLength 0
   * @maxLength 255
   */
  diaryNumber?: string;
  /**
   * Phase of the errand
   * @minLength 0
   * @maxLength 255
   */
  phase?: string;
  /**
   * The current status of the errand
   * @maxLength 255
   */
  status?: Status;
  /** The statuses connected to the errand */
  statuses?: Status[];
  /**
   * Start date for the business
   * @format date
   */
  startDate?: string;
  /**
   * End date of the business if it is time-limited
   * @format date
   */
  endDate?: string;
  /**
   * The time the application was received
   * @format date-time
   */
  applicationReceived?: string;
  /** Process-ID from ProcessEngine */
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
  /** List of labels for the errand */
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
   */
  created?: string;
  /**
   * Date and time when the errand was last updated
   * @format date-time
   */
  updated?: string;
}

export interface ExtraParameter {
  /** Parameter id */
  id?: string;
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

export interface Note {
  /**
   * The unique identifier of the note
   * @format int64
   */
  id?: number;
  /**
   * The version of the note
   * @format int32
   */
  version?: number;
  /** The municipality ID */
  municipalityId?: string;
  /** Namespace */
  namespace?: string;
  /**
   * The title of the note
   * @minLength 0
   * @maxLength 255
   */
  title?: string;
  /**
   * The content of the note
   * @minLength 0
   * @maxLength 10000
   */
  text?: string;
  /**
   * AD-account for the user who created the note
   * @minLength 0
   * @maxLength 36
   */
  createdBy?: string;
  /**
   * AD-account for the user who last modified the note
   * @minLength 0
   * @maxLength 36
   */
  updatedBy?: string;
  /** The type of note */
  noteType?: NoteType;
  /** Additional parameters for the note */
  extraParameters?: Record<string, string>;
  /**
   * The timestamp when the note was created
   * @format date-time
   */
  created?: string;
  /**
   * The timestamp when the note was last updated
   * @format date-time
   */
  updated?: string;
}

export interface Notification {
  /** Unique identifier for the notification */
  id?: string;
  /** The municipality ID */
  municipalityId?: string;
  /** Namespace */
  namespace?: string;
  /**
   * Timestamp when the notification was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the notification was last modified
   * @format date-time
   */
  modified?: string;
  /** Name of the owner of the notification */
  ownerFullName?: string;
  /**
   * Owner id of the notification
   * @minLength 1
   */
  ownerId: string;
  /** User who created the notification */
  createdBy?: string;
  /** Full name of the user who created the notification */
  createdByFullName?: string;
  /**
   * Type of the notification
   * @minLength 1
   */
  type: string;
  /** Sub type of the notification */
  subType?: string;
  /**
   * Description of the notification
   * @minLength 1
   */
  description: string;
  /** Content of the notification */
  content?: string;
  /**
   * Timestamp when the notification expires
   * @format date-time
   */
  expires?: string;
  /** Acknowledged status of the notification */
  acknowledged?: boolean;
  /** Acknowledged status of the notification (global level). I.e. this notification is acknowledged by anyone. */
  globalAcknowledged?: boolean;
  /**
   * Errand id of the notification
   * @format int64
   */
  errandId?: number;
  /** Errand number of the notification */
  errandNumber?: string;
}

/** Related errand for errand */
export interface RelatedErrand {
  /**
   * Errand id
   * @format int64
   */
  errandId?: number;
  /** Errand number */
  errandNumber: string;
  /** Relation reason */
  relationReason?: string;
}

export interface Status {
  /**
   * The type of status
   * @minLength 0
   * @maxLength 255
   */
  statusType: string;
  /**
   * Description of the status
   * @minLength 0
   * @maxLength 255
   */
  description?: string;
  /**
   * The date and time when the status was created
   * @format date-time
   */
  created?: string;
}

export interface Suspension {
  /**
   * Timestamp when the suspension wears off
   * @format date-time
   */
  suspendedTo?: string;
  /**
   * Timestamp when the suspension started
   * @format date-time
   */
  suspendedFrom?: string;
}

export interface EmailHeader {
  /** An email header */
  header?: Header;
  /** The value of the email header */
  values?: string[];
}

/** MessageResponse */
export interface MessageAttachment {
  /**
   * The attachment (file) content as a BASE64-encoded string
   * @minLength 1
   */
  content: string;
  /**
   * The attachment filename
   * @minLength 1
   */
  name: string;
  /** The attachment content type */
  contentType?: string;
}

export interface MessageRequest {
  /** The message ID */
  messageId?: string;
  /** If the message is inbound or outbound from the perspective of case-data/e-service. */
  direction?: MessageRequestDirectionEnum;
  /** The E-service ID that the message was created in */
  familyId?: string;
  /** OpenE caseID */
  externalCaseId?: string;
  /** The message */
  message?: string;
  /** The message in HTML format */
  htmlMessage?: string;
  /** The time the message was sent */
  sent?: string;
  /** The email-subject of the message */
  subject?: string;
  /** The username of the user that sent the message */
  username?: string;
  /** The first name of the user that sent the message */
  firstName?: string;
  /** The last name of the user that sent the message */
  lastName?: string;
  /** The message was delivered by */
  messageType?: string;
  /** The mobile number of the recipient */
  mobileNumber?: string;
  /** The email of the user that sent the message */
  email?: string;
  /** List of email recipients */
  recipients?: string[];
  /** The user ID of the user that sent the message */
  userId?: string;
  /** The classification of the message */
  classification?: Classification;
  /** List of attachments on the message */
  attachments?: MessageAttachment[];
  /** List of email headers on the message */
  emailHeaders?: EmailHeader[];
  /** Is message internal */
  internal?: boolean;
}

/** Conversation model */
export interface Conversation {
  /** Conversation ID */
  id?: string;
  /**
   * The message-exchange topic
   * @minLength 1
   */
  topic: string;
  /** The conversation type */
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
   */
  type?: string;
  /**
   * The conversation identifier value
   * @minLength 1
   */
  value: string;
}

/** KeyValues model */
export interface KeyValues {
  /** The key */
  key?: string;
  values?: string[];
}

/** ConversationAttachment model */
export interface ConversationAttachment {
  /** ConversationAttachment ID */
  id?: string;
  /** Name of the file */
  fileName?: string;
  /**
   * Size of the file in bytes
   * @format int32
   */
  fileSize?: number;
  /** Mime type of the file */
  mimeType?: string;
  /**
   * The attachment created date
   * @format date-time
   */
  created?: string;
}

/** Message model */
export interface Message {
  /** Message ID */
  id?: string;
  /** The ID of the replied message */
  inReplyToMessageId?: string;
  /**
   * The timestamp when the message was created.
   * @format date-time
   */
  created?: string;
  /** The participant who created the message. */
  createdBy?: Identifier;
  /**
   * The content of the message.
   * @minLength 1
   */
  content: string;
  readBy?: ReadBy[];
  attachments?: ConversationAttachment[];
  /** Type of message (user or system created) */
  type?: MessageTypeEnum;
}

/** Readby model */
export interface ReadBy {
  /** The identifier of the person who read the message. */
  identifier?: Identifier;
  /**
   * The timestamp when the message was read.
   * @format date-time
   */
  readAt?: string;
}

export interface PatchNotification {
  /** Unique identifier for the notification */
  id?: string;
  /**
   * The Errand Id
   * @format int64
   */
  errandId: number;
  /** Owner id of the notification */
  ownerId?: string;
  /** Type of the notification */
  type?: string;
  /** Description of the notification */
  description?: string;
  /** Content of the notification */
  content?: string;
  /**
   * Timestamp when the notification expires
   * @format date-time
   */
  expires?: string;
  /** Acknowledged status of the notification */
  acknowledged?: boolean;
  /** Acknowledged status of the notification (global level). I.e. this notification is acknowledged by anyone. */
  globalAcknowledged?: boolean;
}

export interface PatchErrand {
  /**
   * Case ID from the client.
   * @minLength 0
   * @maxLength 255
   */
  externalCaseId?: string;
  /** The type of case */
  caseType?: string;
  /** The priority of the case */
  priority?: PatchErrandPriorityEnum;
  /** Description of the case */
  description?: string;
  /**
   * Additions to the case title. Right now only applicable to cases of CaseType: NYBYGGNAD_ANSOKAN_OM_BYGGLOV.
   * @minLength 0
   * @maxLength 255
   */
  caseTitleAddition?: string;
  /**
   * Diary number of the case
   * @minLength 0
   * @maxLength 255
   */
  diaryNumber?: string;
  /**
   * Phase of the case
   * @minLength 0
   * @maxLength 255
   */
  phase?: string;
  /** The facilities in the case */
  facilities?: Facility[];
  /**
   * Start date for the business.
   * @format date
   */
  startDate?: string;
  /**
   * End date of the business if it is time-limited.
   * @format date
   */
  endDate?: string;
  /** Suspension information */
  suspension?: Suspension;
  /**
   * The time the application was received.
   * @format date-time
   */
  applicationReceived?: string;
  /** Extra parameters for the errand */
  extraParameters?: ExtraParameter[];
  /** Other errands related to the errand */
  relatesTo?: RelatedErrand[];
  /** List of labels for the errand */
  labels?: string[];
  /** The current status of the errand */
  status?: Status;
}

export interface PatchDecision {
  /** The type of decision */
  decisionType?: PatchDecisionDecisionTypeEnum;
  /** The outcome of the decision */
  decisionOutcome?: PatchDecisionDecisionOutcomeEnum;
  /**
   * Description of the decision
   * @minLength 0
   * @maxLength 1000
   */
  description?: string;
  /**
   * The date and time when the decision was made
   * @format date-time
   */
  decidedAt?: string;
  /**
   * The date and time when the decision becomes valid
   * @format date-time
   */
  validFrom?: string;
  /**
   * The date and time when the decision expires
   * @format date-time
   */
  validTo?: string;
  /** Additional parameters for the decision */
  extraParameters?: Record<string, string>;
}

export interface PageErrand {
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  size?: number;
  content?: Errand[];
  /** @format int32 */
  number?: number;
  pageable?: PageableObject;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  numberOfElements?: number;
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

export interface CommitMetadata {
  author?: string;
  commitDateInstant?: string;
  /** @format double */
  id?: number;
  properties?: any[];
  commitDate?: string;
}

export interface ElementChangesItem {
  elementChangeType?: string;
  /** @format int32 */
  index?: number;
  value?: any;
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
  left?: any;
  right?: any;
  elementChanges?: ElementChangesItem[];
}

export interface OwnerId {
  /** @format int32 */
  cdoId?: number;
  entity?: string;
}

export interface AttachmentResponse {
  /** The attachment ID */
  attachmentId: string;
  /** The attachment filename */
  name: string;
  /** The attachment content type */
  contentType?: string;
}

export interface MessageResponse {
  /** The message ID */
  messageId?: string;
  /**
   * The errand ID
   * @format int64
   */
  errandId?: number;
  /** The municipality ID */
  municipalityId?: string;
  /** Namespace */
  namespace?: string;
  /** If the message is inbound or outbound from the perspective of case-data/e-service. */
  direction?: MessageResponseDirectionEnum;
  /** The E-service ID that the message was created in */
  familyId?: string;
  /** OpenE caseID */
  externalCaseId?: string;
  /** The message */
  message?: string;
  /** The message in HTML format */
  htmlMessage?: string;
  /** The time the message was sent */
  sent?: string;
  /** The email-subject of the message */
  subject?: string;
  /** The username of the user that sent the message */
  username?: string;
  /** The first name of the user that sent the message */
  firstName?: string;
  /** The last name of the user that sent the message */
  lastName?: string;
  /** The message was delivered by */
  messageType?: string;
  /** The mobile number of the recipient */
  mobileNumber?: string;
  /** The recipients of the message, if email */
  recipients?: string[];
  /** The email of the user that sent the message */
  email?: string;
  /** The user ID of the user that sent the message */
  userId?: string;
  /** Signal if the message has been viewed or not */
  viewed?: boolean;
  /** The classification of the message */
  classification?: Classification;
  /** List of attachments on the message */
  attachments?: AttachmentResponse[];
  /** List of email headers on the message */
  emailHeaders?: EmailHeader[];
  /** Is message internal */
  internal?: boolean;
}

export interface PageMessage {
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
  /** @format int32 */
  size?: number;
  content?: Message[];
  /** @format int32 */
  number?: number;
  pageable?: PageableObject;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  numberOfElements?: number;
  sort?: SortObject;
  empty?: boolean;
}

/** Category of the address */
export enum AddressAddressCategoryEnum {
  POSTAL_ADDRESS = "POSTAL_ADDRESS",
  INVOICE_ADDRESS = "INVOICE_ADDRESS",
  VISITING_ADDRESS = "VISITING_ADDRESS",
}

/** The type of contact information */
export enum ContactInformationContactTypeEnum {
  CELLPHONE = "CELLPHONE",
  PHONE = "PHONE",
  EMAIL = "EMAIL",
}

/** The type of stakeholder */
export enum StakeholderTypeEnum {
  PERSON = "PERSON",
  ORGANIZATION = "ORGANIZATION",
}

/** Type of the decision */
export enum DecisionDecisionTypeEnum {
  RECOMMENDED = "RECOMMENDED",
  PROPOSED = "PROPOSED",
  FINAL = "FINAL",
}

/** Outcome of the decision */
export enum DecisionDecisionOutcomeEnum {
  APPROVAL = "APPROVAL",
  REJECTION = "REJECTION",
  DISMISSAL = "DISMISSAL",
  CANCELLATION = "CANCELLATION",
}

/** How the errand was created */
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
 */
export enum ErrandPriorityEnum {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/** If the message is inbound or outbound from the perspective of case-data/e-service. */
export enum MessageRequestDirectionEnum {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
}

/** Type of message (user or system created) */
export enum MessageTypeEnum {
  USER_CREATED = "USER_CREATED",
  SYSTEM_CREATED = "SYSTEM_CREATED",
}

/** The priority of the case */
export enum PatchErrandPriorityEnum {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

/** The type of decision */
export enum PatchDecisionDecisionTypeEnum {
  RECOMMENDED = "RECOMMENDED",
  PROPOSED = "PROPOSED",
  FINAL = "FINAL",
}

/** The outcome of the decision */
export enum PatchDecisionDecisionOutcomeEnum {
  APPROVAL = "APPROVAL",
  REJECTION = "REJECTION",
  DISMISSAL = "DISMISSAL",
  CANCELLATION = "CANCELLATION",
}

/** If the message is inbound or outbound from the perspective of case-data/e-service. */
export enum MessageResponseDirectionEnum {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
}
