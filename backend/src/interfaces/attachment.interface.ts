import { IsNumber, IsOptional, IsString } from 'class-validator';
import { GenericExtraParameters } from './extra-parameters.interface';
import { AttachmentDTO } from '@/data-contracts/case-data/data-contracts';

export class Attachment implements AttachmentDTO {
  @IsNumber()
  @IsOptional()
  id: number;
  @IsString()
  category: string;
  @IsString()
  name: string;
  @IsString()
  @IsOptional()
  note: string;
  @IsString()
  extension: string;
  @IsString()
  mimeType: string;
  @IsString()
  @IsOptional()
  file?: string;
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
}

export class CreateAttachmentDto implements AttachmentDTO {
  @IsString()
  @IsOptional()
  file?: string;
  @IsString()
  category: string;
  @IsString()
  extension: string;
  @IsString()
  mimeType: string;
  @IsString()
  name: string;
  @IsString()
  note: string;
  @IsString()
  errandNumber: string;
}
