import { GenericExtraParameters } from './extra-parameters';

export type MEXAttachmentCategory =
  | 'OEP_APPLICATION'
  | 'APPLICATION_SQUARE_PLACE'
  | 'MEX_CONTRACT'
  | 'CORPORATE_TAX_CARD'
  | 'DECISION'
  | 'IMAGE_PHOTO'
  | 'EMAIL'
  | 'COVER_LETTER'
  | 'NEW_MEX_REQUEST'
  | 'NOTICE'
  | 'RECEIVED_MAP'
  | 'MEX_PROTOCOL'
  | 'REFERRAL_CONSULTATION'
  | 'TERMINATION_OF_HUNTING_RIGHTS'
  | 'STATEMENT'
  | 'OTHER'
  //Legacy
  | 'RECEIVED_CONTRACT'
  | 'CONTRACT_DRAFT'
  | 'LEASE_REQUEST'
  | 'REQUEST_TO_BUY_SMALL_HOUSE_PLOT'
  | 'INQUIRY_LAND_SALE'
  | 'LAND_PURCHASE_REQUEST'
  | 'ROAD_ALLOWANCE_APPROVAL'
  | 'PREVIOUS_AGREEMENT';

export enum MEXAttachmentLabels {
  'OEP_APPLICATION' = 'Ansökan',
  'APPLICATION_SQUARE_PLACE' = 'Ansökan torgplats',
  'MEX_CONTRACT' = 'Avtal',
  'CORPORATE_TAX_CARD' = 'Behörighetshandling',
  'DECISION' = 'Beslut',
  'IMAGE_PHOTO' = 'Bild/Foto',
  'EMAIL' = 'E-post',
  'COVER_LETTER' = 'Följebrev',
  'NEW_MEX_REQUEST' = 'Inkommen förfrågan',
  'NOTICE' = 'Kallelse',
  'RECEIVED_MAP' = 'Karta/Situationsplan',
  'MEX_PROTOCOL' = 'Protokoll',
  'REFERRAL_CONSULTATION' = 'Remiss/Samråd',
  'TERMINATION_OF_HUNTING_RIGHTS' = 'Uppsägning',
  'STATEMENT' = 'Yttrande',
  'OTHER' = 'Övrigt',
}
export enum MEXLegacyAttachmentLabels {
  'RECEIVED_CONTRACT' = 'Avtal inkommit',
  'CONTRACT_DRAFT' = 'Avtalsutkast',
  'LEASE_REQUEST' = 'Förfrågan arrende',
  'REQUEST_TO_BUY_SMALL_HOUSE_PLOT' = 'Förfrågan köpa småhustomt',
  'INQUIRY_LAND_SALE' = 'Förfrågan markförsäljning',
  'LAND_PURCHASE_REQUEST' = 'Förfrågan markköp',
  'ROAD_ALLOWANCE_APPROVAL' = 'Godkännande för vägbidrag',
  'PREVIOUS_AGREEMENT' = 'Tidigare avtal',
}

export const MEXAllAttachmentLabels = { ...MEXAttachmentLabels, ...MEXLegacyAttachmentLabels };

export type PTAttachmentCategory =
  | 'PASSPORT_PHOTO'
  | 'MEDICAL_CONFIRMATION'
  | 'SIGNATURE'
  | 'POLICE_REPORT'
  | 'UNKNOWN'
  | 'ERRAND_SCANNED_APPLICATION'
  | 'SERVICE_RECEIPT'
  | 'OTHER_ATTACHMENT';

export enum PTAttachmentLabels {
  'PASSPORT_PHOTO' = 'Passfoto',
  'MEDICAL_CONFIRMATION' = 'Läkarintyg',
  'SIGNATURE' = 'Underskrift',
  'POLICE_REPORT' = 'Polisanmälan',
  'ERRAND_SCANNED_APPLICATION' = 'Ärende (Skannad ansökan)',
  'SERVICE_RECEIPT' = 'Delgivningskvitto',
  'OTHER_ATTACHMENT' = 'Övriga bilagor',
}

export interface Attachment {
  id?: string;
  version?: number;
  created?: string;
  updated?: string;
  category: string;
  name: string;
  note: string;
  extension: string;
  mimeType: string;
  file: string;
  extraParameters?: GenericExtraParameters;
}
