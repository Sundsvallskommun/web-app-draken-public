import { Data } from '@common/services/api-service';
import { Address } from './address';
import { Role } from './role';

export type ContactInfoType = 'CELLPHONE' | 'PHONE' | 'EMAIL';
export interface ContactInfo {
  contactType: ContactInfoType;
  value: string;
}

export type StakeholderType = 'PERSON' | 'ORGANIZATION';

export interface CreateStakeholderDto {
  id?: string;
  clientId?: string;
  type: StakeholderType;
  roles: Role[];
  addresses?: Address[];
  contactInformation?: ContactInfo[];
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  organizationNumber?: string;
  authorizedSignatory?: string;
  personId?: string;
  adAccount?: string; //NOTE: This is same as Username
  personalNumber?: string;
  extraParameters?: {
    primaryContact?: 'true' | 'false';
    messageAllowed?: 'true' | 'false';
    extraInformation?: string;
  };
}

export interface Stakeholder extends CreateStakeholderDto {
  id: string;
  created: string;
  updated: string;
}

export interface StakeholderData extends Data {
  data: Stakeholder[];
}

export interface CasedataOwnerOrContact {
  id: string;
  clientId: string; // Random client side ID, needed for UI purposes before the stakeholder is saved. When saved it will get a id from the backend.
  stakeholderType: StakeholderType;
  roles: Role[];
  newRole: Role;
  personalNumber?: string;
  personId?: string;
  organizationName?: string;
  organizationNumber?: string;
  relation?: string;
  firstName: string;
  lastName: string;
  street: string;
  careof: string;
  zip: string;
  city: string;
  newPhoneNumber?: string;
  phoneNumbers: {
    value: string;
  }[];
  newEmail: string;
  emails: {
    value: string;
  }[];
  adAccount?: string;
  extraInformation?: string;
  removed?: boolean;
}
