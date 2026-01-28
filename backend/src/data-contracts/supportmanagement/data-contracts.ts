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

/** Type of event */
export enum EventType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  UNKNOWN = 'UNKNOWN',
}

/** ConversationType model */
export enum ConversationType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

/** Priority model */
export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
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

/** Namespace configuration model */
export interface NamespaceConfig {
  /** Namespace */
  namespace?: string;
  /** Municipality connected to the namespace */
  municipalityId?: string;
  /** Display name for the namespace */
  displayName: string;
  /** Prefix for errand numbers in this namespace */
  shortCode: string;
  /**
   * Time to live (in days) for notifications created in this namespace
   * @format int32
   */
  notificationTTLInDays?: number;
  /**
   * Timestamp when the configuration was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the configuration was last modified
   * @format date-time
   */
  modified?: string;
  /** If set to true access control will be enabled. If no value is set it defaults to false. */
  accessControl?: boolean;
  /** If set to true notification will be sent to the stakeholder when stakeholder with reporter role recieves an internal message. If no value is set it defaults to false. */
  notifyReporter?: boolean;
}

/** Label model */
export interface Label {
  /** Label ID */
  id?: string;
  /**
   * Label classification
   * @minLength 1
   */
  classification: string;
  /** Display name for the label */
  displayName?: string;
  /** Resource path */
  resourcePath?: string;
  /**
   * Resource name
   * @minLength 1
   * @pattern [A-Z0-9_]+
   */
  resourceName: string;
  labels?: Label[];
}

/** Email integration config model */
export interface EmailIntegration {
  /** If set to true emails will be fetched */
  enabled: boolean;
  /** Email sender if incoming mail is rejected */
  errandClosedEmailSender?: string | null;
  /** Message that will be sent when incoming mail is rejected */
  errandClosedEmailTemplate?: string | null;
  /** HTML template for email that will be sent when incoming mail is rejected */
  errandClosedEmailHTMLTemplate?: string | null;
  /** Email sender if incoming mail results in new errand */
  errandNewEmailSender?: string | null;
  /** Message that will be sent when new errand is created */
  errandNewEmailTemplate?: string | null;
  /** HTML template for email that will be sent when incoming mail results in new errand */
  errandNewEmailHTMLTemplate?: string | null;
  /**
   * Number of days before incoming mail is rejected. Measured from when the errand was last touched. Rejection can only occur if status on errand equals 'inactiveStatus'.
   * @format int32
   */
  daysOfInactivityBeforeReject?: number | string | null;
  /** Status set on errand when email results in a new errand */
  statusForNew: string;
  /** Status on errand that will trigger a status change when email refers to an existing errand */
  triggerStatusChangeOn?: string | null;
  /** Status that will be set on errand if status change is triggered. Can only be null if 'triggerStatusChangeOn' is null. */
  statusChangeTo?: string | null;
  /** Status of an inactive errand. This value relates to property 'daysOfInactivityBeforeReject'. If set to null, no rejection mail will be sent */
  inactiveStatus?: string | null;
  /** If true sender is added as stakeholder */
  addSenderAsStakeholder?: boolean | string | null;
  /** Role set on stakeholder. */
  stakeholderRole?: string | null;
  /** Channel set on created errands */
  errandChannel?: string | null;
  /**
   * Timestamp when the configuration was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the configuration was last modified
   * @format date-time
   */
  modified?: string;
}

/** Message-Exchange sync configuration */
export interface MessageExchangeSync {
  /**
   * Unique id
   * @format int64
   */
  id?: number;
  /** Message exchange namespace to search in. Does not map to supporManagement namespace. */
  namespace?: string;
  /**
   * Latest synced sequence number
   * @format int64
   */
  latestSyncedSequenceNumber?: number;
  /**
   * Timestamp when the configuration was last modified
   * @format date-time
   */
  modified?: string;
  /** If set to true conversations will be synced */
  active: boolean;
}

