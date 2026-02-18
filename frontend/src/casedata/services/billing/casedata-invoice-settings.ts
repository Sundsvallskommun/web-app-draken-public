import { CAccountInformation } from 'src/data-contracts/backend/data-contracts';

export interface CasedataService {
  id: string;
  name: string;
  description: string;
  costPerUnit: number;
  unit: string;
  accountInformation: CAccountInformation;
}

interface CasedataActivity {
  value: string;
  name: string;
  costCenter?: string;
}

export interface CasedataInvoiceSettings {
  category: string;
  counterpart: string;
  services: CasedataService[];
  activities: CasedataActivity[];
}

export const casedataInvoiceSettings: CasedataInvoiceSettings = {
  category: 'MEX_INVOICE',
  counterpart: '00000000',
  services: [
    {
      id: 'placeholder-service-1',
      name: 'Placeholder Tjänst 1',
      description: 'Beskrivning av tjänst 1',
      costPerUnit: 500,
      unit: 'st',
      accountInformation: {
        costCenter: '10000000',
        subaccount: '000000',
        department: '000000',
        activity: '0000',
        counterpart: '00000000',
      },
    },
    {
      id: 'placeholder-service-2',
      name: 'Placeholder Tjänst 2',
      description: 'Beskrivning av tjänst 2',
      costPerUnit: 1000,
      unit: 'timme',
      accountInformation: {
        costCenter: '10000000',
        subaccount: '000000',
        department: '000000',
        activity: '0000',
        counterpart: '00000000',
      },
    },
    {
      id: 'placeholder-service-3',
      name: 'Placeholder Tjänst 3',
      description: 'Beskrivning av tjänst 3',
      costPerUnit: 250,
      unit: 'st',
      accountInformation: {
        costCenter: '10000000',
        subaccount: '000000',
        department: '000000',
        activity: '0000',
        counterpart: '00000000',
      },
    },
  ],
  activities: [
    { value: '0000', name: 'Placeholder Aktivitet 1' },
    { value: '0001', name: 'Placeholder Aktivitet 2' },
  ],
};
