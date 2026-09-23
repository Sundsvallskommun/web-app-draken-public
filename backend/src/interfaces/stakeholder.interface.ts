import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

import {
  Address as IAddressDTO,
  AddressAddressCategoryEnum,
  ContactInformation as IContactInformationDTO,
  ContactInformationContactTypeEnum,
  Coordinates as CoordinatesDTO,
  Stakeholder as StakeholderDTO,
  StakeholderTypeEnum,
} from '@/data-contracts/case-data/data-contracts';

import { Role } from './role';

class CAddressDTO {
  @IsOptional()
  @IsString()
  apartmentNumber?: string;
  @IsOptional()
  addressCategory?: AddressAddressCategoryEnum;
  @IsOptional()
  street?: string;
  @IsOptional()
  houseNumber?: string;
  @IsOptional()
  postalCode?: string;
  @IsOptional()
  city?: string;
  @IsOptional()
  country?: string;
  @IsOptional()
  careOf?: string;
  @IsOptional()
  attention?: string;
  @IsOptional()
  propertyDesignation?: string;
  @IsOptional()
  isZoningPlanArea?: boolean;
  @IsOptional()
  invoiceMarking?: string;
  @IsOptional()
  location?: CoordinatesDTO;
}

class ContactInformationDTO implements IContactInformationDTO {
  @IsOptional()
  contactType?: ContactInformationContactTypeEnum;
  @IsOptional()
  value?: string;
}
export class CreateStakeholderDto implements StakeholderDTO {
  @IsNumber()
  @IsOptional()
  id?: number;
  @IsString()
  type!: StakeholderTypeEnum;
  @IsArray()
  roles!: Role[];
  @IsString()
  @IsOptional()
  firstName!: string;
  @IsString()
  @IsOptional()
  lastName!: string;
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CAddressDTO)
  addresses?: IAddressDTO[];
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ContactInformationDTO)
  contactInformation?: IContactInformationDTO[];
  @IsString()
  @IsOptional()
  personalNumber?: string;
  @IsString()
  @IsOptional()
  personId?: string;
  @IsString()
  @IsOptional()
  organizationName?: string;
  @IsString()
  @IsOptional()
  organizationNumber?: string;
  @IsString()
  @IsOptional()
  adAccount?: string;
  @IsObject()
  @IsOptional()
  extraParameters?: { [key: string]: string };
}
