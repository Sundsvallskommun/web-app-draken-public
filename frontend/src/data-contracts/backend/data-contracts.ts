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

export interface CAccountInformation {
  costCenter?: string;
  subaccount?: string;
  department?: string;
  accuralKey?: string;
  activity?: string;
  article?: string;
  project?: string;
  counterpart?: string;
}

export interface CInvoiceRow {
  descriptions?: any[];
  detailedDescriptions?: any[];
  totalAmount?: number;
  vatCode?: string;
  costPerUnit?: number;
  quantity?: number;
  accountInformation?: CAccountInformation;
}

export interface CInvoice {
  customerId: string;
  description: string;
  ourReference?: string;
  customerReference?: string;
  referenceId?: string;
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
  extraParameters?: object;
}

export interface CSortObject {
  direction?: string;
  nullHandling?: string;
  ascending?: boolean;
  property?: string;
  ignoreCase?: boolean;
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
  dateTime: string;
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
  status?: CreateErrandDtoStatusEnum;
  statusDescription?: string;
  statuses?: any[];
  municipalityId?: string;
  stakeholders?: CreateStakeholderDto[];
  decisions?: string;
  extraParameters?: any[];
}

export interface CPatchErrandDto {
  id?: string;
  externalCaseId?: string;
  status?: CPatchErrandDtoStatusEnum;
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
  errandId: string;
  errandNumber?: string;
}

export interface PatchNotificationDto {
  id?: string;
  ownerId?: string;
  type?: string;
  description?: string;
  content?: string;
  expires?: string;
  acknowledged?: boolean;
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
  values?: any[];
}

export interface SupportErrandDto {
  assignedUserId?: string;
  reporterUserId?: string;
  classification?: object;
  labels?: any[];
  contactReason?: string;
  contactReasonDescription?: string;
  businessRelated?: boolean;
  channel?: string;
  customer?: object;
  priority?: string;
  status?: string;
  suspension?: object;
  resolution?: string;
  escalationEmail?: string;
  title?: string;
  description?: string;
  stakeholders?: any[];
  externalTags?: CExternalTag[];
  parameters?: CParameter[];
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

export enum CreateErrandDtoStatusEnum {
  ValueArendeInkommit = 'Ärende inkommit',
  UnderGranskning = 'Under granskning',
  VantarPaKomplettering = 'Väntar på komplettering',
  KompletteringInkommen = 'Komplettering inkommen',
  InterntKomplettering = 'Internt komplettering',
  InterntAterkoppling = 'Internt återkoppling',
  UnderRemiss = 'Under remiss',
  ValueAterkopplingRemiss = 'Återkoppling remiss',
  UnderUtredning = 'Under utredning',
  UnderBeslut = 'Under beslut',
  Beslutad = 'Beslutad',
  BeslutVerkstallt = 'Beslut verkställt',
  BeslutOverklagat = 'Beslut överklagat',
  ValueArendeAvslutat = 'Ärende avslutat',
  Tilldelat = 'Tilldelat',
  HanterasIAnnatSystem = 'Hanteras i annat system',
  ValueArendetAvvisas = 'Ärendet avvisas',
}

export enum CPatchErrandDtoStatusEnum {
  ValueArendeInkommit = 'Ärende inkommit',
  UnderGranskning = 'Under granskning',
  VantarPaKomplettering = 'Väntar på komplettering',
  KompletteringInkommen = 'Komplettering inkommen',
  InterntKomplettering = 'Internt komplettering',
  InterntAterkoppling = 'Internt återkoppling',
  UnderRemiss = 'Under remiss',
  ValueAterkopplingRemiss = 'Återkoppling remiss',
  UnderUtredning = 'Under utredning',
  UnderBeslut = 'Under beslut',
  Beslutad = 'Beslutad',
  BeslutVerkstallt = 'Beslut verkställt',
  BeslutOverklagat = 'Beslut överklagat',
  ValueArendeAvslutat = 'Ärende avslutat',
  Tilldelat = 'Tilldelat',
  HanterasIAnnatSystem = 'Hanteras i annat system',
  ValueArendetAvvisas = 'Ärendet avvisas',
}