/** Status model */
export interface Status {
  /**
   * Name for the status
   * @minLength 1
   */
  name: string;
  /**
   * Timestamp when the status was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the status was last modified
   * @format date-time
   */
  modified?: string;
}

/** Role model */
export interface Role {
  /**
   * Name for the role. Used as key
   * @minLength 1
   */
  name: string;
  /** Display name for the role */
  displayName?: string | null;
  /**
   * Timestamp when the role was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the role was last modified
   * @format date-time
   */
  modified?: string;
}

/** ExternalIdType model */
export interface ExternalIdType {
  /**
   * Name for the external id type
   * @minLength 1
   */
  name: string;
  /**
   * Timestamp when the external id type was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the external id type was last modified
   * @format date-time
   */
  modified?: string;
}

/** Contact reason model */
export interface ContactReason {
  /**
   * ID
   * @format int64
   */
  id?: number;
  /**
   * Reason for contact
   * @minLength 1
   */
  reason: string;
  /**
   * Timestamp when the contact reason was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the contact reason was last modified
   * @format date-time
   */
  modified?: string;
}

/** Category model */
export interface Category {
  /** Name for the category */
  name?: string;
  /** Display name for the category */
  displayName?: string;
  /** @uniqueItems true */
  types?: Type[];
  /**
   * Timestamp when the category was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when the category was last modified
   * @format date-time
   */
  modified?: string;
}

/** Type model */
export interface Type {
  /**
   * Name for the type
   * @minLength 1
   */
  name: string;
  /** Display name for the type */
  displayName?: string;
  /**
   * Email for where to escalate the errand if needed
   * @format email
   */
  escalationEmail?: string;
  /**
   * Timestamp when type was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when type was last modified
   * @format date-time
   */
  modified?: string;
}

/** Classification model */
export interface Classification {
  /** Category for the errand */
  category?: string;
  /** Type of errand */
  type?: string;
}

/** Contact channel model */
export interface ContactChannel {
  /** Type of channel. Defines how value is interpreted */
  type?: string;
  /** Value for Contact channel */
  value?: string;
}

/** Errand model */
export interface Errand {
  /** Unique id for the errand */
  id?: string;
  /** Unique number for the errand */
  errandNumber?: string;
  /** Title for the errand */
  title?: string;
  priority?: Priority;
  stakeholders?: Stakeholder[];
  /** @uniqueItems true */
  externalTags?: ExternalTag[];
  /** Parameters for the errand */
  parameters?: Parameter[];
  /** Classification model */
  classification?: Classification;
  /** Status for the errand */
  status?: string;
  /** Resolution status for closed errands. Value can be set to anything */
  resolution?: string;
  /** Errand description text */
  description?: string;
  /**
   * The channel from which the errand originated
   * @maxLength 255
   */
  channel?: string;
  /** User id for the person which has created the errand */
  reporterUserId?: string;
  /** Id for the user which currently is assigned to the errand if a user is assigned */
  assignedUserId?: string;
  /** Id for the group which is currently assigned to the errand if a group is assigned */
  assignedGroupId?: string;
  /**
   * Email address used for escalation of errand
   * @format email
   */
  escalationEmail?: string;
  /** Contact reason for the errand */
  contactReason?: string;
  /**
   * Contact reason description for the errand
   * @maxLength 4096
   */
  contactReasonDescription?: string;
  /** Suspension information */
  suspension?: Suspension;
  /** Flag to indicate if the errand is business related */
  businessRelated?: boolean;
  /** List of labels for the errand */
  labels?: ErrandLabel[];
  /** List of active notifications for the errand */
  activeNotifications?: Notification[];
  /**
   * Timestamp when errand was created
   * @format date-time
   */
  created?: string;
  /**
   * Timestamp when errand was last modified
   * @format date-time
   */
  modified?: string;
  /**
   * Timestamp when errand was last touched (created or modified)
   * @format date-time
   */
  touched?: string;
}

