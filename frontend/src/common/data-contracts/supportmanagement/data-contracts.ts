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

/** Action to take on the source errand after handover */
export enum HandoverSourceAction {
  CLOSE = 'CLOSE',
  RETAIN = 'RETAIN',
  SUSPEND = 'SUSPEND',
}

/** Type of warning raised while building a handover preview: PARAMETER_SCHEMA_MISMATCH (a parameter references a json schema not registered in the target namespace, see 'key'/'detail'), ROLE_NOT_IN_TARGET (a stakeholder role on the source errand does not exist in the target namespace, see 'value') */
export enum WarningType {
  PARAMETER_SCHEMA_MISMATCH = 'PARAMETER_SCHEMA_MISMATCH',
  ROLE_NOT_IN_TARGET = 'ROLE_NOT_IN_TARGET',
}

/** Reason a target was auto-suggested for a namespace-bound field: NAME_EXACT (exact match on technical name), DISPLAY_NAME_EXACT (case-insensitive exact match on display name), RESOURCE_PATH_MATCH (match on hierarchical resource path, labels only) */
export enum MatchReason {
  NAME_EXACT = 'NAME_EXACT',
  DISPLAY_NAME_EXACT = 'DISPLAY_NAME_EXACT',
  RESOURCE_PATH_MATCH = 'RESOURCE_PATH_MATCH',
}

/** Request describing which namespace a source errand should be previewed for handover to */
export interface HandoverPreviewRequest {
  /**
   * Namespace the errand should be handed over to
   * @minLength 1
   * @pattern [\w|\-]+
   */
  targetNamespace: string;
  /** Municipality id the errand should be handed over to */
  targetMunicipalityId: string;
}

/** A category/type pair describing an errand classification */
export interface ClassificationOption {
  /** Category name */
  category?: string;
  /** Type name */
  type?: string;
}

/** Mapping suggestion for the namespace-bound classification (category/type) field */
export interface ClassificationMapping {
  /** Classification on the source errand */
  source?: ClassificationOption;
  /** Auto-suggested target category name, or null if no match was found */
  suggestedCategory?: string;
  /** Auto-suggested target type name, or null if no match was found */
  suggestedType?: string;
  /** Selectable types per category in the target namespace. Always present, may be empty */
  candidates: Record<string, string[]>;
}

/** Mapping suggestion for the namespace-bound contact reason field */
export interface ContactReasonMapping {
  /** Contact reason on the source errand */
  source?: string;
  /** Auto-suggested target contact reason, or null if no match was found */
  suggested?: string;
  /** All selectable contact reasons in the target namespace. Always present, may be empty */
  candidates: string[];
}

/** A selectable metadata option identified by its technical name and display name */
export interface MetadataOption {
  /** Technical name of the option */
  name?: string;
  /** Human readable display name of the option */
  displayName?: string;
}

/** Mapping suggestion for the namespace-bound status field */
export interface StatusMapping {
  /** Status on the source errand */
  source?: MetadataOption;
  /** Auto-suggested target status name, or null if no match was found */
  suggestedTarget?: string;
  /** Reason the target was suggested, or null if there is no suggestion */
  matchReason?: MatchReason;
  /** All selectable statuses in the target namespace. Always present, may be empty */
  candidates: MetadataOption[];
}

/** A label that can be chosen as the target for a source label */
export interface LabelCandidate {
  /** Unique id of the label in the target namespace */
  id?: string;
  /** Display name of the label */
  displayName?: string;
  /** Hierarchical resource path of the label */
  resourcePath?: string;
}

/** Mapping suggestion for a single namespace-bound label */
export interface LabelMapping {
  /** Unique id of the label on the source errand */
  sourceId?: string;
  /** Display name of the source label */
  sourceDisplayName?: string;
  /** Hierarchical resource path of the source label */
  sourceResourcePath?: string;
  /** Auto-suggested target label id, or null if no match was found */
  suggestedTargetId?: string;
  /** Reason the target was suggested, or null if there is no suggestion */
  matchReason?: MatchReason;
}

