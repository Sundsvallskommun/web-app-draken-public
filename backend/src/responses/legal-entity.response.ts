import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

import { ApiResponse } from '@/services/api.service';

export class LegalEntityPostAddress {
  @IsOptional()
  @IsString()
  address1?: string | null;
  @IsOptional()
  @IsString()
  postalCode?: string | null;
  @IsOptional()
  @IsString()
  city?: string | null;
}

export class LegalEntityEmployeeSize {
  @IsOptional()
  @IsString()
  name?: string | null;
}

export class LegalEntityProfile {
  @IsOptional()
  @IsString()
  name?: string | null;
  @IsOptional()
  @IsString()
  organizationNumber?: string | null;
  @IsOptional()
  @IsString()
  form?: string | null;
  @IsOptional()
  @IsString()
  acountingPeriodStart?: string | null;
  @IsOptional()
  @IsString()
  acountingPeriodEnded?: string | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalEntityPostAddress)
  postAddress?: LegalEntityPostAddress | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalEntityEmployeeSize)
  employeeSize?: LegalEntityEmployeeSize | null;
  @IsOptional()
  @IsString()
  businessDescription?: string | null;
}

export class LegalEntityProfileApiResponse implements ApiResponse<LegalEntityProfile> {
  @ValidateNested()
  @Type(() => LegalEntityProfile)
  data!: LegalEntityProfile;
  @IsString()
  message!: string;
}

export class LegalEntityIdentity {
  @IsOptional()
  @IsString()
  code?: string | null;
  @IsOptional()
  @IsString()
  type?: string | null;
}

export class LegalEntityEngagementRelation {
  @IsOptional()
  @IsString()
  description?: string | null;
  @IsOptional()
  @IsString()
  code?: string | null;
  @IsOptional()
  @IsString()
  type?: string | null;
}

export class LegalEntityEngagement {
  @IsOptional()
  @IsString()
  name?: string | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => LegalEntityIdentity)
  identity?: LegalEntityIdentity;
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LegalEntityEngagementRelation)
  relations?: LegalEntityEngagementRelation[] | null;
  @IsOptional()
  @IsString()
  source?: string | null;
}

export class LegalEntityEngagements {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => LegalEntityEngagement)
  engagements?: LegalEntityEngagement[] | null;
  @IsOptional()
  @IsInt()
  beneficialOwnershipMarking?: number | null;
}

export class LegalEntityEngagementsApiResponse implements ApiResponse<LegalEntityEngagements> {
  @ValidateNested()
  @Type(() => LegalEntityEngagements)
  data!: LegalEntityEngagements;
  @IsString()
  message!: string;
}
