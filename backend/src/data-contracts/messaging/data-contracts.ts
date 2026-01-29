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

export enum MessageType {
  MESSAGE = "MESSAGE",
  EMAIL = "EMAIL",
  SMS = "SMS",
  WEB_MESSAGE = "WEB_MESSAGE",
  DIGITAL_MAIL = "DIGITAL_MAIL",
  DIGITAL_INVOICE = "DIGITAL_INVOICE",
  SNAIL_MAIL = "SNAIL_MAIL",
  LETTER = "LETTER",
  SLACK = "SLACK",
}

export enum MessageStatus {
  PENDING = "PENDING",
  AWAITING_FEEDBACK = "AWAITING_FEEDBACK",
  SENT = "SENT",
  NOT_SENT = "NOT_SENT",
  FAILED = "FAILED",
  NO_CONTACT_SETTINGS_FOUND = "NO_CONTACT_SETTINGS_FOUND",
  NO_CONTACT_WANTED = "NO_CONTACT_WANTED",
}

export interface Problem {
  /** @format uri */
  instance?: string;
  /** @format uri */
  type?: string;
  parameters?: Record<string, any>;
  title?: string;
  detail?: string;
  status?: StatusType;
}

export interface StatusType {
  /** @format int32 */
  statusCode?: number;
  reasonPhrase?: string;
}

/** Response model for a mailbox */
export interface Mailbox {
  /** partyId for the person the mailbox belongs to */
  partyId?: string;
  /** If not reachable, the reason why */
  reason?: string;
  /** Name of the mailbox, e.g. Kivra */
  supplier?: string;
  /** If it's possible to send messages to this mailbox */
  reachable?: boolean;
}

/** Attachment */
export interface DigitalMailAttachment {
  /** Content type */
  contentType?: DigitalMailAttachmentContentTypeEnum;
  /**
   * Content (BASE64-encoded)
   * @minLength 1
   */
  content: string;
  /**
   * Filename
   * @minLength 1
   */
  filename: string;
}

export interface DigitalMailParty {
  /** @minItems 1 */
  partyIds: string[];
  /** External references */
  externalReferences?: ExternalReference[];
}

export interface DigitalMailRequest {
  /** Party */
  party: DigitalMailParty;
  /** Sender */
  sender?: DigitalMailSender;
  /** Subject */
  subject?: string | null;
  /** Department and unit that should be billed for the message */
  department?: string | null;
  /** Content type */
  contentType?: DigitalMailRequestContentTypeEnum;
  /** Body (plain text if contentType is set to 'text/plain', BASE64-encoded if contentType is set to 'application/html') */
  body?: string;
  /** Attachments */
  attachments?: DigitalMailAttachment[];
}

export interface DigitalMailSender {
  /** Support info */
  supportInfo: DigitalMailSenderSupportInfo;
}

/** Support info */
export interface DigitalMailSenderSupportInfo {
  /**
   * Text
   * @minLength 1
   */
  text: string;
  /**
   * E-mail address
   * @format email
   */
  emailAddress?: string;
  /** Phone number */
  phoneNumber?: string;
  /** URL */
  url?: string;
}

export interface ExternalReference {
  /**
   * The external reference key
   * @minLength 1
   */
  key: string;
  /**
   * The external reference value
   * @minLength 1
   */
  value: string;
}

/** Delivery result */
export interface DeliveryResult {
  /**
   * The delivery id
   * @format uuid
   */
  deliveryId?: string;
  /** Message type */
  messageType?: MessageType;
  /** Status */
  status?: MessageStatus;
}

/** Message batch result */
export interface MessageBatchResult {
  /**
   * The batch id
   * @format uuid
   */
  batchId?: string;
  /** The individual message results */
  messages?: MessageResult[];
}

/** Message result */
export interface MessageResult {
  /**
   * The message id
   * @format uuid
   */
  messageId?: string;
  /** The message deliveries */
  deliveries?: DeliveryResult[];
}

/** Attachment */
export interface WebMessageAttachment {
  /** File name */
  fileName?: string;
  /** Mime-type */
  mimeType?: string;
  /** BASE64-encoded file, max size 50 MB */
  base64Data?: string;
}

