import {
  DecisionDTO,
  ErrandDTO,
  ErrandDtoChannelEnum,
  PatchErrandDTO as IPatchErrandDTO,
  PatchErrandDtoCaseTypeEnum,
  PatchErrandDtoPriorityEnum,
  StakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ErrandPhase } from './errand-phase.interface';
import { ErrandStatus, StatusDTO } from './errand-status.interface';
import { GenericExtraParameters } from './extra-parameters.interface';
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
  caseType?: PatchErrandDtoCaseTypeEnum;
  @IsString()
  @IsOptional()
  channel?: ErrandDtoChannelEnum;
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
  @IsEnum(ErrandStatus)
  @IsOptional()
  status?: ErrandStatus;
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
  @IsObject()
  @IsOptional()
  extraParameters?: GenericExtraParameters;
}

export class CPatchErrandDto implements IPatchErrandDTO {
  @IsString()
  @IsOptional()
  id?: string;
  @IsString()
  @IsOptional()
  externalCaseId?: string;
  @IsEnum(ErrandStatus)
  @IsOptional()
  status?: ErrandStatus;
  @IsString()
  @IsOptional()
  statusDescription?: string;
  @IsString()
  @IsOptional()
  caseType?: PatchErrandDtoCaseTypeEnum;
  @IsString()
  @IsOptional()
  priority?: PatchErrandDtoPriorityEnum;
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
  @IsObject()
  @IsOptional()
  extraParameters?: GenericExtraParameters;
}
