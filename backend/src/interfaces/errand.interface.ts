import {
  Decision as DecisionDTO,
  ErrandChannelEnum,
  Errand as ErrandDTO,
  ExtraParameter,
  PatchErrand as IPatchErrandDTO,
  PatchErrandPriorityEnum,
  RelatedErrand,
  Stakeholder as StakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ErrandPhase } from './errand-phase.interface';
import { StatusDTO } from './errand-status.interface';
import { CreateStakeholderDto } from './stakeholder.interface';

export class CreateErrandDto implements ErrandDTO {
  @IsNumber()
  @IsOptional()
  id?: number;
  @IsString()
  @IsOptional()
  errandNumber?: string;
  @IsString()
  @IsOptional()
  externalCaseId?: string;
  @IsString()
  @IsOptional()
  caseType?: string;
  @IsString()
  @IsOptional()
  channel?: ErrandChannelEnum;
  @IsString()
  @IsOptional()
  priority?: any;
  @IsString()
  @IsOptional()
  phase?: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsString()
  @IsOptional()
  caseTitleAddition?: string;
  @IsString()
  @IsOptional()
  startDate?: string;
  @IsString()
  @IsOptional()
  endDate?: string;
  @IsString()
  @IsOptional()
  diaryNumber?: string;
  @IsObject()
  @IsOptional()
  status?: StatusDTO;
  @IsString()
  @IsOptional()
  statusDescription?: string;
  @IsArray()
  @IsOptional()
  statuses?: StatusDTO[];
  @IsString()
  @IsOptional()
  municipalityId?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStakeholderDto)
  stakeholders?: StakeholderDTO[];
  @IsString()
  @IsOptional()
  decisions?: DecisionDTO[];
  @IsArray()
  @IsOptional()
  extraParameters?: ExtraParameter[];
  @IsOptional()
  @IsObject()
  suspension?: {
    suspendedFrom?: string;
    suspendedTo?: string;
  };
  @IsOptional()
  @IsArray()
  relatesTo?: RelatedErrand[];
  @IsString()
  @IsOptional()
  applicationReceived?: string;
}

export class CPatchErrandDto implements IPatchErrandDTO {
  @IsString()
  @IsOptional()
  id?: string;
  @IsString()
  @IsOptional()
  externalCaseId?: string;
  @IsObject()
  @IsOptional()
  status?: StatusDTO;
  @IsArray()
  @IsOptional()
  statuses?: StatusDTO[];
  @IsString()
  @IsOptional()
  statusDescription?: string;
  @IsString()
  @IsOptional()
  caseType?: string;
  @IsString()
  @IsOptional()
  priority?: PatchErrandPriorityEnum;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStakeholderDto)
  stakeholders?: StakeholderDTO[];
  @IsString()
  @IsOptional()
  phase?: ErrandPhase;
  @IsString()
  @IsOptional()
  description?: string;
  @IsString()
  @IsOptional()
  caseTitleAddition?: string;
  @IsString()
  @IsOptional()
  startDate?: string;
  @IsString()
  @IsOptional()
  endDate?: string;
  @IsString()
  @IsOptional()
  diaryNumber?: string;
  @IsString()
  @IsOptional()
  decisions?: DecisionDTO[];
  @IsArray()
  @IsOptional()
  extraParameters?: ExtraParameter[];
  @IsOptional()
  @IsObject()
  suspension?: {
    suspendedFrom?: string;
    suspendedTo?: string;
  };
  @IsOptional()
  @IsArray()
  relatesTo?: RelatedErrand[];
  @IsString()
  @IsOptional()
  applicationReceived?: string;
}
