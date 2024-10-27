import { MOCK_PERSON_NUMBER } from './mockMexErrand';

export const mockContract = {
  data: {
    contractId: '2024-01026',
    externalReferenceId: '1021',
    landLeaseType: 'LEASEHOLD',
    municipalityId: '2281',
    status: 'DRAFT',
    type: 'PURCHASE_AGREEMENT',
    stakeholders: [
      {
        type: 'COMPANY',
        roles: ['BUYER'],
        organizationName: 'Testbolaget',
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
      {
        type: 'PERSON',
        roles: ['PROPERTY_OWNER'],
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
        id: 2075,
        version: 1,
        created: '2024-05-17T10:50:17.25221+02:00',
        updated: '2024-05-17T10:50:17.252221+02:00',
        type: 'PERSON',
        personalNumber: MOCK_PERSON_NUMBER,
        firstName: 'My',
        lastName: 'Testsson',
        roles: ['ADMINISTRATOR', 'SELLER'],
        adAccount: 'kctest',
        addresses: [],
        address: {
          type: 'POSTAL_ADDRESS',
          streetAddress: 'Testvägen 44',
          careOf: '',
          postalCode: '12345',
          town: 'Sundsvall',
          country: '',
          attention: '',
        },
        contactInformation: [],
        extraParameters: {},
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
