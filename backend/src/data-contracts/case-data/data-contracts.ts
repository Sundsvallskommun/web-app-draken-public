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

/** An stakeholder may have one or more addresses. For example one POSTAL_ADDRESS and another INVOICE_ADDRESS. */
export interface AddressDTO {
  addressCategory?: AddressDtoAddressCategoryEnum;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Testvägen"
   */
  street?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "18"
   */
  houseNumber?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "123 45"
   */
  postalCode?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvall"
   */
  city?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Sverige"
   */
  country?: string;
  /**
   * c/o
   * @minLength 0
   * @maxLength 255
   * @example "Test Testorsson"
   */
  careOf?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Test Testorsson"
   */
  attention?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "SUNDSVALL LJUSTA 7:2"
   */
  propertyDesignation?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "LGH 1001"
   */
  apartmentNumber?: string;
  isZoningPlanArea?: boolean;
  /**
   * Only in combination with addressCategory: INVOICE_ADDRESS
   * @minLength 0
   * @maxLength 255
   */
  invoiceMarking?: string;
  location?: CoordinatesDTO;
}

export interface ContactInformationDTO {
  contactType?: ContactInformationDtoContactTypeEnum;
  /**
   * @minLength 0
   * @maxLength 255
   */
  value?: string;
}

export interface CoordinatesDTO {
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

export interface StakeholderDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  type: StakeholderDtoTypeEnum;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Test"
   */
  firstName?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Testorsson"
   */
  lastName?: string;
  /** @example "3ed5bc30-6308-4fd5-a5a7-78d7f96f4438" */
  personId?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvalls testfabrik"
   */
  organizationName?: string;
  /**
   * Organization number with 10 or 12 digits.
   * @minLength 0
   * @maxLength 255
   * @pattern ^((18|19|20|21)\d{6}|\d{6})-(\d{4})$
   * @example "19901010-1234"
   */
  organizationNumber?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Test Testorsson"
   */
  authorizedSignatory?: string;
  /**
   * AD-account
   * @minLength 0
   * @maxLength 36
   */
  adAccount?: string;
  /** An stakeholder can have one or more roles. */
  roles: string[];
  /** An stakeholder may have one or more addresses. For example one POSTAL_ADDRESS and another INVOICE_ADDRESS. */
  addresses?: AddressDTO[];
  contactInformation?: ContactInformationDTO[];
  extraParameters?: Record<string, string>;
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

export interface StatusDTO {
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Ärende inkommit"
   */
  statusType?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Ärende har kommit in från e-tjänsten."
   */
  description?: string;
  /** @format date-time */
  dateTime?: string;
}

export interface FacilityDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "En fritextbeskrivning av facility."
   */
  description?: string;
  /** An stakeholder may have one or more addresses. For example one POSTAL_ADDRESS and another INVOICE_ADDRESS. */
  address?: AddressDTO;
  /**
   * The name on the sign.
   * @minLength 0
   * @maxLength 255
   * @example "Sundsvalls testfabrik"
   */
  facilityCollectionName?: string;
  mainFacility?: boolean;
  facilityType?: string;
  extraParameters?: Record<string, string>;
}

export interface AttachmentDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  category?: string;
  name?: string;
  note?: string;
  extension?: string;
  mimeType?: string;
  file?: string;
  errandNumber?: string;
  extraParameters?: Record<string, string>;
}

export interface DecisionDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  decisionType?: DecisionDtoDecisionTypeEnum;
  decisionOutcome?: DecisionDtoDecisionOutcomeEnum;
  /**
   * @minLength 0
   * @maxLength 100000
   */
  description?: string;
  law?: LawDTO[];
  decidedBy?: StakeholderDTO;
  /** @format date-time */
  decidedAt?: string;
  /** @format date-time */
  validFrom?: string;
  /** @format date-time */
  validTo?: string;
  attachments?: AttachmentDTO[];
  extraParameters?: Record<string, string>;
}

export interface LawDTO {
  /**
   * @minLength 0
   * @maxLength 255
   */
  heading?: string;
  /**
   * @minLength 0
   * @maxLength 255
   */
  sfs?: string;
  /**
   * @minLength 0
   * @maxLength 255
   */
  chapter?: string;
  /**
   * @minLength 0
   * @maxLength 255
   */
  article?: string;
}

