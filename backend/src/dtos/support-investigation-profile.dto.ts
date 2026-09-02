import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, Matches, MinLength, ValidateNested } from 'class-validator';

const SUPPORT_INVESTIGATION_IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export class SupportInvestigationDocumentProfileDto {
  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_INVESTIGATION_IDENTIFIER)
  readonly key!: string;

  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_INVESTIGATION_IDENTIFIER)
  readonly schemaName!: string;

  @IsString()
  @MinLength(1)
  readonly tabLabel!: string;

  @IsString()
  @MinLength(1)
  readonly ownerLabel!: string;
}

export class SupportInvestigationProfileDto {
  @IsString()
  readonly application!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupportInvestigationDocumentProfileDto)
  readonly documents!: readonly SupportInvestigationDocumentProfileDto[];
}

const SUPPORT_INVESTIGATION_STATES = ['active', 'inactive', 'unavailable'] as const;
export type SupportInvestigationState = (typeof SUPPORT_INVESTIGATION_STATES)[number];

export class SupportRegistrationCapabilityDto {
  @IsIn(['enabled', 'disabled'])
  readonly mode!: 'enabled' | 'disabled';
}

export class SupportManagementLabelFilterFieldProfileDto {
  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_INVESTIGATION_IDENTIFIER)
  readonly key!: string;

  @IsString()
  @MinLength(1)
  readonly label!: string;

  @IsString()
  @MinLength(1)
  readonly classification!: string;
}

export class SupportManagementLabelFilterGroupProfileDto {
  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_INVESTIGATION_IDENTIFIER)
  readonly key!: string;

  @IsString()
  @MinLength(1)
  readonly label!: string;

  @IsString()
  @MinLength(1)
  readonly rootResourcePath!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupportManagementLabelFilterFieldProfileDto)
  readonly fields!: readonly SupportManagementLabelFilterFieldProfileDto[];
}

export class SupportManagementLabelFilterProfileDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupportManagementLabelFilterGroupProfileDto)
  readonly groups!: readonly SupportManagementLabelFilterGroupProfileDto[];
}

export class SupportInvestigationRuntimeProfileDto extends SupportInvestigationProfileDto {
  @IsIn(SUPPORT_INVESTIGATION_STATES)
  readonly state!: SupportInvestigationState;

  @ValidateNested()
  @Type(() => SupportRegistrationCapabilityDto)
  readonly registration!: SupportRegistrationCapabilityDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupportInvestigationDocumentProfileDto)
  declare readonly documents: readonly SupportInvestigationDocumentProfileDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SupportManagementLabelFilterProfileDto)
  readonly labelFilter?: SupportManagementLabelFilterProfileDto;
}
