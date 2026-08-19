import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, Matches, MinLength, ValidateNested } from 'class-validator';

const SUPPORT_INVESTIGATION_IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SUPPORT_MANAGEMENT_RESOURCE_PATH = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/u;
const SUPPORT_MANAGEMENT_CLASSIFICATION = /^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*$/u;

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

export class SupportInvestigationDocumentPermissionsDto {
  @IsBoolean()
  readonly canRead!: boolean;
  @IsBoolean()
  readonly canWrite!: boolean;
}

export class SupportInvestigationRuntimeDocumentProfileDto extends SupportInvestigationDocumentProfileDto {
  @ValidateNested()
  @Type(() => SupportInvestigationDocumentPermissionsDto)
  readonly permissions!: SupportInvestigationDocumentPermissionsDto;
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

export class SupportInvestigationClassificationParameterSelectorDto {
  @IsString()
  @MinLength(1)
  readonly key!: string;

  @IsArray()
  @IsString({ each: true })
  readonly values!: readonly string[];
}

export class SupportInvestigationClassificationLabelSelectorDto {
  @IsArray()
  @IsString({ each: true })
  readonly resourcePaths!: readonly string[];

  @IsArray()
  @IsString({ each: true })
  readonly resourceNames!: readonly string[];
}

export class ReportedMisconductSelectorDto {
  @ValidateNested()
  @Type(() => SupportInvestigationClassificationParameterSelectorDto)
  readonly parameter!: SupportInvestigationClassificationParameterSelectorDto;

  @ValidateNested()
  @Type(() => SupportInvestigationClassificationLabelSelectorDto)
  readonly labels!: SupportInvestigationClassificationLabelSelectorDto;
}

export class SupportInvestigationClassificationLegalBaseRuleDto {
  @IsString()
  @MinLength(1)
  readonly legalBase!: string;

  @IsArray()
  @IsString({ each: true })
  readonly allowedClassificationCategories!: readonly string[];
}

export class ReportedMisconductLabelTreeRootDto {
  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_MANAGEMENT_RESOURCE_PATH)
  readonly resource!: string;

  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_MANAGEMENT_CLASSIFICATION)
  readonly classification!: string;
}

export class ReportedMisconductLabelTreeDto {
  @ValidateNested()
  @Type(() => ReportedMisconductLabelTreeRootDto)
  readonly root!: ReportedMisconductLabelTreeRootDto;

  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_MANAGEMENT_CLASSIFICATION)
  readonly ownerClassification!: string;

  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_MANAGEMENT_CLASSIFICATION)
  readonly categoryClassification!: string;

  @IsString()
  @MinLength(1)
  @Matches(SUPPORT_MANAGEMENT_CLASSIFICATION)
  readonly typeClassification!: string;
}

export class ReportedMisconductInvestigationClassificationPolicyDto {
  @IsIn(['reported-misconduct'])
  readonly strategy!: 'reported-misconduct';

  @IsString()
  @MinLength(1)
  readonly defaultOwnerDocumentKey!: string;

  @IsString()
  @MinLength(1)
  readonly reportedMisconductOwnerDocumentKey!: string;

  @ValidateNested()
  @Type(() => ReportedMisconductSelectorDto)
  readonly reportedMisconductSelector!: ReportedMisconductSelectorDto;

  @ValidateNested()
  @Type(() => ReportedMisconductLabelTreeDto)
  readonly labelTree!: ReportedMisconductLabelTreeDto;

  @IsArray()
  @IsString({ each: true })
  readonly forcedLegalBases!: readonly string[];

  @IsString()
  @MinLength(1)
  readonly legalBasesPointer!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupportInvestigationClassificationLegalBaseRuleDto)
  readonly legalBaseRules!: readonly SupportInvestigationClassificationLegalBaseRuleDto[];
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

  @IsOptional()
  @ValidateNested()
  @Type(() => ReportedMisconductInvestigationClassificationPolicyDto)
  readonly classificationPolicy?: ReportedMisconductInvestigationClassificationPolicyDto;
}