/** Label mapping section: the selectable target labels shared by every mapping, plus one mapping suggestion per source label */
export interface LabelMappingGroup {
  /** All selectable labels in the target namespace, shared by every mapping. Always present, may be empty */
  candidates: LabelCandidate[];
  /** Mapping suggestions, one entry per source label. Always present, may be empty */
  mappings: LabelMapping[];
}

/** Namespace-bound fields that require a human to decide how they should be mapped to the target namespace */
export interface MappingRequired {
  /** Status mapping suggestion */
  status?: StatusMapping;
  /** Classification (category/type) mapping suggestion */
  classification?: ClassificationMapping;
  /** Label mapping section: the selectable target labels plus one mapping suggestion per source label. Always present */
  labels: LabelMappingGroup;
  /** Contact reason mapping suggestion */
  contactReason?: ContactReasonMapping;
}

/** Fields that are copied automatically to the target namespace without manual mapping */
export interface DirectlyCopyable {
  /** Title of the source errand */
  title?: string;
  /** Priority of the source errand */
  priority?: Priority;
  /**
   * Number of stakeholders that will be copied
   * @format int32
   */
  stakeholderCount?: number;
  /**
   * Number of external tags that will be copied
   * @format int32
   */
  externalTagCount?: number;
  /**
   * Number of attachments that will be copied
   * @format int32
   */
  attachmentCount?: number;
}

/** A field that can not be copied to the target namespace */
export interface NotCopyable {
  /** Name of the field that can not be copied */
  field?: string;
  /** Reason the field can not be copied */
  reason?: string;
}

/** Options for handling the source errand after handover */
export interface SourceHandling {
  /** Selectable statuses in the source namespace, used when choosing how the source errand is handled after handover. Always present, may be empty */
  statusCandidates: MetadataOption[];
}

/** A warning raised while building the handover preview. The applicable fields depend on 'type' */
export interface Warning {
  /** Type of warning, acts as discriminator for which other fields are populated */
  type: WarningType;
  /** Key the warning relates to. Populated for PARAMETER_SCHEMA_MISMATCH */
  key?: string;
  /** Human readable detail describing the warning. Populated for PARAMETER_SCHEMA_MISMATCH */
  detail?: string;
  /** Value the warning relates to. Populated for ROLE_NOT_IN_TARGET */
  value?: string;
}

/** Preview of how a source errand would be handed over to another namespace, without any side effects */
export interface HandoverPreview {
  /** Fields that are copied automatically */
  directlyCopyable?: DirectlyCopyable;
  /** Namespace-bound fields that require manual mapping */
  mappingRequired?: MappingRequired;
  /** Options for handling the source errand after handover. Always present */
  sourceHandling: SourceHandling;
  /** Fields that can not be copied to the target namespace. Always present, may be empty */
  notCopyable: NotCopyable[];
  /** Warnings raised while building the preview. Always present, may be empty */
  warnings: Warning[];
}

/** Target system to handover the errand to */
export interface HandoverTarget {
  /**
   * Target namespace
   * @minLength 1
   * @example "OTHER_NAMESPACE"
   */
  namespace: string;
  /**
   * Target municipality id
   * @example "2281"
   */
  municipalityId?: string;
}

/** Field mappings to apply when creating the errand in the target system */
export interface HandoverMapping {
  /**
   * Status to set on the new errand
   * @example "NEW_CASE"
   */
  status?: string;
  /** Classification model */
  classification?: Classification;
  /** Label UUIDs to apply on the new errand */
  labels?: string[];
  /**
   * Contact reason to set on the new errand
   * @example "Printer issue"
   */
  contactReason?: string;
  /**
   * Channel to set on the new errand
   * @example "WEB_UI"
   */
  channel?: string;
}

/** Field values that override what is copied from the source errand */
export interface HandoverOverrides {
  /** Title override */
  title?: string;
  /** Description override */
  description?: string;
  /** Priority model */
  priority?: Priority;
  /** Assigned user id override */
  assignedUserId?: string;
  /** Assigned group id override */
  assignedGroupId?: string;
}