export interface AppealDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  /**
   * @minLength 0
   * @maxLength 100000
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
export interface EmailHeaderDTO {
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
  messageID?: string;
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
  familyID?: string;
  /**
   * OpenE caseID
   * @example "12"
   */
  externalCaseID?: string;
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
  userID?: string;
  /** Message classification */
  classification?: Classification;
  /** List of attachmentRequests on the message */
  attachmentRequests?: MessageAttachment[];
  /** List of email headers on the message */
  emailHeaders?: EmailHeaderDTO[];
}

export interface ErrandDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  /** @example "PRH-2022-000001" */
  errandNumber?: string;
  /**
   * Case ID from the client.
   * @minLength 0
   * @maxLength 255
   * @example "caa230c6-abb4-4592-ad9a-34e263c2787b"
   */
  externalCaseId?: string;
  caseType?: string;
  /**
   * How the errand was created
   * @example "EMAIL"
   */
  channel?: ErrandDtoChannelEnum;
  /** @default "MEDIUM" */
  priority?: ErrandDtoPriorityEnum;
  /**
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
   * @minLength 0
   * @maxLength 255
   */
  diaryNumber?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Aktualisering"
   */
  phase?: string;
  statuses?: StatusDTO[];
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
  /**
   * The time the application was received.
   * @format date-time
   */
  applicationReceived?: string;
  /**
   * Process-ID from ProcessEngine
   * @example "c3cb9123-4ed2-11ed-ac7c-0242ac110003"
   */
  processId?: string;
  stakeholders?: StakeholderDTO[];
  facilities?: FacilityDTO[];
  decisions?: DecisionDTO[];
  appeals?: AppealDTO[];
  notes?: NoteDTO[];
  /** Messages connected to this errand. Get message information from Message-API. */
  messageIds?: string[];
  /** The client who created the errand. WSO2-username. */
  createdByClient?: string;
  /** The most recent client who updated the errand. WSO2-username. */
  updatedByClient?: string;
  /** The user who created the errand. */
  createdBy?: string;
  /** The most recent user who updated the errand. */
  updatedBy?: string;
  extraParameters?: Record<string, string>;
}

export interface NoteDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Motivering till bifall"
   */
  title?: string;
  /**
   * @minLength 0
   * @maxLength 10000
   * @example "Den sökande har rätt till parkeringstillstånd eftersom alla kriterier uppfylls."
   */
  text?: string;
  /**
   * AD-account for the user who created the note.
   * @minLength 0
   * @maxLength 36
   * @example "user"
   */
  createdBy?: string;
  /**
   * AD-account for the user who last modified the note.
   * @minLength 0
   * @maxLength 36
   * @example "user"
   */
  updatedBy?: string;
  /** The type of note */
  noteType?: NoteType;
  extraParameters?: Record<string, string>;
}

/**
 * The type of note
 * @example "INTERNAL"
 */
export enum NoteType {
  INTERNAL = 'INTERNAL',
  PUBLIC = 'PUBLIC',
}

export interface PatchErrandDTO {
  /**
   * Case ID from the client.
   * @minLength 0
   * @maxLength 255
   * @example "caa230c6-abb4-4592-ad9a-34e263c2787b"
   */
  externalCaseId?: string;
  /** @example "PARKING_PERMIT" */
  caseType?: PatchErrandDtoCaseTypeEnum;
  /** @example "MEDIUM" */
  priority?: PatchErrandDtoPriorityEnum;
  /**
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
   * @minLength 0
   * @maxLength 255
   */
  diaryNumber?: string;
  /**
   * @minLength 0
   * @maxLength 255
   * @example "Aktualisering"
   */
  phase?: string;
  /** The facilities in the case */
  facilities?: FacilityDTO[];
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
  /**
   * The time the application was received.
   * @format date-time
   */
  applicationReceived?: string;
  extraParameters?: Record<string, string>;
}

export interface PatchDecisionDTO {
  decisionType?: PatchDecisionDtoDecisionTypeEnum;
  decisionOutcome?: PatchDecisionDtoDecisionOutcomeEnum;
  /**
   * @minLength 0
   * @maxLength 1000
   */
  description?: string;
  /** @format date-time */
  decidedAt?: string;
  /** @format date-time */
  validFrom?: string;
  /** @format date-time */
  validTo?: string;
  extraParameters?: Record<string, string>;
}

