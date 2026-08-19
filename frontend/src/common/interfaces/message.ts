type MessageType = 'MESSAGE' | 'EMAIL' | 'SMS' | 'WEB_MESSAGE' | 'DIGITAL_MAIL';
type MessageStatus =
  | 'AWAITING_FEEDBACK'
  | 'PENDING'
  | 'SENT'
  | 'FAILED'
  | 'NO_FEEDBACK_SETTINGS_FOUND'
  | 'NO_FEEDBACK_WANTED';

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
