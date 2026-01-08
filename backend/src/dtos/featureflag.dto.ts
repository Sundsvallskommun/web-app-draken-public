import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class FeatureFlagDto {
  @IsString()
  name: string;
  @IsString()
  @IsOptional()
  value?: string;
  @IsBoolean()
  enabled: boolean;
}