export interface PatchAppealDTO {
  /** @format int64 */
  id?: number;
  /** @format int32 */
  version?: number;
  /** @format date-time */
  created?: string;
  /** @format date-time */
  updated?: string;
  /**
   * @minLength 0
   * @maxLength 100000
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
  value?: Value;
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

export interface HistoryDTO {
  changeType?: string;
  commitMetadata?: CommitMetadata;
  globalId?: GlobalId;
  property?: string;
  propertyChangeType?: string;
  entryChanges?: EntryChangesItem[];
  left?: string;
  right?: string;
  elementChanges?: ElementChangesItem[];
}

export interface OwnerId {
  /** @format int32 */
  cdoId?: number;
  entity?: string;
}

export interface Value {
  /** @format int32 */
  cdoId?: number;
  entity?: string;
  valueObject?: string;
  fragment?: string;
  ownerId?: OwnerId;
}

export interface GetParkingPermitDTO {
  artefactPermitNumber?: string;
  artefactPermitStatus?: string;
  /** @format int64 */
  errandId?: number;
  errandDecision?: DecisionDTO;
}

/** List of attachments on the message */
export interface AttachmentResponse {
  /**
   * The attachment ID
   * @example "aGVsbG8gd29ybGQK"
   */
  attachmentID: string;
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
  messageID?: string;
  /**
   * The errand number
   * @example "PRH-2022-000001"
   */
  errandNumber?: string;
  /**
   * If the message is inbound or outbound from the perspective of case-data/e-service.
   * @example "INBOUND"
   */
  direction?: MessageResponseDirectionEnum;
  /**
   * The E-service ID that the message was created in
   * @example "12"
   */
  familyID?: string;
  /**
   * OpenE caseID
   * @example "12"
   */
  externalCaseID?: string;
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
  userID?: string;
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
  emailHeaders?: EmailHeaderDTO[];
}

export interface MessageAttachmentDTO {
  /**
   * The attachment ID
   * @example "12345678-1234-1234-1234-123456789012"
   */
  attachmentID: string;
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
  /**
   * The attachment (file) content as a BASE64-encoded string
   * @example "aGVsbG8gd29ybGQK"
   */
  content: string;
}

export interface ExtraParameterDTO {
  extraParameters?: Record<string, string>;
}

export interface PageErrandDTO {
  /** @format int32 */
  totalPages?: number;
  /** @format int64 */
  totalElements?: number;
  pageable?: PageableObject;
  /** @format int32 */
  size?: number;
  content?: ErrandDTO[];
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

export enum AddressDtoAddressCategoryEnum {
  POSTAL_ADDRESS = 'POSTAL_ADDRESS',
  INVOICE_ADDRESS = 'INVOICE_ADDRESS',
  VISITING_ADDRESS = 'VISITING_ADDRESS',
}

export enum ContactInformationDtoContactTypeEnum {
  CELLPHONE = 'CELLPHONE',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
}

export enum StakeholderDtoTypeEnum {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
}

export enum DecisionDtoDecisionTypeEnum {
  RECOMMENDED = 'RECOMMENDED',
  PROPOSED = 'PROPOSED',
  FINAL = 'FINAL',
}

export enum DecisionDtoDecisionOutcomeEnum {
  APPROVAL = 'APPROVAL',
  REJECTION = 'REJECTION',
  DISMISSAL = 'DISMISSAL',
  CANCELLATION = 'CANCELLATION',
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
 * How the errand was created
 * @example "EMAIL"
 */
export enum ErrandDtoChannelEnum {
  ESERVICE = 'ESERVICE',
  EMAIL = 'EMAIL',
  WEB_UI = 'WEB_UI',
  MOBILE = 'MOBILE',
  SYSTEM = 'SYSTEM',
}

/** @default "MEDIUM" */
export enum ErrandDtoPriorityEnum {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/** @example "PARKING_PERMIT" */
export enum PatchErrandDtoCaseTypeEnum {
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

/** @example "MEDIUM" */
export enum PatchErrandDtoPriorityEnum {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum PatchDecisionDtoDecisionTypeEnum {
  RECOMMENDED = 'RECOMMENDED',
  PROPOSED = 'PROPOSED',
  FINAL = 'FINAL',
}

export enum PatchDecisionDtoDecisionOutcomeEnum {
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
