import { Attachment } from './attachment.interface';
import { GenericExtraParameters } from './extra-parameters.interface';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  Decision as DecisionDTO,
  DecisionDecisionOutcomeEnum,
  DecisionDecisionTypeEnum,
  Law as LawDTO,
  Stakeholder as StakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';

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
  @IsObject()
  @IsOptional()
  extraParameters: GenericExtraParameters;
}
