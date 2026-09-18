import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class FeatureFlag {
  @IsInt()
  id!: number;
  @IsString()
  name!: string;
  @IsString()
  @IsOptional()
  value?: string;
  @IsBoolean()
  enabled!: boolean;
  @IsString()
  application!: string;
  @IsString()
  namespace!: string;
}