/** Errand label model */
export interface ErrandLabel {
  /** Label ID */
  id?: string;
  /** Label classification */
  classification?: string;
  /** Display name for the label */
  displayName?: string;
  /** Resource path */
  resourcePath?: string;
  /** Resource name */
  resourceName?: string;
}

/** External tag model */
export interface ExternalTag {
  /** Key for external tag */
  key?: string;
  /** Value for external tag */
  value?: string;
}

export interface Notification {
  /** Unique identifier for the notification */
  id?: string;
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
  /** Owner id of the notification */
  ownerId?: string;
  /** User who created the notification */
  createdBy?: string;
  /** Full name of the user who created the notification */
  createdByFullName?: string;
  /** Type of the notification */
  type?: string;
  /** Subtype of the notification */
  subtype?: string;
  /** Description of the notification */
  description?: string;
  /** Content of the notification */
  content?: string;
  /**
   * Timestamp when the notification expires
   * @format date-time
   */
  expires?: string;
  /** Acknowledged status of the notification (global level). I.e. this notification is acknowledged by anyone. */
  globalAcknowledged?: boolean;
  /** Acknowledged status of the notification (owner level). I.e. this notification is acknowledged by the owner of this notification. */
  acknowledged?: boolean;
  /** Errand id of the notification */
  errandId?: string;
  /** Errand number of the notification */
  errandNumber?: string;
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
  /** Parameter values. Each value can have a maximum length of 2000 characters */
  values?: string[];
}