export interface WebMessageParty {
  /**
   * The message party id
   * @format uuid
   */
  partyId?: string;
  /** External references */
  externalReferences?: ExternalReference[];
}

export interface WebMessageRequest {
  /** Party */
  party: WebMessageParty;
  /**
   * Message
   * @minLength 1
   */
  message: string;
  /** The sender */
  sender?: WebMessageSender;
  /**
   * Send as owner
   * @default false
   */
  sendAsOwner?: boolean;
  /** Determines if the message should be added to the internal or external OeP instance */
  oepInstance?: WebMessageRequestOepInstanceEnum;
  /**
   * @maxItems 10
   * @minItems 1
   */
  attachments?: WebMessageAttachment[];
}

/** Sender */
export interface WebMessageSender {
  /** The user ID of the sender. I.e. employee ID */
  userId?: string;
}

export interface Address {
  /** The first name of the recipient */
  firstName?: string;
  /** The last name of the recipient */
  lastName?: string;
  /** The address */
  address?: string;
  /** The apartment number */
  apartmentNumber?: string;
  /** The care of */
  careOf?: string;
  /** The zip code */
  zipCode?: string;
  /** The city */
  city?: string;
  /** The country */
  country?: string;
}

/** Attachment */
export interface SnailmailAttachment {
  /**
   * The attachment filename
   * @minLength 1
   */
  filename: string;
  /** The attachment content type */
  contentType?: string;
  /** The attachment (file) content as a BASE64-encoded string */
  content: string;
}

export interface SnailmailParty {
  /** The message party id */
  partyId?: string;
  /** External references */
  externalReferences?: ExternalReference[];
}

export interface SnailmailRequest {
  /** Party */
  party?: SnailmailParty;
  /** Address */
  address?: Address;
  /**
   * Department and unit that should be billed
   * @minLength 1
   */
  department: string;
  /** If the letter to send deviates from the standard */
  deviation?: string;
  /** @minItems 1 */
  attachments?: SnailmailAttachment[];
  /** Used by snailmail-sender to set the name of the organization folder */
  folderName?: string;
}

export interface SmsRequest {
  /** Party */
  party?: SmsRequestParty;
  /**
   * The sender of the SMS, swedish letters(å,ä,ö) will be replaced by (a,a,o) respectively
   * @minLength 3
   * @maxLength 11
   */
  sender?: string;
  /** Mobile number. Should start with +467x */
  mobileNumber: string;
  /**
   * Message
   * @minLength 1
   */
  message: string;
  /** Priority (optional, will be defaulted to NORMAL if not present) */
  priority?: SmsRequestPriorityEnum;
  /** Department */
  department?: string;
}

export interface SmsRequestParty {
  /** The message party id */
  partyId?: string;
  /** External references */
  externalReferences?: ExternalReference[];
}

export interface SmsBatchRequest {
  /**
   * The sender of the SMS, swedish letters(å,ä,ö) will be replaced by (a,a,o) respectively
   * @minLength 3
   * @maxLength 11
   */
  sender?: string;
  /**
   * Message to send as sms
   * @minLength 1
   */
  message: string;
  /** Priority (optional, will be defaulted to NORMAL if not present) */
  priority?: SmsBatchRequestPriorityEnum;
  /** Department */
  department?: string;
  /**
   * Parties to send the sms message to
   * @minItems 1
   */
  parties: SmsBatchRequestParty[];
}

export interface SmsBatchRequestParty {
  /** The message party id (optional) */
  partyId?: string;
  /** Mobile number, which should start with +467x */
  mobileNumber: string;
}

export interface SlackRequest {
  /**
   * App/bot token
   * @minLength 1
   */
  token: string;
  /**
   * Channel name/id
   * @minLength 1
   */
  channel: string;
  /**
   * Message (supports Slack markdown formatting)
   * @minLength 1
   */
  message: string;
}

export interface Email {
  /**
   * The sender of the e-mail
   * @minLength 1
   */
  name: string;
  /**
   * Sender e-mail address
   * @format email
   * @minLength 1
   */
  address: string;
  /**
   * Reply-to e-mail address
   * @format email
   */
  replyTo?: string;
}

