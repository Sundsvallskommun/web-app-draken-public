import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, Matches, MinLength, ValidateNested } from 'class-validator';

const SUPPORT_INVESTIGATION_IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const SUPPORT_INVESTIGATION_DOCUMENT_PLACEMENTS = ['investigation', 'decision'] as const;

/**
 * Which errand tab renders the document: the investigation tab (the default) or the decision tab.
 * The tabs share the document machinery; this only says where the document is offered.
 */
export type SupportInvestigationDocumentPlacement = (typeof SUPPORT_INVESTIGATION_DOCUMENT_PLACEMENTS)[number];

export const SUPPORT_INVESTIGATION_DOCUMENT_APPLICABILITIES = ['all', 'reported-misconduct'] as const;

/**
 * Which errands the document applies to. `all` (the default) offers it on every errand;
 * `reported-misconduct` restricts it to errands the application's classification policy resolves
 * as reported misconduct, and the BFF refuses it on any other errand.
 */
export type SupportInvestigationDocumentApplicability = (typeof SUPPORT_INVESTIGATION_DOCUMENT_APPLICABILITIES)[number];

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

  @IsOptional()
  @IsIn(SUPPORT_INVESTIGATION_DOCUMENT_PLACEMENTS)
  readonly placement?: SupportInvestigationDocumentPlacement;

  @IsOptional()
  @IsIn(SUPPORT_INVESTIGATION_DOCUMENT_APPLICABILITIES)
  readonly appliesTo?: SupportInvestigationDocumentApplicability;
}

export const SUPPORT_INVESTIGATION_DOCUMENT_ACCESS = ['edit', 'read', 'hidden'] as const;

/**
 * How far the signed-in user reaches into one investigation document: `edit` may change it, `read`
 * may only look at it, and `hidden` is not served at all. Write implies read, so the three levels
 * are ordered rather than independent flags.
 */
export type SupportInvestigationDocumentAccess = (typeof SUPPORT_INVESTIGATION_DOCUMENT_ACCESS)[number];

/** Effective document grants belong to an errand, never the application-wide profile. */
export class SupportInvestigationDocumentGrantDto {
  @IsString()
  readonly key!: string;

  @IsIn(SUPPORT_INVESTIGATION_DOCUMENT_ACCESS)
  readonly access!: SupportInvestigationDocumentAccess;
}

export class SupportInvestigationErrandAccessDto {
  @IsString()
  readonly municipalityId!: string;

  @IsString()
  readonly errandId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupportInvestigationDocumentGrantDto)
  readonly documents!: readonly SupportInvestigationDocumentGrantDto[];
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

  @IsOptional()
  @ValidateNested()
  @Type(() => SupportManagementLabelFilterProfileDto)
  readonly labelFilter?: SupportManagementLabelFilterProfileDto;
}
