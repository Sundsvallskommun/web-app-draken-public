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

export interface SsnPayload {
  ssn: string;
}

export interface OrgNrPayload {
  orgNr: string;
}

export interface CLEPostAddress {
  coAdress: string;
  country: string;
  postalCode: string;
  city: string;
  address1: string;
  address2: string;
}

export interface CLEAddress {
  addressArea: string;
  adressNumber: string;
  city: string;
  postalCode: string;
  municipality: string;
  county: string;
}

export interface CLegalEntity2 {
  legalEntityId: string;
  organizationNumber: string;
  name: string;
  postAddress: CLEPostAddress;
  address: CLEAddress;
  phoneNumber: string;
}

export interface CLegalEntity2WithId {
  partyId: string;
  legalEntityId: string;
  organizationNumber: string;
  name: string;
  postAddress: CLEPostAddress;
  address: CLEAddress;
  phoneNumber: string;
}

export interface CAccountInformation {
  costCenter?: string;
  subaccount?: string;
  department?: string;
  accuralKey?: string;
  activity?: string;
  article?: string;
  project?: string;
  counterpart?: string;
  amount?: number;
}

export interface CInvoiceRow {
  descriptions?: any[];
  detailedDescriptions?: any[];
  totalAmount?: number;
  vatCode?: string;
  costPerUnit?: number;
  quantity?: number;
  accountInformation?: CAccountInformation[];
}

export interface CInvoice {
  customerId: string;
  description: string;
  ourReference?: string;
  customerReference: string;
  date?: string;
  dueDate?: string;
  totalAmount?: number;
  invoiceRows: CInvoiceRow[];
}

export interface CAddressDetails {
  street?: string;
  careOf?: string;
  postalCode?: string;
  city?: string;
}

export interface CRecipient {
  partyId?: string;
  legalId?: string;
  organizationName?: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  addressDetails: CAddressDetails;
}

export interface CExtraParameters {
  errandId: string;
  errandNumber: string;
  referenceName: string;
  facilities?: string;
}

export interface CBillingRecord {
  id?: string;
  approvedBy?: any;
  approved?: any;
  recipient?: CRecipient;
  created?: any;
  modified?: any;
  category: string;
  type: CBillingRecordTypeEnum;
  status: CBillingRecordStatusEnum;
  invoice: CInvoice;
  extraParameters?: CExtraParameters;
  transferDate?: string;
}

export interface CSortObject {
  unsorted?: boolean;
  empty?: boolean;
  sorted?: boolean;
}

export interface CPageableObject {
  paged?: boolean;
  pageNumber?: number;
  pageSize?: number;
  offset?: number;
  sort?: CSortObject[];
  unpaged?: boolean;
}

