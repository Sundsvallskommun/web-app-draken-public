import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';

// This person number is for test purposes, from the Swedish Tax Agency
export const MOCK_PERSON_NUMBER = Cypress.env('mockPersonNumber');

export const mockMexErrand_base = {
  data: {
    id: 101,
    version: 18,
    channel: 'EMAIL',
    created: '2024-05-17T10:49:58.958435+02:00',
    updated: '2024-05-17T10:50:18.789089+02:00',
    errandNumber: 'MEX-2024-000280',
    caseType: 'MEX_APPLICATION_SQUARE_PLACE',
    priority: 'MEDIUM',
    caseTitleAddition: 'Ansökan torgplats',
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
        roles: ['ADMINISTRATOR', 'SELLER'],
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
            value: Cypress.env('mockPhoneNumber'),
          },
          {
            contactType: 'EMAIL',
            value: Cypress.env('mockEmail'),
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
            value: Cypress.env('mockPhoneNumber'),
          },
          {
            contactType: 'EMAIL',
            value: Cypress.env('mockEmail'),
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
            value: Cypress.env('mockPhoneNumber'),
          },
          {
            contactType: 'EMAIL',
            value: Cypress.env('mockEmail'),
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
          propertyDesignation: 'SUNDSVALL FASTIGHET 1:2',
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
          additionalProp1: 'string',
          additionalProp2: 'string',
          additionalProp3: 'string',
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
          propertyDesignation: 'SUNDSVALL FASTIGHET 1:3',
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
          additionalProp1: 'string',
          additionalProp2: 'string',
          additionalProp3: 'string',
        },
      },
    ],
    // notifications: [
    //   {
    //     id: '27e796c1-d9d6-44b6-bfe6-ce9730164c29',
    //     municipalityId: '2281',
    //     namespace: 'SBK_MEX',
    //     created: '2025-03-18T15:56:33.704+01:00',
    //     modified: '2025-03-18T15:59:44.41+01:00',
    //     createdBy: 'UNKNOWN',
    //     type: 'UPDATE',
    //     description: 'Mock description,.',
    //     expires: '2025-04-17T14:56:33.694468Z',
    //     acknowledged: false,
    //     globalAcknowledged: true,
    //     errandId: 101,
    //     errandNumber: 'MEX-2024-000280',
    //   },
    // ],
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
            id: 1,
            version: 0,
            created: '2024-08-22T08:08:27.274543+02:00',
            updated: '2024-08-22T08:08:27.27456+02:00',
            category: 'BESLUT',
            name: 'beslut-arende-PRH-2022-000019',
            note: '',
            extension: 'pdf',
            mimeType: 'application/pdf',
            file: '',
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
    createdBy: Cypress.env('mockAdUsername'),
    updatedBy: 'UNKNOWN',
    extraParameters: [
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

export const modifyGetExtraParameter: (
  base: { data: { extraParameters: ExtraParameter[]; [key: string]: any }; message: string },
  obj: ExtraParameter
) => { data: { extraParameters: ExtraParameter[]; [key: string]: any }; message: string } = (base, obj) => {
  base.data['extraParameters'].forEach((extraParameter) => {
    if (extraParameter.key === obj.key) {
      extraParameter.values = obj.values;
    }
  });
  return {
    data: base.data,
    message: '',
  };
};

export const mockPostErrand_base = {
  id: '',
  priority: 'MEDIUM',
  caseType: 'PARKING_PERMIT',
  caseTitleAddition: 'Nytt parkeringstillstånd',
  status: 'Ärende inkommit',
  phase: 'Aktualisering',
  stakeholders: [
    {
      type: 'PERSON',
      roles: ['APPLICANT'],
      personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      firstName: 'Kim',
      lastName: 'Testsson',
      addresses: [
        {
          addressCategory: 'POSTAL_ADDRESS',
          street: 'Testvägen 4',
          apartmentNumber: '',
          postalCode: '123 45',
          city: 'SUNDSVALL',
        },
      ],
      contactInformation: [
        { contactType: 'PHONE', value: Cypress.env('mockPhoneNumber') },
        { contactType: 'EMAIL', value: Cypress.env('mockEmail') },
      ],
      personalNumber: MOCK_PERSON_NUMBER,
    },
    {
      type: 'PERSON',
      roles: ['CONTACT_PERSON'],
      firstName: 'Förnamn',
      lastName: 'Efternamn',
      extraParameters: {
        relation: '',
        primaryContact: 'false',
        messageAllowed: 'false',
      },
    },
  ],
  extraParameters: [
    {
      key: 'application.applicant.capacity',
      values: ['DRIVER'],
    },
    {
      key: 'application.reason',
      values: [''],
    },
    {
      key: 'application.role',
      values: ['SELF'],
    },
    {
      key: 'application.applicant.testimonial',
      values: ['true'],
    },
    {
      key: 'application.applicant.signingAbility',
      values: ['false'],
    },
    {
      key: 'disability.aid',
      values: ['Inget'],
    },
    {
      key: 'disability.walkingAbility',
      values: ['true'],
    },
    {
      key: 'disability.walkingDistance.beforeRest',
      values: [''],
    },
    {
      key: 'disability.walkingDistance.max',
      values: [''],
    },
    {
      key: 'disability.duration',
      values: ['P6M'],
    },
    {
      key: 'disability.canBeAloneWhileParking',
      values: ['true'],
    },
    {
      key: 'disability.canBeAloneWhileParking.note',
      values: [''],
    },
    {
      key: 'consent.contact.doctor',
      values: ['false'],
    },
    {
      key: 'consent.view.transportationServiceDetails',
      values: ['false'],
    },
  ],
};

export const mockPostErrand_full = {
  id: '',
  priority: 'MEDIUM',
  caseType: 'PARKING_PERMIT',
  caseTitleAddition: 'Nytt parkeringstillstånd',
  status: 'Ärende inkommit',
  phase: 'Aktualisering',
  stakeholders: [
    {
      type: 'PERSON',
      roles: ['APPLICANT'],
      personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      firstName: 'Kim',
      lastName: 'Testarsson',
      addresses: [
        {
          addressCategory: 'POSTAL_ADDRESS',
          street: 'Testvägen 4',
          apartmentNumber: '',
          postalCode: '123 45',
          city: 'SUNDSVALL',
        },
      ],
      contactInformation: [
        { contactType: 'PHONE', value: Cypress.env('mockPhoneNumber') },
        { contactType: 'EMAIL', value: Cypress.env('mockEmail') },
      ],
      personalNumber: MOCK_PERSON_NUMBER,
    },
    {
      id: '',
      type: 'PERSON',
      roles: ['DOCTOR'],
      contactInformation: [
        { contactType: 'PHONE', value: Cypress.env('mockPhoneNumber') },
        { contactType: 'EMAIL', value: Cypress.env('mockEmail') },
      ],
      firstName: 'Dr',
      lastName: 'Drsson',
    },
  ],
  extraParameters: [
    {
      key: 'application.applicant.capacity',
      values: ['DRIVER'],
    },
    {
      key: 'application.reason',
      values: ['Kan inte gå bra'],
    },
    {
      key: 'application.role',
      values: ['SELF'],
    },
    {
      key: 'application.applicant.testimonial',
      values: ['true'],
    },
    {
      key: 'application.applicant.signingAbility',
      values: ['true'],
    },
    {
      key: 'disability.aid',
      values: ['Krycka/kryckor/käpp', 'Rullator'],
    },
    {
      key: 'disability.walkingAbility',
      values: ['true'],
    },
    {
      key: 'disability.walkingDistance.beforeRest',
      values: ['100'],
    },
    {
      key: 'disability.walkingDistance.max',
      values: ['200'],
    },
    {
      key: 'disability.duration',
      values: ['P3Y'],
    },
    {
      key: 'disability.canBeAloneWhileParking',
      values: ['true'],
    },
    {
      key: 'disability.canBeAloneWhileParking.note',
      values: [''],
    },
    {
      key: 'consent.contact.doctor',
      values: ['true'],
    },
    {
      key: 'consent.view.transportationServiceDetails',
      values: ['true'],
    },
  ],
};

export const mockPatchErrand_base = {
  id: '101',
  priority: 'MEDIUM',
  caseType: 'PARKING_PERMIT',
  caseTitleAddition: 'Nytt parkeringstillstånd',
  status: 'Ärende inkommit',
  phase: 'Beslut',
  stakeholders: [
    {
      type: 'PERSON',
      id: '667',
      roles: ['APPLICANT'],
      personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      firstName: 'Kim',
      lastName: 'Testsson',
      addresses: [
        {
          addressCategory: 'POSTAL_ADDRESS',
          street: 'Testvägen 4',
          apartmentNumber: '',
          postalCode: '123 45',
          city: 'SUNDSVALL',
          careOf: 'Inneboende',
        },
      ],
      contactInformation: [
        { contactType: 'PHONE', value: Cypress.env('mockPhoneNumber') },
        { contactType: 'EMAIL', value: Cypress.env('mockEmail') },
      ],
      personalNumber: MOCK_PERSON_NUMBER,
    },
    {
      type: 'PERSON',
      roles: ['ADMINISTRATOR'],
      contactInformation: [],
      firstName: 'Katarina',
      lastName: 'Testhandläggare',
    },
  ],
  extraParameters: [
    {
      key: 'application.applicant.capacity',
      values: ['PASSENGER'],
    },
    {
      key: 'application.reason',
      values: ['Har svårt att gå'],
    },
    {
      key: 'application.role',
      values: ['SELF'],
    },
    {
      key: 'application.applicant.testimonial',
      values: ['true'],
    },
    {
      key: 'application.applicant.signingAbility',
      values: ['false'],
    },
    {
      key: 'disability.aid',
      values: ['Elrullstol', 'Rullstol (manuell)'],
    },
    {
      key: 'disability.walkingAbility',
      values: ['true'],
    },
    {
      key: 'disability.walkingDistance.beforeRest',
      values: ['100'],
    },
    {
      key: 'disability.walkingDistance.max',
      values: ['150'],
    },
    {
      key: 'disability.duration',
      values: ['P0Y'],
    },
    {
      key: 'disability.canBeAloneWhileParking',
      values: ['false'],
    },
    {
      key: 'disability.canBeAloneWhileParking.note',
      values: [''],
    },
    {
      key: 'consent.contact.doctor',
      values: ['false'],
    },
    {
      key: 'consent.view.transportationServiceDetails',
      values: ['true'],
    },
  ],
};

export const modifyPatchExtraParameter: (
  base: { [key: string]: any },
  obj: { [key: string]: any }
) => { [key: string]: any } = (base, obj) => ({
  ...base,
  extraParameters: { ...base.extraParameters, ...obj },
});
