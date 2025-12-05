import { Contract, Stakeholder as ContractStakeholder } from './contracts';

export type StakeholderWithPersonnumber = ContractStakeholder & {
  personalNumber?: string;
};

export type ContractData = Contract & {
  buyers?: StakeholderWithPersonnumber[];
  sellers?: StakeholderWithPersonnumber[];
  lessees?: StakeholderWithPersonnumber[];
  lessors?: StakeholderWithPersonnumber[];
  generateInvoice: 'true' | 'false';
  indexAdjusted: 'true' | 'false';
};
