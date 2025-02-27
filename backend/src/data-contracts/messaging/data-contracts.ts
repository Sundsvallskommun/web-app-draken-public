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

/** External references */
export interface ExternalReference {
  /**
   * The external reference key
   * @example "flowInstanceId"
   */
  key: string;
  /**
   * The external reference value
   * @example "356t4r34f"
   */
  value: string;
}

/** Attachment */
export interface WebMessageAttachment {
  /** File name */
  fileName?: string;
  /** Mime-type */
  mimeType?: string;
  /** BASE64-encoded file, max size 10 MB */
  base64Data?: string;
}

/** Party */
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
  /** Message */
  message: string;
  /** Sender */
  sender?: WebMessageSender;
  /**
   * Determines if the message should be added to the internal or external OeP instance
   * @example "internal"
   */
  oepInstance?: WebMessageRequestOepInstanceEnum;
  /**
   * @maxItems 10
   * @minItems 0
   */
  attachments?: WebMessageAttachment[];
}

/** Sender */
export interface WebMessageSender {
  /**
   * The user ID of the sender. I.e. employee ID
   * @example "joe01doe"
   */
  userId?: string;
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

/** Status */
export enum MessageStatus {
  PENDING = 'PENDING',
  AWAITING_FEEDBACK = 'AWAITING_FEEDBACK',
  SENT = 'SENT',
  NOT_SENT = 'NOT_SENT',
  FAILED = 'FAILED',
  NO_CONTACT_SETTINGS_FOUND = 'NO_CONTACT_SETTINGS_FOUND',
  NO_CONTACT_WANTED = 'NO_CONTACT_WANTED',
}

/** Message type */
export enum MessageType {
  MESSAGE = 'MESSAGE',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEB_MESSAGE = 'WEB_MESSAGE',
  DIGITAL_MAIL = 'DIGITAL_MAIL',
  DIGITAL_INVOICE = 'DIGITAL_INVOICE',
  SNAIL_MAIL = 'SNAIL_MAIL',
  LETTER = 'LETTER',
  SLACK = 'SLACK',
}

export interface SmsRequest {
  /** Party */
  party?: SmsRequestParty;
  /**
   * The sender of the SMS, swedish letters(å,ä,ö) will be replaced by (a,a,o) respectively
   * @minLength 3
   * @maxLength 11
   * @example "sender"
   */
  sender?: string;
  /** Mobile number. Should start with +467x */
  mobileNumber: string;
  /** Message */
  message: string;
  /** Priority (optional, will be defaulted to NORMAL if not present) */
  priority?: SmsRequestPriorityEnum;
}

/** Party */
export interface SmsRequestParty {
  /**
   * The message party id
   * @example "f427952b-247c-4d3b-b081-675a467b3619"
   */
  partyId?: string;
  /** External references */
  externalReferences?: ExternalReference[];
}

export interface SmsBatchRequest {
  /**
   * The sender of the SMS, swedish letters(å,ä,ö) will be replaced by (a,a,o) respectively
   * @minLength 3
   * @maxLength 11
   * @example "sender"
   */
  sender?: string;
  /** Message to send as sms */
  message: string;
  /** Priority (optional, will be defaulted to NORMAL if not present) */
  priority?: SmsBatchRequestPriorityEnum;
  /** Parties to send the sms message to */
  parties: SmsBatchRequestParty[];
}

/** Parties to send the sms message to */
export interface SmsBatchRequestParty {
  /**
   * The message party id (optional)
   * @example "f427952b-247c-4d3b-b081-675a467b3619"
   */
  partyId?: string;
  /** Mobile number, which should start with +467x */
  mobileNumber: string;
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

export interface SlackRequest {
  /** App/bot token */
  token: string;
  /** Channel name/id */
  channel: string;
  /** Message (supports Slack markdown formatting) */
  message: string;
}

export interface Email {
  /** The sender of the e-mail */
  name: string;
  /**
   * Sender e-mail address
   * @example "sender@sender.se"
   */
  address: string;
  /**
   * Reply-to e-mail address
   * @example "sender@sender.se"
   */
  replyTo?: string;
}

/** The messages to be sent */
export interface Message {
  /** Party */
  party: MessageParty;
  /**
   * Filters
   * @example {"someAttributeName":["someAttributeValue"]}
   */
  filters?: Record<string, string[]>;
  /** Sender */
  sender?: MessageSender;
  /** The message subject (for E-mails) */
  subject?: string;
  /** Plain-text message text */
  message: string;
  /** HTML message text, for e-mails (BASE64-encoded) */
  htmlMessage?: string;
}

/** Party */
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
  /** The messages to be sent */
  messages: Message[];
}

/** Sender */
export interface MessageSender {
  email?: Email;
  sms?: Sms;
}

export interface Sms {
  /**
   * The sender of the SMS
   * @minLength 0
   * @maxLength 11
   * @example "sender"
   */
  name: string;
}

/** Addresses that gets a letter copy */
export interface Address {
  /**
   * The first name of the recipient
   * @example "John"
   */
  firstName?: string;
  /**
   * The last name of the recipient
   * @example "Doe"
   */
  lastName?: string;
  /**
   * The address
   * @example "Main Street 1"
   */
  address?: string;
  /**
   * The apartment number
   * @example "1101"
   */
  apartmentNumber?: string;
  /**
   * The care of
   * @example "c/o John Doe"
   */
  careOf?: string;
  /**
   * The zip code
   * @example "12345"
   */
  zipCode?: string;
  /**
   * The city
   * @example "Main Street"
   */
  city?: string;
  /**
   * The country
   * @example "Sweden"
   */
  country?: string;
}

/** Attachment */
export interface LetterAttachment {
  /**
   * Delivery mode, to indicate whether an attachment is intended/allowed to be used for
   * digital mail, snail-mail or any of them
   */
  deliveryMode: LetterAttachmentDeliveryModeEnum;
  /** Filename */
  filename: string;
  /** Content type */
  contentType?: LetterAttachmentContentTypeEnum;
  /** Content (BASE64-encoded) */
  content: string;
}

/** Party */
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
   * @example "SBK(Gatuavdelningen, Trafiksektionen)"
   */
  department: string;
  /**
   * If the letter to send deviates from the standard
   * @example "A3 Ritning"
   */
  deviation?: string;
  /** @minItems 1 */
  attachments: LetterAttachment[];
}