/** Flags controlling what data is copied from the source errand */
export interface HandoverInclude {
  /**
   * Include stakeholders
   * @default false
   */
  stakeholders?: boolean;
  /**
   * Include external tags
   * @default false
   */
  externalTags?: boolean;
  /**
   * Include parameters
   * @default false
   */
  parameters?: boolean;
  /**
   * Include JSON parameters
   * @default false
   */
  jsonParameters?: boolean;
  /**
   * Include attachments
   * @default false
   */
  attachments?: boolean;
  /**
   * Include business related flag
   * @default false
   */
  businessRelated?: boolean;
  /**
   * Include escalation email
   * @default false
   */
  escalationEmail?: boolean;
  /**
   * Include contact reason description
   * @default false
   */
  contactReasonDescription?: boolean;
}

/** Defines what happens to the source errand after handover */
export interface HandoverSourceHandling {
  /** Action to take on the source errand after handover */
  action: HandoverSourceAction;
  /**
   * Status to set on the source errand
   * @example "SOLVED"
   */
  status?: string;
  /**
   * Resolution to set on the source errand
   * @example "HANDED_OVER"
   */
  resolution?: string;
  /**
   * Closing comment to add to the source errand
   * @example "Överlämnad till annan drake"
   */
  closingComment?: string;
}

/** Request body for handing over an errand to another namespace */
export interface HandoverErrandRequest {
  /** Target system to handover the errand to */
  target: HandoverTarget;
  /** Field mappings to apply when creating the errand in the target system */
  mapping: HandoverMapping;
  /** Field values that override what is copied from the source errand */
  overrides?: HandoverOverrides;
  /** Flags controlling what data is copied from the source errand */
  include?: HandoverInclude;
  /** Defines what happens to the source errand after handover */
  sourceHandling?: HandoverSourceHandling;
}

/** Response body for a successful errand handover */
export interface HandoverErrand {
  /**
   * Id of the newly created errand in the target system
   * @example "f0882f1d-06bc-47fd-b017-1d8307f5ce95"
   */
  newErrandId?: string;
  /**
   * Errand number of the newly created errand
   * @example "KC-23010001"
   */
  newErrandNumber?: string;
  /** Target namespace and municipality the errand was handed over to */
  target?: HandoverTarget;
  /** Id of the relation created between the source and target errand */
  relationId?: string;
  /** Field mappings that were applied when creating the new errand */
  appliedMappings?: Record<string, string>;
  /** Non-fatal warnings that occurred during handover */
  warnings?: string[];
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
   * Display name for the namespace
   * @example "Kontaktcenter"
   */
  displayName: string;
  /**
   * Prefix for errand numbers in this namespace
   * @example "KC"
   */
  shortCode: string;
  /**
   * Time to live (in days) for notifications created in this namespace
   * @format int32
   * @example 40
   */
  notificationTTLInDays?: number;
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
  /**
   * If set to true access control will be enabled
   * @example true
   */
  accessControl?: boolean;
}