export interface Message {
  /** Party */
  party: MessageParty;
  /** Filters */
  filters?: Record<string, string[]>;
  /** Sender */
  sender?: MessageSender;
  /** The message subject (for E-mails) */
  subject?: string;
  /**
   * Plain-text message text
   * @minLength 1
   */
  message: string;
  /** HTML message text, for e-mails (BASE64-encoded) */
  htmlMessage?: string;
}

export interface MessageParty {
  /**
   * The message party id
   * @format uuid
   */
  partyId: string;
  /** External references */
  externalReferences?: ExternalReference[];
}

export interface MessageRequest {
  /**
   * The messages to be sent
   * @minItems 1
   */
  messages: Message[];
}

export interface MessageSender {
  email?: Email;
  sms?: Sms;
}

export interface Sms {
  /**
   * The sender of the SMS
   * @minLength 0
   * @maxLength 11
   */
  name: string;
}

/** Attachment */
export interface LetterAttachment {
  /** Delivery mode */
  deliveryMode: LetterAttachmentDeliveryModeEnum;
  /**
   * Filename
   * @minLength 1
   */
  filename: string;
  /** Content type */
  contentType?: LetterAttachmentContentTypeEnum;
  /**
   * Content (BASE64-encoded)
   * @minLength 1
   */
  content: string;
}

export interface LetterParty {
  partyIds?: string[];
  addresses?: Address[];
  /** External references */
  externalReferences?: ExternalReference[];
}

export interface LetterRequest {
  /** Party */
  party: LetterParty;
  /** Subject */
  subject: string;
  /** Sender */
  sender?: LetterSender;
  /** Content type */
  contentType?: LetterRequestContentTypeEnum;
  /** Body (plain text if contentType is set to 'text/plain', BASE64-encoded if contentType is set to 'text/html') */
  body?: string;
  /**
   * Department and unit that should be billed in case of snailmail
   * @minLength 1
   */
  department: string;
  /** If the letter to send deviates from the standard */
  deviation?: string;
  /** @minItems 1 */
  attachments: LetterAttachment[];
}

export interface LetterSender {
  /** Support info */
  supportInfo: LetterSenderSupportInfo;
}

/** Support info */
export interface LetterSenderSupportInfo {
  /**
   * Text
   * @minLength 1
   */
  text: string;
  /**
   * E-mail address
   * @format email
   */
  emailAddress?: string;
  /** Phone number */
  phoneNumber?: string;
  /** URL */
  url?: string;
}

/** Attachment */
export interface EmailAttachment {
  /**
   * The attachment filename
   * @minLength 1
   */
  name: string;
  /** The attachment content type */
  contentType?: string;
  /** The attachment (file) content as a BASE64-encoded string */
  content: string;
}

export interface EmailRequest {
  /** Party */
  party?: EmailRequestParty;
  /**
   * Recipient e-mail address
   * @format email
   * @minLength 1
   */
  emailAddress: string;
  /**
   * E-mail subject
   * @minLength 1
   */
  subject: string;
  /** E-mail plain-text body */
  message?: string;
  /** E-mail HTML body (BASE64-encoded) */
  htmlMessage?: string;
  /** Sender */
  sender?: EmailSender;
  attachments?: EmailAttachment[];
  /** Headers */
  headers?: Record<string, string[]>;
}

export interface EmailRequestParty {
  /**
   * The message party id
   * @format uuid
   */
  partyId?: string;
  /** External references */
  externalReferences?: ExternalReference[];
}

/** Sender */
export interface EmailSender {
  /**
   * The sender of the e-mail
   * @minLength 1
   */
  name: string;
  /**
   * Sender e-mail address
   * @format email
   * @minLength 1
   */
  address: string;
  /**
   * Reply-to e-mail address
   * @format email
   */
  replyTo?: string;
}

