import { IsBoolean, IsIn, IsISO8601, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

class SupportMeasureDetailsDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  responsibleUser?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsISO8601({ strict: true })
  plannedStart?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsISO8601({ strict: true })
  plannedComplete?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsISO8601({ strict: true })
  executed?: string;
}

/** The browser selects a role; Draken sets addedByUser from its authenticated session. */
export class CreateSupportMeasureDto extends SupportMeasureDetailsDto {
  /** The measure type's metadata name, which Support Management keys a measure's type by. */
  @IsString()
  @Matches(/\S/)
  type!: string;
  @IsString()
  @Matches(/\S/)
  addedByRole!: string;
  @IsString()
  @Matches(/\S/)
  goal!: string;
  @IsString()
  @Matches(/\S/)
  description!: string;
}

/** Basic edits cannot change a decision or its attribution. */
export class UpdateSupportMeasureDto extends SupportMeasureDetailsDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/\S/)
  type?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  goal?: string;
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  description?: string;
}

/** A decision preserves the proposal. REWORK approves part of it as explained in the comment. */
export class DecideSupportMeasureDto {
  @IsIn(['TRUE', 'FALSE', 'REWORK'])
  accept!: 'TRUE' | 'FALSE' | 'REWORK';

  @ValidateIf((decision: DecideSupportMeasureDto, value: unknown) => decision.accept !== 'TRUE' || value !== undefined)
  @IsString()
  @Matches(/\S/, { message: 'En kommentar krävs vid avslag eller delvis godkännande.' })
  acceptMotivation?: string;
}

/** One follow-up command; measure details cannot be supplied. */
export class FollowUpSupportMeasureDto {
  @IsBoolean()
  desiredEffectAchieved!: boolean;

  @IsString()
  @Matches(/\S/)
  @MaxLength(4000)
  followUpDescription!: string;
}
