import { Contract, Stakeholder as ContractStakeholder } from './contracts';

export type StakeholderWithPersonnumber = ContractStakeholder & {
  personalNumber?: string;
  stakeholderId?: string; // ID from the errand stakeholder (not the same as partyId)
};

export type ContractData = Contract & {
  buyers?: StakeholderWithPersonnumber[];
  sellers?: StakeholderWithPersonnumber[];
  lessees?: StakeholderWithPersonnumber[];
  lessors?: StakeholderWithPersonnumber[];
  generateInvoice: 'true' | 'false';
  indexAdjusted: 'true' | 'false';
};