export interface EmailBatchRequest {
  /** @minItems 1 */
  parties: Party[];
  /**
   * E-mail subject
   * @minLength 1
   */
  subject: string;
  /** E-mail plain-text body */
  message?: string;
  /** E-mail HTML body (BASE64-encoded) */
  htmlMessage?: string;
  /** Sender */
  sender?: EmailSender;
  attachments?: EmailAttachment[];
  /** Headers */
  headers?: Record<string, string[]>;
}

export interface Party {
  /**
   * The message parties id
   * @format uuid
   */
  partyId?: string;
  /**
   * Recipient e-mail address
   * @format email
   * @minLength 1
   */
  emailAddress: string;
}

/** Invoice details */
export interface Details {
  /**
   * The invoice amount
   * @format float
   */
  amount: number;
  /**
   * The invoice due date
   * @format date
   */
  dueDate: string;
  paymentReferenceType: DetailsPaymentReferenceTypeEnum;
  /**
   * The payment reference number
   * @minLength 1
   * @maxLength 25
   */
  paymentReference: string;
  accountType: DetailsAccountTypeEnum;
  /**
   * The receiving account (a valid BANKGIRO or PLUSGIRO number)
   * @minLength 1
   */
  accountNumber: string;
}

export interface DigitalInvoiceFile {
  /** Content type */
  contentType: DigitalInvoiceFileContentTypeEnum;
  /** Content (BASE64-encoded) */
  content: string;
  /**
   * Filename
   * @minLength 1
   */
  filename: string;
}

export interface DigitalInvoiceParty {
  /**
   * The recipient party id
   * @format uuid
   */
  partyId?: string;
  /** External references */
  externalReferences?: ExternalReference[];
}

