import { ApiResponse } from '@/services/api.service';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class FeatureFlag {
  @IsInt()
  id: number;
  @IsString()
  name: string;
  @IsString()
  @IsOptional()
  value?: string;
  @IsBoolean()
  enabled: boolean;
  @IsString()
  application: string;
  @IsString()
  namespace: string;
}

export class FeatureFlagsApiResponse implements ApiResponse<FeatureFlag[]> {
  @ValidateNested({ each: true })
  @Type(() => FeatureFlag)
  data: FeatureFlag[];
  @IsString()
  message: string;
}
export class FeatureFlagApiResponse implements ApiResponse<FeatureFlag> {
  @ValidateNested()
  @Type(() => FeatureFlag)
  data: FeatureFlag;
  @IsString()
  message: string;
}
