import { Attachment } from './attachment.interface';
import { GenericExtraParameters } from './extra-parameters.interface';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import {
  Decision,
  DecisionDecisionOutcomeEnum,
  DecisionDecisionTypeEnum,
  Law,
  Stakeholder as StakeholderDTO,
} from '@/data-contracts/case-data/data-contracts';

export class LawDTO implements Law {
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

export class DecisionDTO implements Decision {
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
  @Type(() => LawDTO)
  law: Law[];
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