export interface DigitalInvoiceRequest {
  /** Party */
  party: DigitalInvoiceParty;
  /** Invoice type */
  type: DigitalInvoiceRequestTypeEnum;
  /** Subject */
  subject?: string | null;
  /** Invoice reference */
  reference?: string;
  /**
   * Whether the invoice is payable
   * @default true
   */
  payable?: boolean;
  /** Invoice details */
  details: Details;
  /** Files */
  files?: DigitalInvoiceFile[];
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
  title?: string;
  detail?: string;
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

/** Message attachment model */
export interface MessageAttachment {
  /** The attachment content type */
  contentType?: string;
  /** The attachment file name */
  fileName?: string;
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

/** Recipient model */
export interface Recipient {
  /** The recipient address */
  address?: Address;
  /** The person identifier */
  personId?: string;
  /** The message type */
  messageType?: string;
  /** The recipient mobile number */
  mobileNumber?: string;
  /** The message status */
  status?: string;
}

/** User message model */
export interface UserMessage {
  /** The message id */
  messageId?: string;
  /** The message issuer */
  issuer?: string;
  /** The system that the message originated from */
  origin?: string;
  /**
   * When the message was sent
   * @format date-time
   */
  sent?: string;
  /** The message subject */
  subject?: string;
  /** The message body */
  body?: string;
  recipients?: Recipient[];
  attachments?: MessageAttachment[];
}

/** User messages model */
export interface UserMessages {
  /** PagingMetaData model */
  _meta?: PagingMetaData;
  messages?: UserMessage[];
}

/** Batch information model */
export interface Batch {
  /** The batch id */
  batchId?: string;
  /** The original message type */
  messageType?: string;
  /** Message subject if such exists for message(s) attached to the batch */
  subject?: string;
  /**
   * Timestamp when the batch was sent
   * @format date-time
   */
  sent?: string;
  /**
   * The amount of documents attached to message(s) in the batch
   * @format int32
   */
  attachmentCount?: number;
  /**
   * The amount of recipients included in the batch
   * @format int32
   */
  recipientCount?: number;
  /** Batch status model */
  status?: Status;
}

/** Batch status model */
export interface Status {
  /**
   * Amount of successfully sent messages
   * @format int32
   */
  successful?: number;
  /**
   * Amount of failed messages
   * @format int32
   */
  unsuccessful?: number;
}

/** User batches model */
export interface UserBatches {
  /** PagingMetaData model */
  _meta?: PagingMetaData;
  batches?: Batch[];
}

export interface LetterStatistics {
  SNAIL_MAIL?: StatisticsCounter;
  DIGITAL_MAIL?: StatisticsCounter;
}

export interface MessageStatistics {
  EMAIL?: StatisticsCounter;
  SMS?: StatisticsCounter;
  /** @format int32 */
  UNDELIVERABLE?: number;
}

export interface Statistics {
  EMAIL?: StatisticsCounter;
  SMS?: StatisticsCounter;
  WEB_MESSAGE?: StatisticsCounter;
  DIGITAL_MAIL?: StatisticsCounter;
  SNAIL_MAIL?: StatisticsCounter;
  MESSAGE?: MessageStatistics;
  LETTER?: LetterStatistics;
}

export interface StatisticsCounter {
  /** @format int32 */
  sent?: number;
  /** @format int32 */
  failed?: number;
}

export interface DepartmentLetterStatistics {
  DEPARTMENT?: string;
  SNAIL_MAIL?: StatisticsCounter;
  DIGITAL_MAIL?: StatisticsCounter;
}

export interface DepartmentStatistics {
  ORIGIN?: string;
  DEPARTMENT_STATISTICS?: DepartmentLetterStatistics[];
}

export interface DepartmentStats {
  ORIGIN?: string;
  DEPARTMENT?: string;
  SNAIL_MAIL?: StatisticsCounter;
  DIGITAL_MAIL?: StatisticsCounter;
  SMS?: StatisticsCounter;
}

export interface HistoryResponse {
  messageType?: MessageType;
  status?: MessageStatus;
  content?: any;
  /** @format date-time */
  timestamp?: string;
}

/** Content type */
export enum DigitalMailAttachmentContentTypeEnum {
  ApplicationPdf = "application/pdf",
}

/** Content type */
export enum DigitalMailRequestContentTypeEnum {
  TextPlain = "text/plain",
  TextHtml = "text/html",
}

/** Determines if the message should be added to the internal or external OeP instance */
export enum WebMessageRequestOepInstanceEnum {
  INTERNAL = "INTERNAL",
  EXTERNAL = "EXTERNAL",
}

/** Priority (optional, will be defaulted to NORMAL if not present) */
export enum SmsRequestPriorityEnum {
  HIGH = "HIGH",
  NORMAL = "NORMAL",
}

/** Priority (optional, will be defaulted to NORMAL if not present) */
export enum SmsBatchRequestPriorityEnum {
  HIGH = "HIGH",
  NORMAL = "NORMAL",
}

/** Delivery mode */
export enum LetterAttachmentDeliveryModeEnum {
  ANY = "ANY",
  DIGITAL_MAIL = "DIGITAL_MAIL",
  SNAIL_MAIL = "SNAIL_MAIL",
}

/** Content type */
export enum LetterAttachmentContentTypeEnum {
  ApplicationPdf = "application/pdf",
}

/** Content type */
export enum LetterRequestContentTypeEnum {
  TextPlain = "text/plain",
  TextHtml = "text/html",
}

export enum DetailsPaymentReferenceTypeEnum {
  SE_OCR = "SE_OCR",
  TENANT_REF = "TENANT_REF",
}

export enum DetailsAccountTypeEnum {
  BANKGIRO = "BANKGIRO",
  PLUSGIRO = "PLUSGIRO",
}

/** Content type */
export enum DigitalInvoiceFileContentTypeEnum {
  ApplicationPdf = "application/pdf",
}

/** Invoice type */
export enum DigitalInvoiceRequestTypeEnum {
  INVOICE = "INVOICE",
  REMINDER = "REMINDER",
}

/** Message type */
export enum GetStatisticsParamsMessageTypeEnum {
  MESSAGE = "MESSAGE",
  EMAIL = "EMAIL",
  SMS = "SMS",
  WEB_MESSAGE = "WEB_MESSAGE",
  DIGITAL_MAIL = "DIGITAL_MAIL",
  DIGITAL_INVOICE = "DIGITAL_INVOICE",
  SNAIL_MAIL = "SNAIL_MAIL",
  LETTER = "LETTER",
  SLACK = "SLACK",
}