/** Label model */
export interface Label {
  /**
   * Label ID
   * @example "5f79a808-0ef3-4985-99b9-b12f23e202a7"
   */
  id?: string;
  /**
   * Label classification
   * @minLength 1
   * @example "subtype"
   */
  classification: string;
  /**
   * Display name for the label
   * @example "Nyckelkort"
   */
  displayName?: string;
  /**
   * Resource path
   * @example "/parent/child/keycard"
   */
  resourcePath?: string;
  /**
   * Resource name
   * @minLength 1
   * @example "keycard"
   */
  resourceName: string;
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
   * HTML template for email that will be sent when incoming mail is rejected
   * @example "<html><body>Errand is closed. Please open a new errand.</body></html>"
   */
  errandClosedEmailHTMLTemplate?: string | null;
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
   * HTML template for email that will be sent when incoming mail results in new errand
   * @example "<html><body>New errand is created.</body></html>"
   */
  errandNewEmailHTMLTemplate?: string | null;
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

/** Message-Exchange sync configuration */
export interface MessageExchangeSync {
  /**
   * Unique id
   * @format int64
   * @example 1
   */
  id?: number;
  /**
   * Message exchange namespace to search in. Does not map to supporManagement namespace.
   * @example "support"
   */
  namespace?: string;
  /**
   * Latest synced sequence number
   * @format int64
   * @example 333
   */
  latestSyncedSequenceNumber?: number;
  /**
   * Timestamp when the configuration was last modified
   * @format date-time
   * @example "2024-12-24T01:30:00+02:00"
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
  /** Display name for the status */
  displayName?: string | null;
  /** External display name for the status */
  externalDisplayName?: string | null;
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
   * @example "roleName"
   */
  name: string;
  /**
   * Display name for the role
   * @example "Role name"
   */
  displayName?: string | null;
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
   * @minLength 1
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
   * ID
   * @format int64
   * @example 123
   */
  id?: number;
  /**
   * Reason for contact
   * @minLength 1
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
   * @example "Category name"
   */
  name?: string;
  /**
   * Display name for the category
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
   * @minLength 1
   * @example "typename"
   */
  name: string;
  /**
   * Display name for the type
   * @example "Displayed name"
   */
  displayName?: string;
  /**
   * Email for where to escalate the errand if needed
   * @format email
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
  category?: string;
  /**
   * Type of errand
   * @example "OTHER_ISSUES"
   */
  type?: string;
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
  title?: string;
  /** Priority model */
  priority?: Priority;
  stakeholders?: Stakeholder[];
  /** @uniqueItems true */
  externalTags?: ExternalTag[];
  /** Parameters for the errand */
  parameters?: Parameter[];
  /** JSON parameters for the errand */
  jsonParameters?: JsonParameter[];
  /** Classification model */
  classification?: Classification;
  /**
   * Status for the errand
   * @example "NEW_CASE"
   */
  status?: string;
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
  reporterUserId?: string;
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
   * @format email
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
   * @maxLength 4096
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
  /** List of labels for the errand */
  labels?: ErrandLabel[];
  /** List of active notifications for the errand */
  activeNotifications?: Notification[];
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

/** Errand label model */
export interface ErrandLabel {
  /**
   * Label ID
   * @example "5f79a808-0ef3-4985-99b9-b12f23e202a7"
   */
  id?: string;
  /**
   * Label classification
   * @example "subtype"
   */
  classification?: string;
  /**
   * Display name for the label
   * @example "Nyckelkort"
   */
  displayName?: string;
  /**
   * Resource path
   * @example "/parent/child/xxx"
   */
  resourcePath?: string;
  /**
   * Resource name
   * @example "keycard"
   */
  resourceName?: string;
}

/** External tag model */
export interface ExternalTag {
  /**
   * Key for external tag
   * @minLength 1
   * @example "caseId"
   */
  key: string;
  /**
   * Value for external tag
   * @minLength 1
   * @example "8849-2848"
   */
  value: string;
}

/** List of active notifications for the errand */
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
  ownerFullName?: string;
  /**
   * Owner id of the notification
   * @example "AD01"
   */
  ownerId?: string;
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
  type?: string;
  /**
   * Subtype of the notification
   * @example "ATTACHMENT"
   */
  subtype?: string;
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
   * Acknowledged status of the notification (global level). I.e. this notification is acknowledged by anyone.
   * @example true
   */
  globalAcknowledged?: boolean;
  /**
   * Acknowledged status of the notification (owner level). I.e. this notification is acknowledged by the owner of this notification.
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

/** JSON Parameter model */
export interface JsonParameter {
  /**
   * Parameter key/name
   * @minLength 1
   */
  key: string;
  /**
   * JSON structure value
   * @example {"firstName":"Joe","lastName":"Doe"}
   */
  value: any;
  /**
   * ID referencing a schema in the json-schema service
   * @minLength 1
   */
  schemaId: string;
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
  /** Parameters for the stakeholder */
  parameters?: Parameter[];
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
   * @minLength 1
   * @maxLength 255
   * @example "This is a subject"
   */
  subject: string;
  /**
   * The note body
   * @minLength 1
   * @maxLength 2048
   * @example "This is a note"
   */
  body: string;
  /**
   * Created by
   * @minLength 1
   * @example "John Doe"
   */
  createdBy: string;
}

/** WebMessageAttachment model */
export interface WebMessageAttachment {
  /**
   * The attachment file name
   * @minLength 1
   * @example "test.txt"
   */
  fileName: string;
  /**
   * The attachment (file) content as a BASE64-encoded string, max size 50 MB
   * @format base64
   * @example "aGVsbG8gd29ybGQK"
   */
  base64EncodedString: string;
}

/** WebMessageRequest model */
export interface WebMessageRequest {
  /**
   * Indicates if the message is internal
   * @example false
   */
  internal?: boolean;
  /**
   * Indicates if the message should be dispatched with messaging or not
   * @default true
   * @example true
   */
  dispatch?: boolean;
  /**
   * Message in plain text
   * @minLength 1
   * @example "Message in plain text"
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
   * @example "sender"
   */
  sender: string;
  /**
   * Mobile number to recipient in format +467[02369]\d{7}
   * @example "+46701740605"
   */
  recipient: string;
  /**
   * Message
   * @minLength 1
   */
  message: string;
  /**
   * Indicates if the message is internal
   * @example false
   */
  internal?: boolean;
}

/** EmailAttachment model */
export interface EmailAttachment {
  /**
   * The attachment file name
   * @minLength 1
   * @example "test.txt"
   */
  fileName: string;
  /**
   * The attachment (file) content as a BASE64-encoded string, max size 50 MB
   * @format base64
   * @example "aGVsbG8gd29ybGQK"
   */
  base64EncodedString: string;
}

/** EmailRequest model */
export interface EmailRequest {
  /**
   * Email address for sender
   * @format email
   * @example "sender@sender.se"
   */
  sender: string;
  /**
   * Optional display name of sender on email. If left out, email will be displayed as sender name.
   * @example "Firstname Lastname"
   */
  senderName?: string;
  /**
   * Email address for recipient
   * @format email
   * @example "recipient@recipient.se"
   */
  recipient: string;
  /**
   * Subject
   * @minLength 1
   * @example "Subject"
   */
  subject: string;
  /**
   * Message in html (optionally in BASE64 encoded format)
   * @minLength 1
   * @example "<html>HTML-formatted message</html>"
   */
  htmlMessage: string;
  /**
   * Message in plain text
   * @minLength 1
   * @example "Message in plain text"
   */
  message: string;
  /**
   * Indicates if the message is internal
   * @example false
   */
  internal?: boolean;
  /**
   * Headers for keeping track of email conversations
   * @example {"IN_REPLY_TO":["reply-to@example.com"],"REFERENCES":["reference1","reference2"],"MESSAGE_ID":["123456789"]}
   */
  emailHeaders?: Record<string, string[]>;
  attachments?: EmailAttachment[];
  attachmentIds?: string[];
}

/** ConversationRequest model */
export interface ConversationRequest {
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

/** Message body */
export interface MessageRequest {
  /**
   * The ID of the replied message
   * @example "1aefbbb8-de82-414b-b5d7-ba7c5bbe4506"
   */
  inReplyToMessageId?: string;
  /**
   * The content of the message.
   * @minLength 1
   * @example "Hello, how can I help you?"
   */
  content: string;
}

/** UpdateErrandNoteRequest model */
export interface UpdateErrandNoteRequest {
  /**
   * The note subject
   * @minLength 1
   * @maxLength 255
   * @example "This is a subject"
   */
  subject: string;
  /**
   * The note body
   * @minLength 1
   * @maxLength 2048
   * @example "This is a note"
   */
  body: string;
  /**
   * Modified by
   * @minLength 1
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

/** Conversation model */
export interface Conversation {
  /**
   * Conversation ID
   * @example "1aefbbb8-de82-414b-b5d7-ba7c5bbe4506"
   */
  id?: string;
  /**
   * The message-exchange topic
   * @example "The conversation topic"
   */
  topic?: string;
  /** ConversationType model */
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
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  size?: number;
  content?: Errand[];
  /** @format int32 */
  number?: number;
  sort?: SortObject;
  /** @format int32 */
  numberOfElements?: number;
  pageable?: PageableObject;
  empty?: boolean;
}

export interface PageableObject {
  /** @format int64 */
  offset?: number;
  sort?: SortObject;
  /** @format int32 */
  pageNumber?: number;
  /** @format int32 */
  pageSize?: number;
  paged?: boolean;
  unpaged?: boolean;
}

export interface SortObject {
  empty?: boolean;
  sorted?: boolean;
  unsorted?: boolean;
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

export interface PageEvent {
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  size?: number;
  content?: Event[];
  /** @format int32 */
  number?: number;
  sort?: SortObject;
  /** @format int32 */
  numberOfElements?: number;
  pageable?: PageableObject;
  empty?: boolean;
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
   * The message body in HTML format
   * @example "<p>Hello world</p>"
   */
  htmlMessageBody?: string;
  /**
   * The time the communication was sent
   * @format date-time
   */
  sent?: string;
  /**
   * The email-subject of the communication
   * @example "Hello world"
   */
  subject?: string;
  /**
   * The communication was delivered by
   * @example "EMAIL"
   */
  communicationType?: CommunicationCommunicationTypeEnum;
  /**
   * The mobile number or email adress the communication was sent to
   * @example "+46701740605"
   */
  target?: string;
  /**
   * The recipients of the communication, if email
   * @example ["kalle.anka@ankeborg.se"]
   */
  recipients?: string[];
  /**
   * Indicates if the communication is internal
   * @example false
   */
  internal?: boolean;
  /**
   * Signal if the communication has been viewed or not
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
  id?: string;
  /**
   * The attachment file name
   * @example "test.txt"
   */
  fileName?: string;
  /**
   * The attachment MIME type
   * @example "text/plain"
   */
  mimeType?: string;
}

/** Attachment model */
export interface Attachment {
  /**
   * Attachment ID
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
   * @example "Hello, how can I help you?"
   */
  content?: string;
  readBy?: ReadBy[];
  attachments?: Attachment[];
  /**
   * Type of message (user or system created)
   * @example "USER_CREATED"
   */
  type?: MessageTypeEnum;
}

export interface PageMessage {
  /** @format int64 */
  totalElements?: number;
  /** @format int32 */
  totalPages?: number;
  first?: boolean;
  last?: boolean;
  /** @format int32 */
  size?: number;
  content?: Message[];
  /** @format int32 */
  number?: number;
  sort?: SortObject;
  /** @format int32 */
  numberOfElements?: number;
  pageable?: PageableObject;
  empty?: boolean;
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

/** ErrandAttachment model */
export interface ErrandAttachment {
  /**
   * Unique identifier for the attachment
   * @example "cb20c51f-fcf3-42c0-b613-de563634a8ec"
   */
  id?: string;
  /**
   * Name of the file
   * @example "my-file.txt"
   */
  fileName?: string;
  /** Mime type of the file */
  mimeType?: string;
  /**
   * The attachment created date
   * @format date-time
   * @example "2023-01-01T00:00:00Z"
   */
  created?: string;
}

export interface CountResponse {
  /** @format int64 */
  count?: number;
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
 * The communication was delivered by
 * @example "EMAIL"
 */
export enum CommunicationCommunicationTypeEnum {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WEB_MESSAGE = 'WEB_MESSAGE',
}

/**
 * Type of message (user or system created)
 * @example "USER_CREATED"
 */
export enum MessageTypeEnum {
  USER_CREATED = 'USER_CREATED',
  SYSTEM_CREATED = 'SYSTEM_CREATED',
}
