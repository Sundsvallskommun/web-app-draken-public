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

/** Namespace configuration model */
export interface NamespaceConfig {
  /**
   * Namespace
   * @example "CONTACTCENTER"
   */
  namespace?: string;
  /**
   * Municipality connected to the namespace
   * @example "2281"
   */
  municipalityId?: string;
  /**
   * Displayname for the namespace
   * @example "Kontaktcenter"
   */
  displayName: string;
  /**
   * Prefix for errand numbers in this namespace
   * @example "KC"
   */
  shortCode: string;
  /**
   * Timestamp when the configuration was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the configuration was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
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

/** Label model */
export interface Label {
  /**
   * Label classification
   * @example "subtype"
   */
  classification: string;
  /**
   * Display name for the label
   * @example "Nyckelkort"
   */
  displayName?: string;
  /**
   * Name for the label
   * @example "keycard"
   */
  name: string;
  labels?: Label[];
}

/** Email integration config model */
export interface EmailIntegration {
  /** If set to true emails will be fetched */
  enabled: boolean;
  /**
   * Email sender if incoming mail is rejected
   * @example "noreply@sundsvall.se"
   */
  errandClosedEmailSender?: string | null;
  /**
   * Message that will be sent when incoming mail is rejected
   * @example "Errand is closed. Please open a new errand."
   */
  errandClosedEmailTemplate?: string | null;
  /**
   * Email sender if incoming mail results in new errand
   * @example "test@sundsvall.se"
   */
  errandNewEmailSender?: string | null;
  /**
   * Message that will be sent when new errand is created
   * @example "New errand is created."
   */
  errandNewEmailTemplate?: string | null;
  /**
   * Number of days before incoming mail is rejected. Measured from when the errand was last touched. Rejection can only occur if status on errand equals 'inactiveStatus'.
   * @format int32
   * @example 5
   */
  daysOfInactivityBeforeReject?: number | null;
  /**
   * Status set on errand when email results in a new errand
   * @example "NEW"
   */
  statusForNew: string;
  /**
   * Status on errand that will trigger a status change when email refers to an existing errand
   * @example "SOLVED"
   */
  triggerStatusChangeOn?: string | null;
  /**
   * Status that will be set on errand if status change is triggered. Can only be null if 'triggerStatusChangeOn' is null.
   * @example "OPEN"
   */
  statusChangeTo?: string | null;
  /**
   * Status of an inactive errand. This value relates to property 'daysOfInactivityBeforeReject'. If set to null, no rejection mail will be sent
   * @example "SOLVED"
   */
  inactiveStatus?: string | null;
  /**
   * If true sender is added as stakeholder
   * @example false
   */
  addSenderAsStakeholder?: boolean | null;
  /**
   * Role set on stakeholder.
   * @example "APPLICANT"
   */
  stakeholderRole?: string | null;
  /**
   * Channel set on created errands
   * @example "EMAIL"
   */
  errandChannel?: string | null;
  /**
   * Timestamp when the configuration was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the configuration was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
}

export interface Notification {
  /**
   * Unique identifier for the notification
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  id?: string;
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
  ownerFullName: string;
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
   * Errand id of the notification
   * @example "f0882f1d-06bc-47fd-b017-1d8307f5ce95"
   */
  errandId?: string;
  /**
   * Errand number of the notification
   * @example "PRH-2022-000001"
   */
  errandNumber?: string;
}

/** Status model */
export interface Status {
  /**
   * Name for the status
   * @example "statusname"
   */
  name: string;
  /**
   * Timestamp when the status was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the status was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
}

/** Role model */
export interface Role {
  /**
   * Name for the role
   * @example "roleName"
   */
  name: string;
  /**
   * Timestamp when the role was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the role was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
}

/** ExternalIdType model */
export interface ExternalIdType {
  /**
   * Name for the external id type
   * @example "PRIVATE"
   */
  name: string;
  /**
   * Timestamp when the external id type was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the external id type was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
}

/** Contact reason model */
export interface ContactReason {
  /**
   * Reason for contact
   * @example "Segt internet"
   */
  reason: string;
  /**
   * Timestamp when the contact reason was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the contact reason was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
}

/** Category model */
export interface Category {
  /**
   * Name for the category
   * @example "categoryname"
   */
  name: string;
  /**
   * Displayname for the category
   * @example "Displayed name"
   */
  displayName?: string;
  /** @uniqueItems true */
  types?: Type[];
  /**
   * Timestamp when the category was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the category was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
}

/** Type model */
export interface Type {
  /**
   * Name for the type
   * @example "typename"
   */
  name: string;
  /**
   * Displayname for the type
   * @example "Displayed name"
   */
  displayName?: string;
  /**
   * Email for where to escalate the errand if needed
   * @example "escalationgroup@sesamestreet.com"
   */
  escalationEmail?: string;
  /**
   * Timestamp when type was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when type was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
}

/** Classification model */
export interface Classification {
  /**
   * Category for the errand
   * @example "SUPPORT_CASE"
   */
  category: string;
  /**
   * Type of errand
   * @example "OTHER_ISSUES"
   */
  type: string;
}

/** Contact channel model */
export interface ContactChannel {
  /**
   * Type of channel. Defines how value is interpreted
   * @example "Email"
   */
  type?: string;
  /**
   * Value for Contact channel
   * @example "arthur.dent@earth.com"
   */
  value?: string;
}

/** Errand model */
export interface Errand {
  /**
   * Unique id for the errand
   * @example "f0882f1d-06bc-47fd-b017-1d8307f5ce95"
   */
  id?: string;
  /**
   * Unique number for the errand
   * @example "KC-23010001"
   */
  errandNumber?: string;
  /**
   * Title for the errand
   * @example "Title for the errand"
   */
  title: string;
  /** Priority model */
  priority: Priority;
  stakeholders?: Stakeholder[];
  /** @uniqueItems true */
  externalTags?: ExternalTag[];
  /** Parameters for the errand */
  parameters?: Parameter[];
  /** Classification model */
  classification: Classification;
  /**
   * Status for the errand
   * @example "NEW_CASE"
   */
  status: string;
  /**
   * Resolution status for closed errands. Value can be set to anything
   * @example "FIXED"
   */
  resolution?: string;
  /**
   * Errand description text
   * @example "Order cake for everyone"
   */
  description?: string;
  /**
   * The channel from which the errand originated
   * @minLength 0
   * @maxLength 255
   * @example "THE_CHANNEL"
   */
  channel?: string;
  /**
   * User id for the person which has created the errand
   * @example "joe01doe"
   */
  reporterUserId: string;
  /**
   * Id for the user which currently is assigned to the errand if a user is assigned
   * @example "joe01doe"
   */
  assignedUserId?: string;
  /**
   * Id for the group which is currently assigned to the errand if a group is assigned
   * @example "hardware support"
   */
  assignedGroupId?: string;
  /**
   * Email address used for escalation of errand
   * @example "joe.doe@email.com"
   */
  escalationEmail?: string;
  /**
   * Contact reason for the errand
   * @example "The printer is not working"
   */
  contactReason?: string;
  /**
   * Contact reason description for the errand
   * @minLength 0
   * @maxLength 255
   * @example "The printer is not working since the power cord is missing"
   */
  contactReasonDescription?: string;
  /** Suspension information */
  suspension?: Suspension;
  /**
   * Flag to indicate if the errand is business related
   * @example true
   */
  businessRelated?: boolean;
  /**
   * List of labels for the errand
   * @example ["label1","label2"]
   */
  labels?: string[];
  /**
   * Timestamp when errand was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when errand was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
  /**
   * Timestamp when errand was last touched (created or modified)
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  touched?: string;
}

/** External tag model */
export interface ExternalTag {
  /**
   * Key for external tag
   * @example "caseid"
   */
  key: string;
  /**
   * Value for external tag
   * @example "8849-2848"
   */
  value: string;
}

/** Parameter model */
export interface Parameter {
  /** Parameter key */
  key: string;
  /** Parameter display name */
  displayName?: string;
  /** Parameter values */
  values?: string[];
}

/** Priority model */
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/** Stakeholder model */
export interface Stakeholder {
  /**
   * Unique identifier for the stakeholder
   * @example "cb20c51f-fcf3-42c0-b613-de563634a8ec"
   */
  externalId?: string;
  /**
   * Type of external id
   * @example "PRIVATE"
   */
  externalIdType?: string;
  /**
   * Role of stakeholder
   * @example "ADMINISTRATOR"
   */
  role?: string;
  /**
   * City
   * @example "Cottington"
   */
  city?: string;
  /**
   * Organization name
   * @example "Vogon Constructor Fleet"
   */
  organizationName?: string;
  /**
   * First name
   * @example "Aurthur"
   */
  firstName?: string;
  /**
   * Last name
   * @example "Dent"
   */
  lastName?: string;
  /**
   * Address
   * @example "155 Country Lane, Cottington"
   */
  address?: string;
  /**
   * Care of
   * @example "Ford Prefect"
   */
  careOf?: string;
  /**
   * Zip code
   * @example "12345"
   */
  zipCode?: string;
  /**
   * Country
   * @example "United Kingdom"
   */
  country?: string;
  contactChannels?: ContactChannel[];
  /**
   * Metadata
   * @example {"key":"value"}
   */
  metadata?: Record<string, string>;
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

/** CreateErrandNoteRequest model */
export interface CreateErrandNoteRequest {
  /**
   * Context for note
   * @minLength 1
   * @maxLength 255
   * @example "SUPPORT"
   */
  context: string;
  /**
   * Role of note creator
   * @minLength 1
   * @maxLength 255
   * @example "FIRST_LINE_SUPPORT"
   */
  role: string;
  /**
   * Party id (e.g. a personId or an organizationId)
   * @example "81471222-5798-11e9-ae24-57fa13b361e1"
   */
  partyId?: string;
  /**
   * The note subject
   * @max 255
   * @minLength 1
   * @maxLength 255
   * @example "This is a subject"
   */
  subject: string;
  /**
   * The note body
   * @max 2048
   * @minLength 1
   * @maxLength 2048
   * @example "This is a note"
   */
  body: string;
  /**
   * Created by
   * @example "John Doe"
   */
  createdBy: string;
}

/** SmsRequest model */
export interface SmsRequest {
  /**
   * The sender of the SMS
   * @minLength 1
   * @maxLength 11
   * @example "sender"
   */
  sender: string;
  /**
   * Mobile number to recipient in format +467[02369]\d{7}
   * @example "+46761234567"
   */
  recipient: string;
  /** Message */
  message: string;
}

/** EmailAttachment model */
export interface EmailAttachment {
  /**
   * The attachment filename
   * @example "test.txt"
   */
  name: string;
  /**
   * The attachment (file) content as a BASE64-encoded string, max size 10 MB
   * @format base64
   * @example "aGVsbG8gd29ybGQK"
   */
  base64EncodedString: string;
}

/** EmailRequest model */
export interface EmailRequest {
  /**
   * Email address for sender
   * @example "sender@sender.se"
   */
  sender: string;
  /**
   * Optional displayname of sender on email. If left out, email will be displayed as sender name.
   * @example "Firstname Lastname"
   */
  senderName?: string;
  /**
   * Email address for recipient
   * @example "recipient@recipient.se"
   */
  recipient: string;
  /**
   * Subject
   * @example "Subject"
   */
  subject: string;
  /**
   * Message in html (optionally in BASE64 encoded format)
   * @example "<html>HTML-formatted message</html>"
   */
  htmlMessage: string;
  /**
   * Message in plain text
   * @example "Message in plain text"
   */
  message: string;
  /**
   * Headers for keeping track of email conversations
   * @example {"IN_REPLY_TO":["reply-to@example.com"],"REFERENCES":["reference1","reference2"],"MESSAGE_ID":["123456789"]}
   */
  emailHeaders?: Record<string, string[]>;
  attachments?: EmailAttachment[];
  attachmentIds?: string[];
}

/** UpdateErrandNoteRequest model */
export interface UpdateErrandNoteRequest {
  /**
   * The note subject
   * @max 255
   * @minLength 1
   * @maxLength 255
   * @example "This is a subject"
   */
  subject: string;
  /**
   * The note nody
   * @max 2048
   * @minLength 1
   * @maxLength 2048
   * @example "This is a note"
   */
  body: string;
  /**
   * Modified by
   * @example "John Doe"
   */
  modifiedBy: string;
}

/** ErrandNote model */
export interface ErrandNote {
  /**
   * Note ID
   * @example "5f79a808-0ef3-4985-99b9-b12f23e202a7"
   */
  id?: string;
  /**
   * Context for note
   * @example "SUPPORT"
   */
  context?: string;
  /**
   * Role of note creator
   * @example "FIRST_LINE_SUPPORT"
   */
  role?: string;
  /**
   * Id of the client who is the owner of the note
   * @example "SUPPORT_MGMT"
   */
  clientId?: string;
  /**
   * Party ID (e.g. a personId or an organizationId)
   * @example "81471222-5798-11e9-ae24-57fa13b361e1"
   */
  partyId?: string;
  /**
   * The note subject
   * @example "This is a subject"
   */
  subject?: string;
  /**
   * The note body
   * @example "This is a note"
   */
  body?: string;
  /**
   * Id for the case
   * @example "b82bd8ac-1507-4d9a-958d-369261eecc15"
   */
  caseId?: string;
  /**
   * Created by
   * @example "John Doe"
   */
  createdBy?: string;
  /**
   * Modified by
   * @example "John Doe"
   */
  modifiedBy?: string;
  /**
   * Created timestamp
   * @format date-time
   */
  created?: string;
  /**
   * Modified timestamp
   * @format date-time
   */
  modified?: string;
}

/** Labels model */
export interface Labels {
  /**
   * Timestamp when the labels was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Timestamp when the labels was last modified
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  modified?: string;
  labelStructure?: Label[];
}

/** MetadataResponse model */
export interface MetadataResponse {
  categories?: Category[];
  externalIdTypes?: ExternalIdType[];
  /** Labels model */
  labels?: Labels;
  statuses?: Status[];
  roles?: Role[];
  contactReasons?: ContactReason[];
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
  paged?: boolean;
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  pageSize?: number;
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

/** Revision model */
export interface Revision {
  /**
   * Unique id for the revision
   * @example "391e97b7-2e78-42e2-9a60-fe49fbfa94f1"
   */
  id?: string;
  /**
   * Unique id for the entity connected to the revision
   * @example "3af4844d-a75f-4e25-a2a0-355eb642dd2d"
   */
  entityId?: string;
  /**
   * Type of entity for the revision
   * @example "ErrandEntity"
   */
  entityType?: string;
  /**
   * Version of the revision
   * @format int32
   * @example 1
   */
  version?: number;
  /**
   * Timestamp when the revision was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
}

/** DifferenceResponse model */
export interface DifferenceResponse {
  operations?: Operation[];
}

/** Operation model */
export interface Operation {
  /**
   * Type of operation
   * @example "replace"
   */
  op?: string;
  /**
   * Path to attribute
   * @example "/name/firstName"
   */
  path?: string;
  /**
   * Value of attribute
   * @example "Jane"
   */
  value?: string;
  /**
   * Previous value of attribute
   * @example "John"
   */
  fromValue?: string;
}

/** FindErrandNotesRequest model */
export interface FindErrandNotesRequest {
  /**
   * Context for note
   * @example "SUPPORT"
   */
  context?: string;
  /**
   * Role of note creator
   * @example "FIRST_LINE_SUPPORT"
   */
  role?: string;
  /**
   * Party id (e.g. a personId or an organizationId)
   * @example "81471222-5798-11e9-ae24-57fa13b361e1"
   */
  partyId?: string;
  /**
   * Page number
   * @format int32
   * @min 1
   * @default 1
   * @example 1
   */
  page?: number;
  /**
   * Result size per page
   * @format int32
   * @min 1
   * @max 1000
   * @default 100
   * @example 100
   */
  limit?: number;
}

/** FindErrandNotesResponse model */
export interface FindErrandNotesResponse {
  notes?: ErrandNote[];
  /** Metadata model */
  _meta?: MetaData;
}

/** Metadata model */
export interface MetaData {
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

/** Event model */
export interface Event {
  /** Type of event */
  type?: EventType;
  /**
   * Event description
   * @example "Errand has been created"
   */
  message?: string;
  /**
   * Service that created event
   * @example "SupportManagement"
   */
  owner?: string;
  /**
   * Timestamp when the event was created
   * @format date-time
   * @example "2000-10-31T01:30:00+02:00"
   */
  created?: string;
  /**
   * Reference to the snapshot of data at the time when the event was created
   * @example "fbe2fb67-005c-4f26-990f-1c95b5f6933e"
   */
  historyReference?: string;
  /**
   * Source which the event refers to
   * @example "errand"
   */
  sourceType?: string;
  metadata?: EventMetaData[];
}

/** Event Metadata model */
export interface EventMetaData {
  /**
   * The key
   * @example "userId"
   */
  key?: string;
  /**
   * The value
   * @example "john123"
   */
  value?: string;
}

/** Type of event */
export enum EventType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  UNKNOWN = 'UNKNOWN',
}

export interface PageEvent {
  /** @format int32 */
  totalPages?: number;
  /** @format int64 */
  totalElements?: number;
  pageable?: PageableObject;
  /** @format int32 */
  size?: number;
  content?: Event[];
  /** @format int32 */
  number?: number;
  sort?: SortObject[];
  /** @format int32 */
  numberOfElements?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

/** ErrandAttachmentHeader model */
export interface ErrandAttachmentHeader {
  /**
   * Unique identifier for the attachment
   * @example "cb20c51f-fcf3-42c0-b613-de563634a8ec"
   */
  id?: string;
  /**
   * Name of the file
   * @example "my-file.txt"
   */
  fileName: string;
  /** Mime type of the file */
  mimeType?: string;
}

export interface Communication {
  /**
   * The communication ID
   * @example "12"
   */
  communicationID?: string;
  /**
   * Sender of the communication.
   * @example "Test Testsson"
   */
  sender?: string;
  /**
   * The errand number
   * @example "PRH-2022-000001"
   */
  errandNumber?: string;
  /**
   * If the communication is inbound or outbound from the perspective of case-data/e-service.
   * @example "INBOUND"
   */
  direction?: CommunicationDirectionEnum;
  /**
   * The message body
   * @example "Hello world"
   */
  messageBody?: string;
  /**
   * The time the communication was sent
   * @format date-time
   */
  sent?: string;
  /**
   * The email-subject of the message
   * @example "Hello world"
   */
  subject?: string;
  /**
   * The message was delivered by
   * @example "EMAIL"
   */
  communicationType?: CommunicationCommunicationTypeEnum;
  /**
   * The mobile number or email adress the communication was sent to
   * @example "+46701234567"
   */
  target?: string;
  /**
   * Signal if the message has been viewed or not
   * @example true
   */
  viewed?: boolean;
  /**
   * Headers for keeping track of email conversations
   * @example {"IN_REPLY_TO":["reply-to@example.com"],"REFERENCES":["reference1","reference2"],"MESSAGE_ID":["123456789"]}
   */
  emailHeaders?: Record<string, string[]>;
  /** List of communicationAttachments on the message */
  communicationAttachments?: CommunicationAttachment[];
}

/** List of communicationAttachments on the message */
export interface CommunicationAttachment {
  /**
   * The attachment ID
   * @example "aGVsbG8gd29ybGQK"
   */
  attachmentID?: string;
  /**
   * The attachment filename
   * @example "test.txt"
   */
  name?: string;
  /**
   * The attachment content type
   * @example "text/plain"
   */
  contentType?: string;
}

/**
 * If the communication is inbound or outbound from the perspective of case-data/e-service.
 * @example "INBOUND"
 */
export enum CommunicationDirectionEnum {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

/**
 * The message was delivered by
 * @example "EMAIL"
 */
export enum CommunicationCommunicationTypeEnum {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}
