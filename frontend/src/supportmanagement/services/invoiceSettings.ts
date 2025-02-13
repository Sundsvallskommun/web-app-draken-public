import { CAccountInformation } from 'src/data-contracts/backend/data-contracts';

export interface CustomerIdentity {
  companyId: number;
  displayOrder: number;
  name: string;
  counterpart: string;
}

export interface InternalCustomerIdentity extends CustomerIdentity {
  orgId: string[];
  customerId: number;
}

export interface ExternalCustomerIdentity extends CustomerIdentity {
  orgNr?: string;
  customerReference?: string;
  legalEntityAddressSource: 'address' | 'postAddress';
}

export interface InvoiceActivity {
  value: string | null;
  name: string;
  costCenter?: string;
  default: string;
}

export interface InvoiceRow {
  costPerUnit: number;
  description: string;
  visible: boolean;
  main: boolean;
  accountInformationRows: AccountInformationRow[];
}

export interface AccountInformationRow {
  amountFromParent: boolean;
  amount?: number;
  project?: string;
}

export interface InvoiceType {
  invoiceType: string;
  fixedPrice: boolean;
  internal: InvoiceTypeInternal;
  external: InvoiceTypeExternal;
}

export interface InvoiceTypeInternal {
  invoiceRows: InvoiceRow[];
  accountInformation: CAccountInformation;
}

export interface InvoiceTypeExternal {
  invoiceRows: InvoiceRow[];
  accountInformation: CAccountInformation;
}

