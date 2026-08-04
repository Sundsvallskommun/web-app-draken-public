import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

import { Attachment as AttachmentDTO, AttachmentChannelEnum } from '@/data-contracts/case-data/data-contracts';

import { GenericExtraParameters } from './extra-parameters.interface';

export class Attachment implements AttachmentDTO {
  @IsNumber()
  @IsOptional()
  id!: number;
  @IsString()
  category!: string;
  @IsString()
  name!: string;
  @IsString()
  @IsOptional()
  note!: string;
  @IsString()
  extension!: string;
  @IsString()
  mimeType!: string;
  @IsNumber()
  @IsOptional()
  version?: number;
  @IsString()
  @IsOptional()
  created?: string;
  @IsString()
  @IsOptional()
  updated?: string;
  @IsOptional()
  extraParameters?: GenericExtraParameters;
  @IsString()
  @IsOptional()
  municipalityId?: string;
  @IsNumber()
  @IsOptional()
  errandId?: number;
  @IsString()
  @IsOptional()
  namespace?: string;
  @IsEnum(AttachmentChannelEnum)
  @IsOptional()
  channel?: AttachmentChannelEnum;
  @IsString()
  @IsOptional()
  hash?: string;
}

export class CreateAttachmentDto implements AttachmentDTO {
  @IsString()
  category!: string;
  @IsString()
  extension!: string;
  @IsString()
  mimeType!: string;
  @IsString()
  name!: string;
  @IsString()
  note!: string;
  @IsString()
  errandNumber!: string;
  @IsEnum(AttachmentChannelEnum)
  @IsOptional()
  channel?: AttachmentChannelEnum;
}