/** Sender */
export interface LetterSender {
  /** Support info */
  supportInfo: LetterSenderSupportInfo;
}

/** Support info */
export interface LetterSenderSupportInfo {
  /** Text */
  text: string;
  /** E-mail address */
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

export interface EmailRequest {
  /** Party */
  party?: EmailRequestParty;
  /** Recipient e-mail address */
  emailAddress: string;
  /** E-mail subject */
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

/** Party */
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
  /** The sender of the e-mail */
  name: string;
  /**
   * Sender e-mail address
   * @example "sender@sender.se"
   */
  address: string;
  /**
   * Reply-to e-mail address
   * @example "sender@sender.se"
   */
  replyTo?: string;
}

export interface EmailBatchRequest {
  parties: Party[];
  /** E-mail subject */
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
   * @example "e8660aab-6df9-4ed5-86d1-d9b90a5f7e87"
   */
  partyId?: string;
  /**
   * Recipient e-mail address
   * @example "someone@somewhere.com"
   */
  emailAddress: string;
}

/** Attachment */
export interface DigitalMailAttachment {
  /** Content type */
  contentType?: DigitalMailAttachmentContentTypeEnum;
  /** Content (BASE64-encoded) */
  content: string;
  /** Filename */
  filename: string;
}

/** Party */
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
  /**
   * Department and unit that should be billed for the message
   * @example "SBK(Gatuavdelningen, Trafiksektionen)"
   */
  department?: string | null;
  /** Content type */
  contentType: DigitalMailRequestContentTypeEnum;
  /** Body (plain text if contentType is set to 'text/plain', BASE64-encoded if contentType is set to 'application/html') */
  body: string;
  /** Attachments */
  attachments?: DigitalMailAttachment[];
}

/** Sender */
export interface DigitalMailSender {
  /** Support info */
  supportInfo: DigitalMailSenderSupportInfo;
}

/** Support info */
export interface DigitalMailSenderSupportInfo {
  /** Text */
  text: string;
  /** E-mail address */
  emailAddress?: string;
  /** Phone number */
  phoneNumber?: string;
  /** URL */
  url?: string;
}

/** Invoice details */
export interface Details {
  /**
   * The invoice amount
   * @format float
   * @example 123.45
   */
  amount: number;
  /**
   * The invoice due date
   * @format date
   * @example "2023-10-09"
   */
  dueDate: string;
  paymentReferenceType: DetailsPaymentReferenceTypeEnum;
  /**
   * The payment reference number
   * @maxLength 25
   * @example "426523791"
   */
  paymentReference: string;
  accountType: DetailsAccountTypeEnum;
  /**
   * The receiving account (a valid BANKGIRO or PLUSGIRO number)
   * @example "12345"
   */
  accountNumber: string;
}

/** Files */
export interface DigitalInvoiceFile {
  /** Content type */
  contentType: DigitalInvoiceFileContentTypeEnum;
  /** Content (BASE64-encoded) */
  content: string;
  /** Filename */
  filename: string;
}

/** Party */
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
  /**
   * Invoice reference
   * @example "Faktura #12345"
   */
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

