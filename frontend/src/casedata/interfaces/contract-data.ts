import { Contract, Stakeholder as ContractStakeholder, StakeholderRole, StakeholderType } from './contracts';

export type StakeholderWithPersonnumber = ContractStakeholder & {
  personalNumber?: string;
  stakeholderId?: string; // ID from the errand stakeholder (not the same as partyId)
};

export interface UnifiedContractParty {
  stakeholderId: string;
  name: string;
  personalNumber?: string;
  organizationNumber?: string;
  address: { street?: string; careOf?: string; postalCode?: string; city?: string };
  roles: StakeholderRole[];
  type?: StakeholderType;
  originalStakeholder: StakeholderWithPersonnumber;
}

export type ContractData = Contract & {
  generateInvoice: 'true' | 'false';
  indexAdjusted: 'true' | 'false';
};
