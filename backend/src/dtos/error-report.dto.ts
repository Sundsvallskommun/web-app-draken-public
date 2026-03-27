import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested, MaxLength, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

class CapturedLogEntryDto {
  @IsEnum(['log', 'warn', 'error', 'info', 'debug'])
  level!: string;

  @IsString()
  @MaxLength(1000)
  message!: string;

  @IsString()
  timestamp!: string;

  @IsEnum(['console', 'network', 'unhandled', 'promise-rejection'])
  @IsOptional()
  source?: string;
}

class ClientEnvironmentDto {
  @IsString()
  browser!: string;

  @IsString()
  os!: string;

  @IsString()
  screenResolution!: string;

  @IsString()
  viewportSize!: string;

  @IsString()
  language!: string;

  @IsString()
  userAgent!: string;
}

class AppVersionDto {
  @IsString()
  commit!: string;

  @IsString()
  branch!: string;

  @IsString()
  updatedAt!: string;
}

class ErrorDetailsDto {
  @IsString()
  name!: string;

  @IsString()
  message!: string;

  @IsString()
  @IsOptional()
  stack?: string;

  @IsString()
  @IsOptional()
  componentStack?: string;
}

export class ErrorReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  expectedBehavior!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  stepsToReproduce!: string;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity!: string;

  @IsString()
  timestamp!: string;

  @IsString()
  url!: string;

  @IsString()
  route!: string;

  @IsString()
  username!: string;

  @IsString()
  userFullName!: string;

  @ValidateNested()
  @Type(() => ClientEnvironmentDto)
  @IsObject()
  environment!: ClientEnvironmentDto;

  @ValidateNested()
  @Type(() => AppVersionDto)
  @IsOptional()
  appVersion?: AppVersionDto | null;

  @IsString()
  applicationName!: string;

  @ValidateNested()
  @Type(() => ErrorDetailsDto)
  @IsOptional()
  errorDetails?: ErrorDetailsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CapturedLogEntryDto)
  capturedLogs!: CapturedLogEntryDto[];
}