/** Message attachment model */
export interface MessageAttachment {
  /**
   * The attachment content type
   * @example "application/pdf"
   */
  contentType?: string;
  /**
   * The attachment file name
   * @example "attachment.pdf"
   */
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
  /**
   * The person identifier
   * @example "199001011234"
   */
  personId?: string;
  /**
   * The message type
   * @example "SNAIL_MAIL"
   */
  messageType?: string;
  /**
   * The message status
   * @example "SENT"
   */
  status?: string;
}

/** User message model */
export interface UserMessage {
  /**
   * The message id
   * @example "b971e0f8-2942-4b45-9fa3-bd2cc22ed76b"
   */
  messageId?: string;
  /**
   * The message issuer
   * @example "and06sod"
   */
  issuer?: string;
  /**
   * The system that the message originated from
   * @example "CASEDATA"
   */
  origin?: string;
  /**
   * When the message was sent
   * @format date-time
   */
  sent?: string;
  /**
   * The message subject
   * @example "Important message"
   */
  subject?: string;
  recipients?: Recipient[];
  attachments?: MessageAttachment[];
}

/** User messages model */
export interface UserMessages {
  /** PagingMetaData model */
  _meta?: PagingMetaData;
  messages?: UserMessage[];
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

export interface HistoryResponse {
  messageType?: HistoryResponseMessageTypeEnum;
  status?: HistoryResponseStatusEnum;
  content?: object;
  /** @format date-time */
  timestamp?: string;
}

/**
 * Determines if the message should be added to the internal or external OeP instance
 * @example "internal"
 */
export enum WebMessageRequestOepInstanceEnum {
  Internal = 'internal',
  External = 'external',
}

/** Priority (optional, will be defaulted to NORMAL if not present) */
export enum SmsRequestPriorityEnum {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
}

/** Priority (optional, will be defaulted to NORMAL if not present) */
export enum SmsBatchRequestPriorityEnum {
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
}

/**
 * Delivery mode, to indicate whether an attachment is intended/allowed to be used for
 * digital mail, snail-mail or any of them
 */
export enum LetterAttachmentDeliveryModeEnum {
  ANY = 'ANY',
  DIGITAL_MAIL = 'DIGITAL_MAIL',
  SNAIL_MAIL = 'SNAIL_MAIL',
}

/** Content type */
export enum LetterAttachmentContentTypeEnum {
  ApplicationPdf = 'application/pdf',
}

/** Content type */
export enum LetterRequestContentTypeEnum {
  TextPlain = 'text/plain',
  TextHtml = 'text/html',
}

/** Content type */
export enum DigitalMailAttachmentContentTypeEnum {
  ApplicationPdf = 'application/pdf',
}

/** Content type */
export enum DigitalMailRequestContentTypeEnum {
  TextPlain = 'text/plain',
  TextHtml = 'text/html',
}

export enum DetailsPaymentReferenceTypeEnum {
  SE_OCR = 'SE_OCR',
  TENANT_REF = 'TENANT_REF',
}

export enum DetailsAccountTypeEnum {
  BANKGIRO = 'BANKGIRO',
  PLUSGIRO = 'PLUSGIRO',
}

/** Content type */
export enum DigitalInvoiceFileContentTypeEnum {
  ApplicationPdf = 'application/pdf',
}

/** Invoice type */
export enum DigitalInvoiceRequestTypeEnum {
  INVOICE = 'INVOICE',
  REMINDER = 'REMINDER',
}

export enum HistoryResponseMessageTypeEnum {
  MESSAGE = 'MESSAGE',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEB_MESSAGE = 'WEB_MESSAGE',
  DIGITAL_MAIL = 'DIGITAL_MAIL',
  DIGITAL_INVOICE = 'DIGITAL_INVOICE',
  SNAIL_MAIL = 'SNAIL_MAIL',
  LETTER = 'LETTER',
  SLACK = 'SLACK',
}

export enum HistoryResponseStatusEnum {
  PENDING = 'PENDING',
  AWAITING_FEEDBACK = 'AWAITING_FEEDBACK',
  SENT = 'SENT',
  NOT_SENT = 'NOT_SENT',
  FAILED = 'FAILED',
  NO_CONTACT_SETTINGS_FOUND = 'NO_CONTACT_SETTINGS_FOUND',
  NO_CONTACT_WANTED = 'NO_CONTACT_WANTED',
}

/** Message type */
export enum GetStatisticsParamsMessageTypeEnum {
  MESSAGE = 'MESSAGE',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WEB_MESSAGE = 'WEB_MESSAGE',
  DIGITAL_MAIL = 'DIGITAL_MAIL',
  DIGITAL_INVOICE = 'DIGITAL_INVOICE',
  SNAIL_MAIL = 'SNAIL_MAIL',
  LETTER = 'LETTER',
  SLACK = 'SLACK',
}
