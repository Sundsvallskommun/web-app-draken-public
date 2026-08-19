import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { mockEnv } from '../../fixtures/mock-env';

// This person number is for test purposes, from the Swedish Tax Agency
export const MOCK_PERSON_NUMBER = mockEnv.mockPersonNumber;

export const mockMexErrand_base = {
  data: {
    id: 101,
    version: 18,
    channel: 'EMAIL',
    created: '2024-05-17T10:49:58.958435+02:00',
    updated: '2024-05-17T10:50:18.789089+02:00',
    errandNumber: 'MEX-2024-000280',
    caseType: 'MEX_SQUARE_PLACE',
    priority: 'MEDIUM',
    caseTitleAddition: 'Torgplats',
    phase: 'Beslut',
    externalCaseId: '1234',
    status: {
      statusType: 'Under utredning',
      description: 'Under utredning',
      created: '2024-05-20T10:50:18.681018+02:00',
    },
    statuses: [
      {
        statusType: 'Under granskning',
        description: 'Under granskning',
        created: '2024-05-17T10:50:18.681018+02:00',
      },
      {
        statusType: 'Under utredning',
        description: 'Under utredning',
        created: '2024-05-20T10:50:18.681018+02:00',
      },
    ],
    municipalityId: '2281',
    processId: '712840eb-142a-11ef-86df-0242c0a82063',
    stakeholders: [
      {
        id: 2075,
        version: 1,
        created: '2024-05-17T10:50:17.25221+02:00',
        updated: '2024-05-17T10:50:17.252221+02:00',
        type: 'PERSON',
        personalNumber: MOCK_PERSON_NUMBER,
        firstName: 'My',
        lastName: 'Testsson',
        roles: ['ADMINISTRATOR'],
        adAccount: 'kctest',
        addresses: [],
        address: {
          streetAddress: '',
        },
        contactInformation: [],
        extraParameters: {},
      },
      {
        id: 2260,
        version: 3,
        created: '2024-06-10T14:25:47.461919+02:00',
        updated: '2024-06-10T14:35:06.168435+02:00',
        type: 'PERSON',
        firstName: 'Test',
        lastName: 'Upplåtarsson',
        organizationName: '',
        roles: ['CONTACT_PERSON', 'PROPERTY_OWNER'],
        personalNumber: MOCK_PERSON_NUMBER,
        addresses: [
          {
            addressCategory: 'POSTAL_ADDRESS',
            street: 'Testgata 1',
            postalCode: '12345',
            city: 'Staden',
            careOf: '',
          },
        ],
        address: {
          streetAddress: '',
        },
        contactInformation: [
          {
            contactType: 'PHONE',
            value: mockEnv.mockPhoneNumber,
          },
          {
            contactType: 'EMAIL',
            value: mockEnv.mockEmail,
          },
        ],
        extraParameters: {},
      },
      {
        id: 2280,
        version: 3,
        created: '2024-05-10T14:25:47.461919+02:00',
        updated: '2024-05-10T14:35:06.168435+02:00',
        type: 'PERSON',
        firstName: 'Test',
        lastName: 'Arrendatorsson',
        organizationName: '',
        roles: ['APPLICANT', 'LEASEHOLDER'],
        personalNumber: MOCK_PERSON_NUMBER,
        addresses: [
          {
            addressCategory: 'POSTAL_ADDRESS',
            street: 'Testgata 41',
            postalCode: '12345',
            city: 'Staden',
            careOf: '',
          },
        ],
        address: {
          streetAddress: '',
        },
        contactInformation: [
          {
            contactType: 'PHONE',
            value: mockEnv.mockPhoneNumber,
          },
          {
            contactType: 'EMAIL',
            value: mockEnv.mockEmail,
          },
        ],
        extraParameters: {},
      },
      {
        id: 2290,
        version: 3,
        created: '2024-05-10T14:25:47.461919+02:00',
        updated: '2024-05-10T14:35:06.168435+02:00',
        type: 'PERSON',
        firstName: 'Daniella',
        lastName: 'Testarsson',
        organizationName: '',
        roles: ['SELLER'],
        personalNumber: MOCK_PERSON_NUMBER,
        addresses: [
          {
            addressCategory: 'POSTAL_ADDRESS',
            street: 'Testgata 41',
            postalCode: '12345',
            city: 'Staden',
            careOf: '',
          },
        ],
        address: {
          streetAddress: '',
        },
        contactInformation: [
          {
            contactType: 'PHONE',
            value: mockEnv.mockPhoneNumber,
          },
          {
            contactType: 'EMAIL',
            value: mockEnv.mockEmail,
          },
        ],
        extraParameters: {},
      },
      {
        id: 2106,
        version: 3,
        created: '2024-05-10T14:25:47.461919+02:00',
        updated: '2024-05-10T14:35:06.168435+02:00',
        type: 'PERSON',
        firstName: 'Test',
        lastName: 'Köparsson',
        organizationName: '',
        roles: ['BUYER'],
        addresses: [
          {
            addressCategory: 'POSTAL_ADDRESS',
            street: 'Testgata 2',
            postalCode: '12345',
            city: 'Staden',
            careOf: '',
          },
        ],
        address: {
          streetAddress: '',
        },
        contactInformation: [
          {
            contactType: 'PHONE',
            value: mockEnv.mockPhoneNumber,
          },
          {
            contactType: 'EMAIL',
            value: mockEnv.mockEmail,
          },
        ],
        extraParameters: {},
      },
    ],
    facilities: [
      {
        id: 16587423541245,
        version: 0,
        created: '2024-06-05T12:44:32.996Z',
        updated: '2024-06-05T12:44:32.996Z',
        description: 'En fritextbeskrivning av facility.',
        address: {
          addressCategory: 'POSTAL_ADDRESS',
          street: 'Testvägen',
          houseNumber: '18',
          postalCode: '123 45',
          city: 'Sundsvall',
          country: 'Sverige',
          careOf: 'Test Testorsson',
          attention: 'Test Testorsson',
          propertyDesignation: 'TESTSTAD 1:1',
          apartmentNumber: 'LGH 1001',
          isZoningPlanArea: true,
          invoiceMarking: 'string',
          location: {
            latitude: 62.390205,
            longitude: 17.306616,
          },
        },
        facilityCollectionName: 'Sundsvalls testfabrik',
        mainFacility: true,
        facilityType: 'string',
        extraParameters: {
          districtname: 'Låtsasdistrikt',
        },
      },
      {
        id: 26357423541660,
        version: 0,
        created: '2024-03-05T12:44:32.996Z',
        updated: '2024-03-05T12:44:32.996Z',
        description: 'En fritextbeskrivning av facility.',
        address: {
          addressCategory: 'POSTAL_ADDRESS',
          street: 'Testvägen',
          houseNumber: '20',
          postalCode: '123 45',
          city: 'Sundsvall',
          country: 'Sverige',
          careOf: 'Test Testorsson',
          attention: 'Test Testorsson',
          propertyDesignation: 'TESTSTAD 1:2',
          apartmentNumber: 'LGH 1001',
          isZoningPlanArea: true,
          invoiceMarking: 'string',
          location: {
            latitude: 62.390205,
            longitude: 17.306616,
          },
        },
        facilityCollectionName: 'Sundsvalls testfabrik',
        mainFacility: false,
        facilityType: 'string',
        extraParameters: {
          districtname: 'Låtsasdistrikt',
        },
      },
    ],
    decisions: [
      {
        id: 1,
        version: 1,
        created: '2023-10-23T09:30:11.009272+02:00',
        updated: '2024-08-22T08:08:27.281423+02:00',
        decisionType: 'FINAL',
        decisionOutcome: 'APPROVAL',
        description: '<p>test</p>',
        law: [
          {
            heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
            sfs: 'Trafikförordningen (1998:1276)',
            chapter: '13',
            article: '8',
          },
        ],
        decidedAt: '2024-08-22T08:08:27.918+02:00',
        validFrom: '2023-10-23T00:00:00+02:00',
        validTo: '2023-10-23T00:00:00+02:00',
        attachments: [
          {
            id: 9001,
            version: 0,
            created: '2024-08-22T08:08:27.274543+02:00',
            updated: '2024-08-22T08:08:27.27456+02:00',
            category: 'DECISION',
            name: 'beslut-arende-SGP-2022-000019',
            note: '',
            extension: 'pdf',
            mimeType: 'application/pdf',
            hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            extraParameters: {},
          },
        ],
        extraParameters: {},
      },
    ],
    appeals: [],
    notes: [
      {
        id: 1,
        version: 1,
        created: '2024-06-10T15:47:31.558471+02:00',
        updated: '2024-06-10T15:47:31.57027+02:00',
        title: '',
        text: 'Mock note',
        createdBy: 'kctest',
        updatedBy: 'kctest',
        noteType: 'PUBLIC',
        extraParameters: {},
      },
      {
        id: 2,
        version: 1,
        created: '2024-06-10T15:47:31.558471+02:00',
        updated: '2024-06-10T15:47:31.57027+02:00',
        title: '',
        text: 'Mock comment',
        createdBy: 'kctest',
        updatedBy: 'kctest',
        noteType: 'INTERNAL',
        extraParameters: {},
      },
      {
        id: 3,
        version: 1,
        created: '2024-06-10T15:47:31.558471+02:00',
        updated: '2024-06-10T15:47:31.57027+02:00',
        title: '',
        text: 'Mock note',
        createdBy: 'kctest',
        updatedBy: 'kctest',
        noteType: 'PUBLIC',
        extraParameters: {},
      },
    ],
    messageIds: [],
    createdByClient: 'WSO2_MEXUI',
    updatedByClient: 'WSO2_Camunda',
    createdBy: mockEnv.mockAdUsername,
    updatedBy: 'UNKNOWN',
    extraParameters: [
      {
        key: 'caseMeaning',
        values: [''],
      },
      {
        key: 'dummyItem',
        values: ['dummyValue1', 'dummyValue2'],
      },
      {
        key: 'contractId',
        values: ['2024-01026'],
      },
      {
        key: 'process.phaseStatus',
        values: ['COMPLETED'],
      },
      {
        key: 'process.phaseAction',
        values: ['UNKNOWN'],
      },
      {
        key: 'process.displayPhase',
        values: ['Utredning'],
      },
      {
        key: 'propertyDesignation',
        values: ['Test property'],
      },
    ],
  },
  message: 'success',
};

export const modifyField: (
  base: { data: { [key: string]: any }; message: string },
  obj: { [key: string]: any }
) => { data: { [key: string]: any }; message: string } = (base, obj) => ({
  data: {
    ...base.data,
    ...obj,
  },
  message: '',
});
