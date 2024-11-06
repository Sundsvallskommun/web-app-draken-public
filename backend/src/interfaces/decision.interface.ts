import { Attachment } from './attachment.interface';
import { GenericExtraParameters } from './extra-parameters.interface';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  Appeal as AppealDTO,
  Decision as DecisionDTO,
  DecisionDecisionOutcomeEnum,
  DecisionDecisionTypeEnum,
  Law as LawDTO,
  Stakeholder as StakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';

export class Appeal implements AppealDTO {
  /////********NOTE: DATA IS NOT ALIGNED WITH DESIGN, NEEDS CORRECTION WHEN BOTH ARE UP TO DATE*/
  @IsString()
  @IsOptional()
  id?: number;
  @IsString()
  @IsOptional()
  version?: number;
  @IsString()
  @IsOptional()
  created?: string;
  @IsString()
  @IsOptional()
  updated?: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsString()
  @IsOptional()
  registeredAt?: string;
  @IsString()
  @IsOptional()
  appealConcernCommunicatedAt: string;
  @IsString()
  @IsOptional()
  status: string;
  @IsString()
  @IsOptional()
  timelinessReview: string;
  @IsNumber()
  @IsOptional()
  decisionId?: number;
}

export class Law implements LawDTO {
  @IsString()
  heading: string;
  @IsString()
  sfs: string;
  @IsString()
  chapter: string;
  @IsString()
  article: string;
}

// export type DecisionOutcome = 'APPROVAL' | 'REJECTION' | 'UNKNOWN';

export class Decision implements DecisionDTO {
  @IsNumber()
  @IsOptional()
  id: number;
  @IsString()
  decisionType: DecisionDecisionTypeEnum;
  @IsString()
  decisionOutcome: DecisionDecisionOutcomeEnum;
  @IsString()
  @IsOptional()
  description?: string;
  @ValidateNested({ each: true })
  @Type(() => Law)
  law: LawDTO[];
  @IsOptional()
  decidedBy?: StakeholderDTO;
  @IsString()
  @IsOptional()
  decidedAt?: string;
  @IsString()
  @IsOptional()
  validFrom: string;
  @IsString()
  @IsOptional()
  validTo: string;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Attachment)
  attachments: Attachment[];
  @ValidateNested({ each: true })
  @Type(() => Appeal)
  @IsOptional()
  appeal?: Appeal;
  @IsObject()
  @IsOptional()
  extraParameters: GenericExtraParameters;
}