export const invoiceSettings: {
  category: 'SALARY_AND_PENSION';
  activities: InvoiceActivity[];
  invoiceTypes: InvoiceType[];
  customers: { internal: InternalCustomerIdentity[]; external: ExternalCustomerIdentity[] };
} = {
  category: 'SALARY_AND_PENSION',
  activities: [
    {
      value: '5756',
      name: 'Lön och pension',
      costCenter: '15810100',
      default: 'false',
    },
    {
      value: '5757',
      name: 'Drift (Heroma)',
      costCenter: '15800100',
      default: 'false',
    },
  ],
  invoiceTypes: [
    {
      invoiceType: 'Extra löneutbetalning - Systemet',
      fixedPrice: true,
      internal: {
        invoiceRows: [
          {
            costPerUnit: 300,
            description: 'Ärendenummer: <errandNumber>',
            visible: true,
            main: true,
            accountInformationRows: [{ amountFromParent: true }],
          },
          {
            costPerUnit: 6,
            description: 'Utvecklingskostnad 2%',
            visible: false,
            main: false,
            accountInformationRows: [{ amountFromParent: true }],
          },
        ],
        accountInformation: {
          costCenter: '15810100',
          subaccount: '936300',
          department: '920360',
          activity: '5756',
        },
      },
      external: {
        invoiceRows: [
          {
            costPerUnit: 306,
            description: 'Ärendenummer: <errandNumber>',
            visible: true,
            main: true,
            accountInformationRows: [
              {
                amountFromParent: false,
                amount: 300,
              },
              {
                amountFromParent: false,
                amount: 6,
                project: '11041',
              },
            ],
          },
        ],
        accountInformation: {
          costCenter: '15810100',
          subaccount: '363000',
          department: '920360',
          activity: '5756',
        },
      },
    },
    {
      invoiceType: 'Extra löneutbetalning - Direktinsättning',
      fixedPrice: true,
      internal: {
        invoiceRows: [
          {
            costPerUnit: 1500,
            description: 'Ärendenummer: <errandNumber>',
            visible: true,
            main: true,
            accountInformationRows: [{ amountFromParent: true }],
          },
          {
            costPerUnit: 30,
            description: 'Utvecklingskostnad 2%',
            visible: false,
            main: false,
            accountInformationRows: [{ amountFromParent: true }],
          },
        ],
        accountInformation: {
          costCenter: '15810100',
          subaccount: '936300',
          department: '920360',
          activity: '5756',
        },
      },
      external: {
        invoiceRows: [
          {
            costPerUnit: 1530,
            description: 'Ärendenummer: <errandNumber>',
            visible: true,
            main: true,
            accountInformationRows: [
              {
                amountFromParent: false,
                amount: 1500,
              },
              {
                amountFromParent: false,
                amount: 30,
                project: '11041',
              },
            ],
          },
        ],
        accountInformation: {
          costCenter: '15810100',
          subaccount: '363000',
          department: '920360',
          activity: '5756',
        },
      },
    },
    {
      invoiceType: 'Extra beställning',
      fixedPrice: true,
      internal: {
        invoiceRows: [
          {
            costPerUnit: 350,
            description: 'Ärendenummer: <errandNumber>',
            visible: true,
            main: true,
            accountInformationRows: [{ amountFromParent: true }],
          },
          {
            costPerUnit: 7,
            description: 'Utvecklingskostnad 2%',
            visible: false,
            main: false,
            accountInformationRows: [{ amountFromParent: true }],
          },
        ],
        accountInformation: {
          costCenter: '15810100',
          subaccount: '936300',
          department: '920360',
          activity: '5756',
        },
      },
      external: {
        invoiceRows: [
          {
            costPerUnit: 357,
            description: 'Ärendenummer: <errandNumber>',
            visible: true,
            main: true,
            accountInformationRows: [
              {
                amountFromParent: false,
                amount: 350,
              },
              {
                amountFromParent: false,
                amount: 7,
                project: '11041',
              },
            ],
          },
        ],
        accountInformation: {
          costCenter: '15800100',
          subaccount: '363000',
          department: '920360',
          activity: '5757',
        },
      },
    },
  ],
  customers: {
    internal: [
      {
        companyId: 1,
        displayOrder: 1,
        orgId: ['24'],
        customerId: 60,
        name: 'Barn och Utbildning',
        counterpart: '160',
      },
      {
        companyId: 1,
        displayOrder: 2,
        orgId: ['58'],
        customerId: 16,
        name: 'Drakfastigheter',
        counterpart: '116',
      },
      {
        companyId: 1,
        displayOrder: 3,
        orgId: ['31'],
        customerId: 20,
        name: 'Individ- och Arbetsmarknadsförvaltningen',
        counterpart: '120',
      },
      {
        companyId: 1,
        displayOrder: 4,
        orgId: ['28'],
        customerId: 10,
        name: 'Kommunstyrelsekontoret',
        counterpart: '110',
      },
      {
        companyId: 1,
        displayOrder: 5,
        orgId: ['30'],
        customerId: 40,
        name: 'Kultur och fritid',
        counterpart: '140',
      },
      {
        companyId: 1,
        displayOrder: 6,
        orgId: ['27'],
        customerId: 32,
        name: 'Lantmäterikontoret',
        counterpart: '132',
      },
      {
        companyId: 1,
        displayOrder: 7,
        orgId: ['25'],
        customerId: 80,
        name: 'Miljökontoret',
        counterpart: '180',
      },
      {
        companyId: 1,
        displayOrder: 8,
        orgId: ['28', '2849'],
        customerId: 15,
        name: 'Servicecenter',
        counterpart: '150',
      },
      {
        companyId: 1,
        displayOrder: 9,
        orgId: ['26'],
        customerId: 30,
        name: 'Stadsbyggnadskontoret',
        counterpart: '130',
      },
      {
        companyId: 1,
        displayOrder: 10,
        orgId: ['23'],
        customerId: 70,
        name: 'Vård och Omsorgsförvaltningen',
        counterpart: '170',
      },
      {
        companyId: 1,
        displayOrder: 11,
        orgId: ['29'],
        customerId: 90,
        name: 'Överförmyndarkontoret',
        counterpart: '190',
      },
    ],
    external: [
      {
        companyId: 2,
        displayOrder: 1,
        orgNr: '2220000422',
        name: 'Medelpads Räddningstjänstförbund',
        counterpart: '831',
        customerReference: 'MAR01ENB',
        legalEntityAddressSource: 'address',
      },
      {
        companyId: 3,
        displayOrder: 2,
        orgNr: '5569324832',
        name: 'Midlanda Flygplats',
        counterpart: '542',
        customerReference: '12564/CÖ',
        legalEntityAddressSource: 'address',
      },
      {
        companyId: 14,
        displayOrder: 3,
        orgNr: '5560676982',
        name: 'Mitthem',
        counterpart: '555',
        customerReference: 'Erika Wass',
        legalEntityAddressSource: 'address',
      },
      {
        companyId: 9,
        displayOrder: 4,
        orgNr: '5566618756',
        name: 'MittSverige Vatten AB',
        counterpart: '521',
        customerReference: 'SELJM',
        legalEntityAddressSource: 'address',
      },
      {
        companyId: 53,
        displayOrder: 5,
        orgNr: '5590216262',
        name: 'Ostkustbanan',
        counterpart: '627',
        customerReference: 'Ingela Bendrot',
        legalEntityAddressSource: 'postAddress',
      },
      {
        companyId: 12,
        displayOrder: 6,
        orgNr: '5567659296',
        name: 'Servanet',
        counterpart: '512',
        customerReference: 'SEVRN',
        legalEntityAddressSource: 'address',
      },
      {
        companyId: 15,
        displayOrder: 7,
        orgNr: '5564371424',
        name: 'SKIFU',
        counterpart: '557',
        customerReference: '6520-900-100',
        legalEntityAddressSource: 'address',
      },
      {
        companyId: 54,
        displayOrder: 8,
        orgNr: '5564786654',
        name: 'Stadsbacken',
        counterpart: '500',
        customerReference: 'SAN26JOH',
        legalEntityAddressSource: 'postAddress',
      },
      {
        companyId: 11,
        displayOrder: 9,
        orgNr: '5565027223',
        name: 'Sundsvall Elnät AB',
        counterpart: '511',
        customerReference: 'SEVRN',
        legalEntityAddressSource: 'address',
      },
      {
        companyId: 8,
        displayOrder: 10,
        orgNr: '5564786647',
        name: 'Sundsvall Energi AB',
        counterpart: '510',
        customerReference: 'EME12JOH',
        legalEntityAddressSource: 'address',
      },
      {
        companyId: 17,
        displayOrder: 11,
        orgNr: '5567897383',
        name: 'Sundsvall Logistikpark',
        counterpart: '554',
        customerReference: 'Mikael Olsson',
        legalEntityAddressSource: 'postAddress',
      },
      {
        companyId: 16,
        displayOrder: 12,
        orgNr: '5560158072',
        name: 'Sundsvalls Hamn',
        counterpart: '551',
        customerReference: 'Ing-Marie Alm',
        legalEntityAddressSource: 'address',
      },
    ],
  },
};