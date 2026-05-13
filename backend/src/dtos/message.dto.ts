import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

import {
  AttachmentResponse,
  Classification,
  EmailHeader,
  MessageResponse as IMessageResponse,
  MessageResponseDirectionEnum,
} from '@/data-contracts/case-data/data-contracts';

export enum MessageClassification {
  'Efterfrågan komplettering' = 'COMPLETION_REQUEST',
  'Informationsmeddelande' = 'INFORMATION',
  'Hämta yttrande' = 'OBTAIN_OPINION',
  'Intern dialog' = 'INTERNAL_COMMUNICATION',
  // 'Övrigt' = 'OTHER
}

export class MessageDto {
  @IsString()
  @IsOptional()
  email!: string;
  @IsString()
  @IsOptional()
  contactMeans!: string;
  @IsString()
  @IsOptional()
  subject!: string;
  @IsString()
  text!: string;
  @IsString()
  attachUtredning!: string;
  @IsString()
  errandId!: string;
  @IsString()
  municipalityId!: string;
  @IsString()
  messageClassification!: MessageClassification;
  @IsString()
  reply_to!: string;
  @IsString()
  references!: string;
  @IsOptional()
  files!: Express.Multer.File[];
}

export class SmsDto {
  @IsString()
  phonenumber!: string;
  @IsString()
  text!: string;
  @IsString()
  errandId!: string;
  @IsString()
  municipalityId!: string;
}

export class DecisionMessageDto {
  @IsString()
  errandId!: string;
}

export class MessageResponse implements IMessageResponse {
  @IsOptional()
  @IsString()
  messageId?: string;
  @IsOptional()
  @IsString()
  errandId?: number;
  @IsOptional()
  @IsString()
  municipalityId?: string;
  @IsOptional()
  @IsString()
  namespace?: string;
  @IsOptional()
  @IsString()
  direction?: MessageResponseDirectionEnum;
  @IsOptional()
  @IsString()
  familyId?: string;
  @IsOptional()
  @IsString()
  externalCaseId?: string;
  @IsOptional()
  @IsString()
  message?: string;
  @IsOptional()
  @IsString()
  sent?: string;
  @IsOptional()
  @IsString()
  subject?: string;
  @IsOptional()
  @IsString()
  username?: string;
  @IsOptional()
  @IsString()
  firstName?: string;
  @IsOptional()
  @IsString()
  lastName?: string;
  @IsOptional()
  @IsString()
  messageType?: string;
  @IsOptional()
  @IsString()
  mobileNumber?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @JSONSchema({ type: 'array', items: { type: 'string' } })
  recipients?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @JSONSchema({ type: 'array', items: { type: 'string' } })
  ccRecipients?: string[];
  @IsOptional()
  @IsString()
  email?: string;
  @IsOptional()
  @IsString()
  htmlMessage?: string;
  @IsOptional()
  @IsString()
  userId?: string;
  @IsOptional()
  @IsString()
  viewed?: boolean;
  @IsOptional()
  @IsString()
  classification?: Classification;
  @IsOptional()
  @IsArray()
  attachments?: AttachmentResponse[];
  @IsOptional()
  @IsArray()
  emailHeaders?: EmailHeader[];
}

export interface AgnosticMessageResponse {
  messageId: string;
}

export interface WebMessageResponse {
  messageId: string;
  deliveries: {
    deliveryId: string;
    messageType: string;
    status: string;
  }[];
}

export interface LetterResponse {
  batchId: string;
  messages: [
    {
      messageId: string;
      deliveries: {
        deliveryId: string;
        messageType: 'DIGITAL_MAIL' | 'SNAIL_MAIL';
        status: string;
      }[];
    },
  ];
}