export interface CPageBillingRecord {
  totalElements?: number;
  totalPages?: number;
  pageable?: CPageableObject[];
  size?: number;
  content?: CBillingRecord[];
  number?: number;
  sort?: CSortObject[];
  numberOfElements?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface Attachment {
  id?: number;
  category: string;
  name: string;
  note?: string;
  extension: string;
  mimeType: string;
  version?: number;
  created?: string;
  updated?: string;
  extraParameters?: any;
  municipalityId?: string;
  errandId?: number;
  decisionId?: number;
  namespace?: string;
  channel?: AttachmentChannelEnum;
  hash?: string;
}

export interface CreateAttachmentDto {
  category: string;
  extension: string;
  mimeType: string;
  name: string;
  note: string;
  errandNumber: string;
  channel?: CreateAttachmentDtoChannelEnum;
}

export interface LawDTO {
  heading: string;
  sfs: string;
  chapter: string;
  article: string;
}

export interface DecisionDTO {
  id?: number;
  decisionType: string;
  decisionOutcome: string;
  description?: string;
  law?: LawDTO[];
  decidedBy?: any;
  decidedAt?: string;
  validFrom?: string;
  validTo?: string;
  attachments?: Attachment[];
  extraParameters?: object;
}

export interface StatusDTO {
  statusType: string;
  description: string;
  created: string;
}

export interface ContactInfo {
  contactType: string;
  value: string;
}

export interface CAddressDTO {
  apartmentNumber?: string;
  addressCategory?: any;
  street?: any;
  houseNumber?: any;
  postalCode?: any;
  city?: any;
  country?: any;
  careOf?: any;
  attention?: any;
  propertyDesignation?: any;
  isZoningPlanArea?: any;
  invoiceMarking?: any;
  location?: any;
}

export interface ContactInformationDTO {
  contactType?: any;
  value?: any;
}

export interface CreateStakeholderDto {
  id?: number;
  type: string;
  roles: any[];
  firstName?: string;
  lastName?: string;
  addresses?: CAddressDTO[];
  contactInformation?: ContactInformationDTO[];
  personalNumber?: string;
  personId?: string;
  organizationName?: string;
  organizationNumber?: string;
  adAccount?: string;
  extraParameters?: object;
}

export interface CreateErrandDto {
  id?: number;
  errandNumber?: string;
  externalCaseId?: string;
  caseType?: string;
  channel?: string;
  priority?: string;
  phase?: string;
  description?: string;
  caseTitleAddition?: string;
  startDate?: string;
  endDate?: string;
  diaryNumber?: string;
  status?: object;
  statusDescription?: string;
  statuses?: any[];
  municipalityId?: string;
  stakeholders?: CreateStakeholderDto[];
  decisions?: string;
  extraParameters?: any[];
  suspension?: object;
  relatesTo?: any[];
  applicationReceived?: string;
}

export interface CPatchErrandDto {
  id?: string;
  externalCaseId?: string;
  status?: object;
  statuses?: any[];
  statusDescription?: string;
  caseType?: string;
  priority?: string;
  stakeholders?: CreateStakeholderDto[];
  phase?: string;
  description?: string;
  caseTitleAddition?: string;
  startDate?: string;
  endDate?: string;
  diaryNumber?: string;
  decisions?: string;
  extraParameters?: any[];
  suspension?: object;
  relatesTo?: any[];
  applicationReceived?: string;
}

export interface CreateErrandNoteDto {
  extraParameters: object;
  title: string;
  text: string;
  noteType: string;
}

export interface CasedataNotificationDto {
  id?: string;
  municipalityId?: string;
  namespace?: string;
  created?: string;
  modified?: string;
  ownerFullName?: string;
  ownerId: string;
  createdBy?: string;
  createdByFullName?: string;
  type: string;
  description: string;
  content?: string;
  expires?: string;
  acknowledged?: string;
  globalAcknowledged?: string;
  errandId: string;
  errandNumber?: string;
}

export interface PatchNotificationDto {
  id?: string;
  errandId?: number;
  ownerId?: string;
  type?: string;
  description?: string;
  content?: string;
  expires?: string;
  acknowledged?: boolean;
  globalAcknowledged?: boolean;
}

export interface FeatureFlagDto {
  name: string;
  value?: string;
  enabled: boolean;
}

export interface MessageDto {
  email?: string;
  contactMeans?: string;
  subject?: string;
  text: string;
  attachUtredning: string;
  errandId: string;
  municipalityId: string;
  messageClassification: string;
  reply_to: string;
  references: string;
  files?: any;
}

export interface SmsDto {
  phonenumber: string;
  text: string;
  errandId: string;
  municipalityId: string;
}

export interface DecisionMessageDto {
  errandId: string;
  html?: string;
  plaintext?: string;
}

export interface MessageResponse {
  messageId?: string;
  errandId?: string;
  municipalityId?: string;
  namespace?: string;
  direction?: string;
  familyId?: string;
  externalCaseId?: string;
  message?: string;
  sent?: string;
  subject?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  messageType?: string;
  mobileNumber?: string;
  recipients?: string[];
  ccRecipients?: string[];
  email?: string;
  htmlMessage?: string;
  userId?: string;
  viewed?: string;
  classification?: string;
  attachments?: any[];
  emailHeaders?: any[];
}

export interface SupportAttachmentDto {
  name: string;
  files?: any;
}

export interface CExternalTag {
  key: string;
  value: string;
}

export interface CParameter {
  key: string;
  displayName?: string;
  group?: string;
  values?: any[];
  version?: number;
}

export interface CContactChannel {
  type?: string;
  value?: string;
}

export interface CSupportStakeholder {
  externalId?: string;
  externalIdType?: string;
  role?: string;
  city?: string;
  organizationName?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  careOf?: string;
  zipCode?: string;
  country?: string;
  contactChannels?: CContactChannel[];
  parameters?: CParameter[];
}

export interface Classification {
  category: string;
  type: string;
}

export interface RequiredClassificationDto {
  /** @minLength 1 */
  category: string;
  /** @minLength 1 */
  type: string;
}

export interface ClassificationLabelReferenceDto {
  /** @minLength 1 */
  id: string;
}

export interface UpdateSupportErrandClassificationDto {
  /**
   * @min 0
   * @max 9007199254740991
   */
  expectedVersion: number;
  classification: any;
  /** @minItems 1 */
  categoryLabels: any;
  /** @minLength 1 */
  documentKey: string;
  /** @pattern ^"(0|[1-9]\d*)"$ */
  documentETag: string;
}

export interface UpdateSupportErrandPhaseDto {
  /**
   * @min 0
   * @max 9007199254740991
   */
  expectedVersion: number;
  /** @minLength 1 */
  transitionId: string;
}

export interface CSuspension {
  suspendedFrom?: string;
  suspendedTo?: string;
}

export interface CErrandAction {
  id?: string;
  actionName?: string;
  executeAfter?: string;
  actionConfigId?: string;
  displayValue?: string;
}

export interface CNotification {
  id?: string;
  created?: string;
  modified?: string;
  ownerFullName?: string;
  ownerId: string;
  createdBy?: string;
  createdByFullName?: string;
  type: string;
  description: string;
  content?: string;
  expires?: string;
  globalAcknowledged?: boolean;
  acknowledged?: boolean;
  errandId?: string;
  errandNumber?: string;
}

export interface CErrandPhase {
  phaseId?: string;
  name?: string;
  displayName?: string;
  started?: string;
  ended?: string;
}

export interface SupportErrandDto {
  id?: string;
  errandNumber?: string;
  title?: string;
  stakeholders?: CSupportStakeholder[];
  priority?: string;
  externalTags?: CExternalTag[];
  parameters?: CParameter[];
  classification?: Classification;
  status?: string;
  resolution?: string;
  description?: string;
  channel?: string;
  reporterUserId?: string;
  assignedUserId?: string;
  assignedGroupId?: string;
  escalationEmail?: string;
  contactReason?: string;
  contactReasonDescription?: string;
  suspension?: CSuspension;
  businessRelated?: boolean;
  labels?: any[];
  activeNotifications?: CNotification[];
  created?: string;
  modified?: string;
  touched?: string;
  version?: number;
  actions?: CErrandAction[];
  activePhaseId?: string;
  phases?: CErrandPhase[];
}

export interface ForwardFormDto {
  recipient: string;
  emails: any[];
  department: string;
  message: string;
  messageBodyPlaintext: string;
}

export interface SupportInvestigationDocumentProfileDto {
  /**
   * @minLength 1
   * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
   */
  key: string;
  /**
   * @minLength 1
   * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
   */
  schemaName: string;
  /** @minLength 1 */
  tabLabel: string;
  /** @minLength 1 */
  ownerLabel: string;
}

export interface SupportInvestigationProfileDto {
  application: string;
  documents: SupportInvestigationDocumentProfileDto[];
}

export interface SupportRegistrationCapabilityDto {
  mode: SupportRegistrationCapabilityDtoModeEnum;
}

export interface SupportInvestigationDocumentPermissionsDto {
  canRead: boolean;
  canWrite: boolean;
}

export interface SupportInvestigationRuntimeDocumentProfileDto {
  permissions: SupportInvestigationDocumentPermissionsDto;
  /**
   * @minLength 1
   * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
   */
  key: string;
  /**
   * @minLength 1
   * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
   */
  schemaName: string;
  /** @minLength 1 */
  tabLabel: string;
  /** @minLength 1 */
  ownerLabel: string;
}

export interface SupportManagementLabelFilterFieldProfileDto {
  /**
   * @minLength 1
   * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
   */
  key: string;
  /** @minLength 1 */
  label: string;
  /** @minLength 1 */
  classification: string;
}

export interface SupportManagementLabelFilterGroupProfileDto {
  /**
   * @minLength 1
   * @pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$
   */
  key: string;
  /** @minLength 1 */
  label: string;
  /** @minLength 1 */
  rootResourcePath: string;
  fields: SupportManagementLabelFilterFieldProfileDto[];
}

export interface SupportManagementLabelFilterProfileDto {
  groups: SupportManagementLabelFilterGroupProfileDto[];
}

export interface SupportInvestigationRuntimeProfileDto {
  state: SupportInvestigationRuntimeProfileDtoStateEnum;
  registration: SupportRegistrationCapabilityDto;
  documents: SupportInvestigationRuntimeDocumentProfileDto[];
  labelFilter?: SupportManagementLabelFilterProfileDto;
  application: string;
}

export interface UpdateSupportErrandJsonParameterDto {
  /** @minLength 1 */
  schemaId: string;
  value: any;
}

export interface HandoverPreviewDto {
  targetNamespace: string;
  targetMunicipalityId: string;
}

export interface HandoverTargetDto {
  namespace: string;
  municipalityId?: string;
}

export interface HandoverErrandDto {
  target: HandoverTargetDto;
  mapping: object;
  overrides?: object;
  include?: object;
  sourceHandling?: object;
  message?: string;
}

export interface SupportMessageDto {
  /** @minLength 1 */
  contactMeans: string;
  /** @minLength 1 */
  recipientEmail?: string;
  /** @minLength 1 */
  recipientPhone?: string;
  plaintextMessage: string;
  htmlMessage: string;
  senderName?: string;
  subject: string;
  files?: any;
  reply_to: string;
  references: string;
  attachmentIds?: any;
}

export interface CCommunicationAttachment {
  id?: string;
  fileName?: string;
  mimeType?: string;
}

export interface CCommunication {
  communicationID?: string;
  sender?: string;
  errandNumber?: string;
  direction?: CCommunicationDirectionEnum;
  messageBody?: string;
  sent?: string;
  subject?: string;
  communicationType?: CCommunicationCommunicationTypeEnum;
  target?: string;
  internal?: boolean;
  viewed?: boolean;
  ccRecipients?: string[];
  emailHeaders?: string;
  communicationAttachments: CCommunicationAttachment[];
}

export interface Type {
  name: string;
  displayName?: string;
  escalationEmail?: string;
  deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface Category {
  id?: string;
  name?: string;
  displayName?: string;
  sortOrder?: number;
  deprecated?: boolean;
  types?: Type[];
  created?: string;
  modified?: string;
}

export interface ExternalIdType {
  id?: string;
  name: string;
  displayName?: string;
  sortOrder?: number;
  deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface LabelAttribute {
  key: string;
  value: string;
}

export interface Label {
  id?: string;
  classification: string;
  displayName?: string;
  resourcePath?: string;
  resourceName: string;
  deprecated?: boolean;
  labels?: Label[];
  attributes?: LabelAttribute[];
}

export interface Labels {
  labelStructure?: Label[];
}

export interface Status {
  id?: string;
  name: string;
  displayName?: string;
  externalDisplayName?: string;
  sortOrder?: number;
  deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface Role {
  id?: string;
  name: string;
  displayName?: string;
  sortOrder?: number;
  deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface ContactReason {
  id?: string;
  reason: string;
  displayName?: string;
  sortOrder?: number;
  deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface PhaseTransition {
  id?: string;
  targetPhaseId: string;
  targetPhaseName?: string;
  targetPhaseDisplayName?: string;
  description?: string;
  deprecated?: boolean;
}

export interface Phase {
  id?: string;
  name: string;
  displayName?: string;
  description?: string;
  phaseOrder?: number;
  allowedStatuses?: string[];
  transitions?: PhaseTransition[];
  deprecated?: boolean;
  created?: string;
  modified?: string;
}

export interface MetadataResponse {
  categories?: Category[];
  externalIdTypes?: ExternalIdType[];
  labels?: Labels;
  statuses?: Status[];
  roles?: Role[];
  contactReasons?: ContactReason[];
  phases?: Phase[];
}

export interface SupportNoteDto {
  context?: string;
  role?: string;
  partyId?: string;
  subject?: string;
  body: string;
}

export interface SupportNoteUpdateDto {
  modifiedBy?: string;
  subject?: string;
  body: string;
}

export interface SupportNotificationDto {
  id: string;
  ownerFullName: string;
  ownerId: string;
  created?: string;
  createdBy?: string;
  createdByFullName?: string;
  modified?: string;
  type: string;
  description: string;
  content?: string;
  expires?: string;
  acknowledged?: boolean;
  globalAcknowledged?: boolean;
  errandId: string;
  errandNumber: string;
  subtype: string;
}

export interface TemplateSelector {
  identifier?: string;
  content?: string;
  parameters?: object;
}

export enum CBillingRecordTypeEnum {
  EXTERNAL = "EXTERNAL",
  INTERNAL = "INTERNAL",
}

export enum CBillingRecordStatusEnum {
  NEW = "NEW",
  APPROVED = "APPROVED",
  INVOICED = "INVOICED",
  REJECTED = "REJECTED",
}

export enum AttachmentChannelEnum {
  EMAIL = "EMAIL",
  ESERVICE = "ESERVICE",
  WEB_UI = "WEB_UI",
  MY_PAGES = "MY_PAGES",
}

export enum CreateAttachmentDtoChannelEnum {
  EMAIL = "EMAIL",
  ESERVICE = "ESERVICE",
  WEB_UI = "WEB_UI",
  MY_PAGES = "MY_PAGES",
}

export enum SupportRegistrationCapabilityDtoModeEnum {
  Enabled = "enabled",
  Disabled = "disabled",
}

export enum SupportInvestigationRuntimeProfileDtoStateEnum {
  Active = "active",
  Inactive = "inactive",
  Unavailable = "unavailable",
}

export enum CCommunicationDirectionEnum {
  INBOUND = "INBOUND",
  OUTBOUND = "OUTBOUND",
}

export enum CCommunicationCommunicationTypeEnum {
  SMS = "SMS",
  EMAIL = "EMAIL",
  WEB_MESSAGE = "WEB_MESSAGE",
}
