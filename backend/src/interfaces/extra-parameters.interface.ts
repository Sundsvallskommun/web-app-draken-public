import { IsIn, IsOptional, IsString } from 'class-validator';

export type GenericExtraParameters = { [key: string]: string };

export class ExtraParametersDto {
  @IsString()
  @IsOptional()
  'application.reason'?: string;
  @IsString()
  @IsIn(['SELF', 'GUARDIAN', 'CUSTODIAN'])
  @IsOptional()
  'application.role'?: 'SELF' | 'GUARDIAN' | 'CUSTODIAN';
  @IsString()
  @IsOptional()
  'application.applicant.capacity'?: 'DRIVER' | 'PASSENGER';
  @IsString()
  @IsIn(['true', 'false'])
  @IsOptional()
  'application.applicant.testimonial': 'true' | 'false';
  @IsString()
  @IsIn(['true', 'false'])
  @IsOptional()
  'application.applicant.signingAbility'?: 'true' | 'false';
  @IsString()
  @IsOptional()
  'disability.aid'?: string;
  @IsString()
  @IsIn(['true', 'false'])
  @IsOptional()
  'disability.walkingAbility'?: 'true' | 'false';
  @IsString()
  @IsOptional()
  'disability.walkingDistance.beforeRest'?: string;
  @IsString()
  @IsOptional()
  'disability.walkingDistance.max'?: string;
  @IsString()
  @IsOptional()
  'disability.duration'?: string;
  @IsString()
  @IsIn(['true', 'false'])
  @IsOptional()
  'disability.canBeAloneWhileParking'?: 'true' | 'false';
  @IsString()
  @IsOptional()
  'disability.canBeAloneWhileParking.note'?: string;
  @IsString()
  @IsIn(['true', 'false'])
  @IsOptional()
  'consent.contact.doctor'?: 'true' | 'false';
  @IsString()
  @IsIn(['true', 'false'])
  @IsOptional()
  'consent.view.transportationServiceDetails'?: 'true' | 'false';
  @IsString()
  @IsOptional()
  'application.lostPermit.policeReportNumber'?: string;
  @IsString()
  @IsIn(['Y', 'N'])
  @IsOptional()
  'application.renewal.changedCircumstances'?: 'Y' | 'N';
  @IsString()
  @IsOptional()
  'application.renewal.expirationDate'?: string; // YYYY-MM-DD
  @IsString()
  @IsOptional()
  'application.renewal.medicalConfirmationRequired'?: 'yes' | 'no' | 'unknown';
  @IsString()
  @IsOptional()
  'artefact.permit.number'?: string;
  @IsString()
  @IsOptional()
  'artefact.permit.status'?: string;
  @IsString()
  @IsOptional()
  'application.supplement.dueDate'?: string;
}
