import { Attachment } from '../../casedata/interfaces/attachment';

type MessageType = 'MESSAGE' | 'EMAIL' | 'SMS' | 'WEB_MESSAGE' | 'DIGITAL_MAIL';
export type MessageStatus =
  | 'AWAITING_FEEDBACK'
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'NO_FEEDBACK_SETTINGS_FOUND'
  | 'NO_FEEDBACK_WANTED';

export enum MessageClassification {
  'Informationsmeddelande' = 'Informationsmeddelande',
  'Efterfrågan komplettering' = 'Efterfrågan komplettering',
  'Hämta yttrande' = 'Hämta yttrande',
  'Intern dialog' = 'Intern dialog',
}

export interface WebMessageAttachment {
  fileName: string;
  mimeType: 'application/pdf';
  base64Data: string;
}

export interface DigitalMailAttachment {
  contentType: 'application/pdf';
  content: string;
  filename: string;
}

export interface EmailMessageAttachment {
  content: string;
  name: string;
  contentType: 'application/pdf';
}

interface EmailMessageContent {
  headers: [];
  emailAddress: string;
  subject: string;
  message: string;
  attachments: {
    name: string;
    contentType: string;
    content: string;
  }[];
}

export interface Message {
  content: EmailMessageContent | any;
  messageType: MessageType;
  status: MessageStatus;
  timestamp: string;
  messageId?: string;
}

export interface MessageDto {
  text: string;
  attachUtredning: boolean;
  errandId: string;
  attachments?: Attachment[];
}
