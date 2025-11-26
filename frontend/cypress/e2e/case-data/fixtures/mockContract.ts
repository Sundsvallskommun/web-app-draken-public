import { ContractType, LeaseType } from '@casedata/interfaces/contracts';

export const mockPurchaseAgreement = {
  data: {
    contractId: '2024-01026',
    externalReferenceId: '1021',
    landLeaseType: 'LEASEHOLD',
    municipalityId: '2281',
    status: 'DRAFT',
    type: 'PURCHASE_AGREEMENT',
    stakeholders: [
      {
        type: 'PERSON',
        roles: ['BUYER'],
        firstName: 'Test',
        lastName: 'Köparsson',
        address: {
          type: 'POSTAL_ADDRESS',
          streetAddress: 'Testvägen 1',
          postalCode: '12234',
          town: 'Sundsvall',
          country: '',
          attention: '',
        },
      },
      {
        type: 'PERSON',
        roles: ['SELLER'],
        firstName: 'Daniella',
        lastName: 'Testarsson',
        address: {
          type: 'POSTAL_ADDRESS',
          streetAddress: 'Testvägen 12',
          postalCode: '',
          town: 'Sundsvall',
          country: '',
          attention: '',
        },
      },
    ],
    indexTerms: [
      {
        header: 'Överlåtelseförklaring',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Köpeskilling och betalning',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Tillträde',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Markföroreningar',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Skog',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Förpliktelser',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Utgifter och kostnader',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Fastighetsbildning',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Övriga villkor',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
    ],
  },
  message: 'success',
};

export const mockLeaseAgreement = {
  data: {
    contractId: '2024-01026',
    externalReferenceId: '1021',
    municipalityId: '2281',
    status: 'DRAFT',
    type: ContractType.LEASE_AGREEMENT,
    leaseType: LeaseType.USUFRUCT_MOORING,
    stakeholders: [
      {
        type: 'PERSON',
        roles: ['LESSOR'],
        firstName: 'Anna',
        lastName: 'Testarlund',
        address: {
          type: 'POSTAL_ADDRESS',
          streetAddress: 'Testvägen 13',
          careOf: '',
          postalCode: '12345',
          town: 'Sundsvall',
          country: '',
          attention: '',
        },
      },
      {
        type: 'PERSON',
        roles: ['LESSEE'],
        firstName: 'Bengt',
        lastName: 'Testarrendator',
        address: {
          type: 'POSTAL_ADDRESS',
          streetAddress: 'Testvägen 13',
          careOf: '',
          postalCode: '12345',
          town: 'Sundsvall',
          country: '',
          attention: '',
        },
      },
    ],
    indexTerms: [
      {
        header: 'Område och upplåtelse',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Ändamål',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Arrendetid och uppsägning',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Arrendeavgift',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Bygglov och tillstånd',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Överlåtelse och underupplåtelse',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Inskrivning',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Skick och skötsel',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Ledningar',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Kostnader',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Markföroreningar',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Arrendets upphörande och återställning av området',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
      {
        header: 'Skada och ansvar',
        terms: [
          {
            description: 'content',
            term: '',
          },
        ],
      },
    ],
  },
  message: 'success',
};
