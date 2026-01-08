import { IsBoolean, IsString } from 'class-validator';

export class FeatureFlagDto {
  @IsString()
  name: string;
  @IsBoolean()
  enabled: boolean;
}