/** Stakeholder model */
export interface Stakeholder {
  /** Unique identifier for the stakeholder */
  externalId?: string;
  /** Type of external id */
  externalIdType?: string;
  /** Role of stakeholder */
  role?: string;
  /** City */
  city?: string;
  /** Organization name */
  organizationName?: string;
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Address */
  address?: string;
  /** Care of */
  careOf?: string;
  /** Zip code */
  zipCode?: string;
  /** Country */
  country?: string;
  contactChannels?: ContactChannel[];
  /** Parameters for the stakeholder */
  parameters?: Parameter[];
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

/** CreateErrandNoteRequest model */
export interface CreateErrandNoteRequest {
  /**
   * Context for note
   * @minLength 1
   * @maxLength 255
   */
  context: string;
  /**
   * Role of note creator
   * @minLength 1
   * @maxLength 255
   */
  role: string;
  /** Party id (e.g. a personId or an organizationId) */
  partyId?: string;
  /**
   * The note subject
   * @minLength 1
   * @maxLength 255
   */
  subject: string;
  /**
   * The note body
   * @minLength 1
   * @maxLength 2048
   */
  body: string;
  /**
   * Created by
   * @minLength 1
   */
  createdBy: string;
}

/** WebMessageAttachment model */
export interface WebMessageAttachment {
  /**
   * The attachment file name
   * @minLength 1
   */
  fileName: string;
  /**
   * The attachment (file) content as a BASE64-encoded string, max size 50 MB
   * @format base64
   */
  base64EncodedString: string;
}

/** WebMessageRequest model */
export interface WebMessageRequest {
  /** Indicates if the message is internal */
  internal?: boolean;
  /**
   * Indicates if the message should be dispatched with messaging or not
   * @default true
   */
  dispatch?: boolean;
  /**
   * Message in plain text
   * @minLength 1
   */
  message: string;
  attachments?: WebMessageAttachment[];
  attachmentIds?: string[];
}

/** SmsRequest model */
export interface SmsRequest {
  /**
   * The sender of the SMS
   * @minLength 1
   * @maxLength 11
   */
  sender: string;
  /** Mobile number to recipient in format +467[02369]\d{7} */
  recipient: string;
  /**
   * Message
   * @minLength 1
   */
  message: string;
  /** Indicates if the message is internal */
  internal?: boolean;
}

/** EmailAttachment model */
export interface EmailAttachment {
  /**
   * The attachment file name
   * @minLength 1
   */
  fileName: string;
  /**
   * The attachment (file) content as a BASE64-encoded string, max size 50 MB
   * @format base64
   */
  base64EncodedString: string;
}

/** EmailRequest model */
export interface EmailRequest {
  /**
   * Email address for sender
   * @format email
   */
  sender: string;
  /** Optional display name of sender on email. If left out, email will be displayed as sender name. */
  senderName?: string;
  /**
   * Email address for recipient
   * @format email
   */
  recipient: string;
  /**
   * Subject
   * @minLength 1
   */
  subject: string;
  /**
   * Message in html (optionally in BASE64 encoded format)
   * @minLength 1
   */
  htmlMessage: string;
  /**
   * Message in plain text
   * @minLength 1
   */
  message: string;
  /** Indicates if the message is internal */
  internal?: boolean;
  /** Headers for keeping track of email conversations */
  emailHeaders?: Record<string, string[]>;
  attachments?: EmailAttachment[];
  attachmentIds?: string[];
}

/** ConversationRequest model */
export interface ConversationRequest {
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

/** MessageRequest model */
export interface MessageRequest {
  /** The ID of the replied message */
  inReplyToMessageId?: string;
  /**
   * The content of the message.
   * @minLength 1
   */
  content: string;
}

/** UpdateErrandNoteRequest model */
export interface UpdateErrandNoteRequest {
  /**
   * The note subject
   * @minLength 1
   * @maxLength 255
   */
  subject: string;
  /**
   * The note body
   * @minLength 1
   * @maxLength 2048
   */
  body: string;
  /**
   * Modified by
   * @minLength 1
   */
  modifiedBy: string;
}

/** ErrandNote model */
export interface ErrandNote {
  /** Note ID */
  id?: string;
  /** Context for note */
  context?: string;
  /** Role of note creator */
  role?: string;
  /** Id of the client who is the owner of the note */
  clientId?: string;
  /** Party ID (e.g. a personId or an organizationId) */
  partyId?: string;
  /** The note subject */
  subject?: string;
  /** The note body */
  body?: string;
  /** Id for the case */
  caseId?: string;
  /** Created by */
  createdBy?: string;
  /** Modified by */
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

/** Conversation model */
export interface Conversation {
  /** Conversation ID */
  id?: string;
  /** The message-exchange topic */
  topic?: string;
  /** The conversation type */
  type?: ConversationType;
  relationIds?: string[];
  participants?: Identifier[];
  metadata?: KeyValues[];
}

/** Labels model */
export interface Labels {
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
  /** @format int32 */
  size?: number;
  content?: Errand[];
  /** @format int32 */
  number?: number;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  numberOfElements?: number;
  sort?: SortObject;
  pageable?: PageableObject;
  empty?: boolean;
}

export interface PageableObject {
  /** @format int64 */
  offset?: number;
  sort?: SortObject;
  unpaged?: boolean;
  paged?: boolean;
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  pageSize?: number;
}

export interface SortObject {
  empty?: boolean;
  unsorted?: boolean;
  sorted?: boolean;
}

/** Revision model */
export interface Revision {
  /** Unique id for the revision */
  id?: string;
  /** Unique id for the entity connected to the revision */
  entityId?: string;
  /** Type of entity for the revision */
  entityType?: string;
  /**
   * Version of the revision
   * @format int32
   */
  version?: number;
  /**
   * Timestamp when the revision was created
   * @format date-time
   */
  created?: string;
}

/** DifferenceResponse model */
export interface DifferenceResponse {
  operations?: Operation[];
}

/** Operation model */
export interface Operation {
  /** Type of operation */
  op?: string;
  /** Path to attribute */
  path?: string;
  /** Value of attribute */
  value?: string;
  /** Previous value of attribute */
  fromValue?: string;
}

/** FindErrandNotesRequest model */
export interface FindErrandNotesRequest {
  /**
   * Page number
   * @format int32
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * Result size per page
   * @format int32
   * @min 1
   * @max 1000
   * @default 100
   */
  limit?: number;
  /** Context for note */
  context?: string;
  /** Role of note creator */
  role?: string;
  /** Party id (e.g. a personId or an organizationId) */
  partyId?: string;
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
   */
  page?: number;
  /**
   * Displayed objects per page
   * @format int32
   */
  limit?: number;
  /**
   * Displayed objects on current page
   * @format int32
   */
  count?: number;
  /**
   * Total amount of hits based on provided search parameters
   * @format int64
   */
  totalRecords?: number;
  /**
   * Total amount of pages based on provided search parameters
   * @format int32
   */
  totalPages?: number;
}

/** Event model */
export interface Event {
  /** Type of event */
  type?: EventType;
  /** Event description */
  message?: string;
  /** Service that created event */
  owner?: string;
  /**
   * Timestamp when the event was created
   * @format date-time
   */
  created?: string;
  /** Reference to the snapshot of data at the time when the event was created */
  historyReference?: string;
  /** Source which the event refers to */
  sourceType?: string;
  metadata?: EventMetaData[];
}

/** Event Metadata model */
export interface EventMetaData {
  /** The key */
  key?: string;
  /** The value */
  value?: string;
}

export interface PageEvent {
  /** @format int32 */
  totalPages?: number;
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  size?: number;
  content?: Event[];
  /** @format int32 */
  number?: number;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  numberOfElements?: number;
  sort?: SortObject;
  pageable?: PageableObject;
  empty?: boolean;
}

export interface Communication {
  /** The communication ID */
  communicationID?: string;
  /** Sender of the communication. */
  sender?: string;
  /** The errand number */
  errandNumber?: string;
  /** If the communication is inbound or outbound from the perspective of case-data/e-service. */
  direction?: CommunicationDirectionEnum;
  /** The message body */
  messageBody?: string;
  /** The message body in HTML format */
  htmlMessageBody?: string;
  /**
   * The time the communication was sent
   * @format date-time
   */
  sent?: string;
  /** The email-subject of the communication */
  subject?: string;
  /** The communication was delivered by */
  communicationType?: CommunicationCommunicationTypeEnum;
  /** The mobile number or email adress the communication was sent to */
  target?: string;
  /** The recipients of the communication, if email */
  recipients?: string[];
  /** Indicates if the communication is internal */
  internal?: boolean;
  /** Signal if the communication has been viewed or not */
  viewed?: boolean;
  /** Headers for keeping track of email conversations */
  emailHeaders?: Record<string, string[]>;
  /** List of communicationAttachments on the message */
  communicationAttachments?: CommunicationAttachment[];
}

export interface CommunicationAttachment {
  /** The attachment ID */
  id?: string;
  /** The attachment file name */
  fileName?: string;
  /** The attachment MIME type */
  mimeType?: string;
}

/** Attachment model */
export interface Attachment {
  /** Attachment ID */
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
  /** The content of the message. */
  content?: string;
  readBy?: ReadBy[];
  attachments?: Attachment[];
  /** Type of message (user or system created) */
  type?: MessageTypeEnum;
}

export interface PageMessage {
  /** @format int32 */
  totalPages?: number;
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  size?: number;
  content?: Message[];
  /** @format int32 */
  number?: number;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  numberOfElements?: number;
  sort?: SortObject;
  pageable?: PageableObject;
  empty?: boolean;
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

/** ErrandAttachment model */
export interface ErrandAttachment {
  /** Unique identifier for the attachment */
  id?: string;
  /** Name of the file */
  fileName?: string;
  /** Mime type of the file */
  mimeType?: string;
  /**
   * The attachment created date
   * @format date-time
   */
  created?: string;
}

export interface CountResponse {
  /** @format int64 */
  count?: number;
}

/** If the communication is inbound or outbound from the perspective of case-data/e-service. */
export enum CommunicationDirectionEnum {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

/** The communication was delivered by */
export enum CommunicationCommunicationTypeEnum {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WEB_MESSAGE = 'WEB_MESSAGE',
}

/** Type of message (user or system created) */
export enum MessageTypeEnum {
  USER_CREATED = 'USER_CREATED',
  SYSTEM_CREATED = 'SYSTEM_CREATED',
}
