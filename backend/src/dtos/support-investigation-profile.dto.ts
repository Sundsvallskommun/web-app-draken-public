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

export const SUPPORT_INVESTIGATION_DOCUMENT_ACCESS = ['edit', 'hidden'] as const;

/**
 * Whether the signed-in user reaches one investigation document at all. Access is binary on
 * purpose: a handler either owns their part of the investigation or has no business seeing it.
 */
export type SupportInvestigationDocumentAccess = (typeof SUPPORT_INVESTIGATION_DOCUMENT_ACCESS)[number];

/**
 * A document as the runtime serves it: the configured document plus what this user may do with it.
 * Access is resolved per request, so it belongs here rather than on the statically configured
 * profile the application boots with.
 */
export class SupportInvestigationRuntimeDocumentProfileDto extends SupportInvestigationDocumentProfileDto {
  @IsIn(SUPPORT_INVESTIGATION_DOCUMENT_ACCESS)
  readonly access!: SupportInvestigationDocumentAccess;
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
  @Type(() => SupportInvestigationRuntimeDocumentProfileDto)
  declare readonly documents: readonly SupportInvestigationRuntimeDocumentProfileDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SupportManagementLabelFilterProfileDto)
  readonly labelFilter?: SupportManagementLabelFilterProfileDto;
}
