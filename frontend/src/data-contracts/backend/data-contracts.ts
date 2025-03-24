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

export interface SsnPayload {
  ssn: string;
}

export interface OrgNrPayload {
  orgNr: string;
}

export interface CLegalForm {
  legalFormCode: string;
  legalFormDescription: string;
}

export interface CAddress {
  city?: string;
  street?: string;
  postcode?: string;
  careOf?: string;
}

export interface CMunicipality {
  municipalityCode: string;
  municipalityName: string;
}

export interface CCounty {
  countyCode: string;
  countyName: string;
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

export interface ExtraParametersDto {
  'application.reason'?: string;
  'application.role'?: ExtraParametersDtoApplicationRoleEnum;
  'application.applicant.capacity'?: string;
  'application.applicant.testimonial'?: ExtraParametersDtoApplicationApplicantTestimonialEnum;
  'application.applicant.signingAbility'?: ExtraParametersDtoApplicationApplicantSigningAbilityEnum;
  'disability.aid'?: string;
  'disability.walkingAbility'?: ExtraParametersDtoDisabilityWalkingAbilityEnum;
  'disability.walkingDistance.beforeRest'?: string;
  'disability.walkingDistance.max'?: string;
  'disability.duration'?: string;
  'disability.canBeAloneWhileParking'?: ExtraParametersDtoDisabilityCanBeAloneWhileParkingEnum;
  'disability.canBeAloneWhileParking.note'?: string;
  'consent.contact.doctor'?: ExtraParametersDtoConsentContactDoctorEnum;
  'consent.view.transportationServiceDetails'?: ExtraParametersDtoConsentViewTransportationServiceDetailsEnum;
  'application.lostPermit.policeReportNumber'?: string;
  'application.renewal.changedCircumstances'?: ExtraParametersDtoApplicationRenewalChangedCircumstancesEnum;
  'application.renewal.expirationDate'?: string;
  'application.renewal.medicalConfirmationRequired'?: string;
  'artefact.permit.number'?: string;
  'artefact.permit.status'?: string;
  'application.supplement.dueDate'?: string;
}

export interface Attachment {
  id?: number;
  category: string;
  name: string;
  note?: string;
  extension: string;
  mimeType: string;
  file?: string;
  version?: number;
  created?: string;
  updated?: string;
  extraParameters?: any;
}

export interface CreateAttachmentDto {
  file?: string;
  category: string;
  extension: string;
  mimeType: string;
  name: string;
  note: string;
  errandNumber: string;
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
  law: LawDTO[];
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
  recipients?: any[];
  email?: string;
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

export interface CSuspension {
  suspendedFrom?: string;
  suspendedTo?: string;
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

export interface SupportErrandDto {
  id?: string;
  errandNumber?: string;
  title: string;
  stakeholders?: CSupportStakeholder[];
  priority: string;
  externalTags?: CExternalTag[];
  parameters?: CParameter[];
  classification: Classification;
  status: string;
  resolution?: string;
  description?: string;
  channel?: string;
  reporterUserId: string;
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
}

export interface ForwardFormDto {
  recipient: string;
  email: string;
  department: string;
  message: string;
  messageBodyPlaintext: string;
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
  emailHeaders?: string;
  communicationAttachments: CCommunicationAttachment[];
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
}

export interface TemplateSelector {
  identifier?: string;
  content?: string;
  parameters?: object;
}

export enum CBillingRecordTypeEnum {
  EXTERNAL = 'EXTERNAL',
  INTERNAL = 'INTERNAL',
}

export enum CBillingRecordStatusEnum {
  NEW = 'NEW',
  APPROVED = 'APPROVED',
  INVOICED = 'INVOICED',
  REJECTED = 'REJECTED',
}

export enum ExtraParametersDtoApplicationRoleEnum {
  SELF = 'SELF',
  GUARDIAN = 'GUARDIAN',
  CUSTODIAN = 'CUSTODIAN',
}

export enum ExtraParametersDtoApplicationApplicantTestimonialEnum {
  True = 'true',
  False = 'false',
}

export enum ExtraParametersDtoApplicationApplicantSigningAbilityEnum {
  True = 'true',
  False = 'false',
}

export enum ExtraParametersDtoDisabilityWalkingAbilityEnum {
  True = 'true',
  False = 'false',
}

export enum ExtraParametersDtoDisabilityCanBeAloneWhileParkingEnum {
  True = 'true',
  False = 'false',
}

export enum ExtraParametersDtoConsentContactDoctorEnum {
  True = 'true',
  False = 'false',
}

export enum ExtraParametersDtoConsentViewTransportationServiceDetailsEnum {
  True = 'true',
  False = 'false',
}

export enum ExtraParametersDtoApplicationRenewalChangedCircumstancesEnum {
  Y = 'Y',
  N = 'N',
}

export enum CCommunicationDirectionEnum {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum CCommunicationCommunicationTypeEnum {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WEB_MESSAGE = 'WEB_MESSAGE',
}
