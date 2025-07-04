import { Decision } from '@casedata/interfaces/decision';
import dayjs from 'dayjs';

export const mockErrand_base = {
  data: {
    id: 101,
    version: 92,
    created: '2022-10-11T12:13:29.224392+02:00',
    updated: '2022-10-14T10:38:05.416038+02:00',
    extraParameters: {
      'application.applicant.testimonial': 'true',
      'consent.view.transportationServiceDetails': 'true',
      'disability.aid': 'Elrullstol,Rullstol (manuell)',
      'disability.canBeAloneWhileParking': 'false',
      'application.role': 'SELF',
      'application.applicant.capacity': 'PASSENGER',
      'application.applicant.signingAbility': 'false',
      'disability.walkingDistance.max': '150',
      'disability.walkingDistance.beforeRest': '100',
      'consent.contact.doctor': 'false',
      'application.reason': 'Har svårt att gå',
      'disability.canBeAloneWhileParking.note': '',
      'disability.duration': 'P6M',
    },
    errandNumber: 'PRH-2022-000019',
    externalCaseId: '2668',
    caseType: 'PARKING_PERMIT',
    priority: 'MEDIUM',
    description: '',
    caseTitleAddition: 'Nytt parkeringstillstånd',
    diaryNumber: '',
    phase: 'Aktualisering',
    statuses: [
      {
        statusType: 'Under granskning',
        description: 'Under granskning',
        dateTime: '2022-10-14T09:17:52.067+02:00',
      },
    ],
    municipalityId: '2281',
    processId: '5a671ddf-494d-11ed-850f-0242ac110002',
    stakeholders: [
      {
        id: 666,
        version: 81,
        created: '2022-10-11T12:13:29.225848+02:00',
        updated: '2022-10-14T10:38:05.528016+02:00',
        extraParameters: {},
        type: 'PERSON',
        firstName: 'Katarina',
        lastName: 'Testhandläggare',
        roles: ['ADMINISTRATOR'],
        addresses: [],
        contactInformation: [],
      },
      {
        id: 667,
        version: 81,
        created: '2022-10-11T12:13:29.226233+02:00',
        updated: '2022-10-14T10:38:05.529007+02:00',
        extraParameters: {},
        type: 'PERSON',
        firstName: 'Kim',
        lastName: 'Testarsson',
        personId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
        roles: ['APPLICANT'],
        addresses: [
          {
            street: 'Testgatan 4',
            postalCode: '12345',
            city: 'SUNDSVALL',
            careOf: 'Inneboende',
          },
        ],
        contactInformation: [
          {
            contactType: 'PHONE',
            value: Cypress.env('mockPhoneNumber'),
          },
          {
            contactType: 'EMAIL',
            value: 'test@example.com',
          },
        ],
        personalNumber: Cypress.env('mockPersonNumber'),
      },
    ],
    facilities: [],
    decisions: [
      {
        id: 771,
        version: 2,
        created: '2022-10-28T11:00:01.503519+02:00',
        updated: '2022-10-28T11:04:08.7989+02:00',
        extraParameters: {},
        decisionType: 'RECOMMENDED',
        decisionOutcome: 'APPROVAL',
        description:
          'Personen är boende i Sundsvalls kommun. Nuvarande kontroll ger rekommenderat beslut att godkänna ansökan',
        law: [],
        attachments: [],
      },
      {
        id: 627,
        version: 11,
        created: '2022-10-13T12:58:56.30307+02:00',
        updated: '2022-10-14T10:38:05.532248+02:00',
        extraParameters: {},
        decisionType: 'PROPOSED',
        decisionOutcome: 'APPROVAL',
        description: '<p>Utredningstext, föreslår avslag</p>',
        law: [
          {
            heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
            sfs: 'Trafikförordningen (1998:1276)',
            chapter: '13',
            article: '8',
          },
        ],
        decidedAt: dayjs('2022-11-01').toISOString(),
        decidedBy: {
          id: 666,
          version: 81,
          created: '2022-10-11T12:13:29.225848+02:00',
          updated: '2022-10-14T10:38:05.528016+02:00',
          extraParameters: {},
          type: 'PERSON',
          firstName: 'Testadmin',
          lastName: 'Testsson',
          roles: ['ADMINISTRATOR'],
          addresses: [],
          contactInformation: [],
        },
        attachments: [],
      },
      {
        id: 628,
        version: 14,
        created: '2022-10-13T13:03:49.432854+02:00',
        updated: '2022-10-14T10:38:05.532526+02:00',
        extraParameters: {},
        decisionType: 'FINAL',
        decisionOutcome: 'APPROVAL',
        description: '<p>Utredningstext, föreslår avslag men det blir bifall ändå.</p>',
        law: [
          {
            heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
            sfs: 'Trafikförordningen (1998:1276)',
            chapter: '13',
            article: '8',
          },
        ],
        validFrom: '2022-10-14T00:00:00+02:00',
        validTo: '2022-11-26T00:00:00+01:00',
        attachments: [
          {
            id: 185,
            version: 0,
            created: '2022-10-14T10:38:05.181883+02:00',
            updated: '2022-10-14T10:38:05.181888+02:00',
            extraParameters: {},
            category: 'BESLUT',
            name: 'beslut-arende-103',
            note: '',
            extension: 'pdf',
            mimeType: 'application/pdf',
            file: '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MCBSL2ltZzAgMyAwIFI+Pj4+L0Fubm90c1s2IDAgUl0vUGFyZW50IDggMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXT4+CmVuZG9iagoxMSAwIG9iago8PC9EZXN0WzUgMCBSL1hZWiAwIDU0OC43IDBdL1RpdGxlKFJ1YnJpaykvUGFyZW50IDEwIDAgUj4+CmVuZG9iagoxMCAwIG9iago8PC9EZXN0WzUgMCBSL1hZWiAwIDY0NC4yNSAwXS9Db3VudCAxL1RpdGxlKEJlc2x1dCkvUGFyZW50IDkgMCBSL0ZpcnN0IDExIDAgUi9MYXN0IDExIDAgUj4+CmVuZG9iago5IDAgb2JqCjw8L1R5cGUvT3V0bGluZXMvQ291bnQgMi9GaXJzdCAxMCAwIFIvTGFzdCAxMCAwIFI+PgplbmRvYmoKMSAwIG9iago8PC9TdWJ0eXBlL1R5cGUxL1R5cGUvRm9udC9CYXNlRm9udC9IZWx2ZXRpY2EvRW5jb2RpbmcvV2luQW5zaUVuY29kaW5nPj4KZW5kb2JqCjIgMCBvYmoKPDwvU3VidHlwZS9UeXBlMS9UeXBlL0ZvbnQvQmFzZUZvbnQvSGVsdmV0aWNhLUJvbGQvRW5jb2RpbmcvV2luQW5zaUVuY29kaW5nPj4KZW5kb2JqCjggMCBvYmoKPDwvS2lkc1s1IDAgUl0vVHlwZS9QYWdlcy9Db3VudCAxL0lUWFQoMS4zLjExKT4+CmVuZG9iagoxMiAwIG9iago8PC9QYWdlTW9kZS9Vc2VPdXRsaW5lcy9UeXBlL0NhdGFsb2cvT3V0bGluZXMgOSAwIFIvUGFnZXMgOCAwIFI+PgplbmRvYmoKMTMgMCBvYmoKPDw+PgplbmRvYmoKeHJlZgowIDE0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwNDgyNyAwMDAwMCBuIAowMDAwMDA0OTE1IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMTI5MCAwMDAwMCBuIAowMDAwMDA0MzYzIDAwMDAwIG4gCjAwMDAwMDMxNzMgMDAwMDAgbiAKMDAwMDAwMzMyMCAwMDAwMCBuIAowMDAwMDA1MDA4IDAwMDAwIG4gCjAwMDAwMDQ3NjAgMDAwMDAgbiAKMDAwMDAwNDY1MiAwMDAwMCBuIAowMDAwMDA0NTc3IDAwMDAwIG4gCjAwMDAwMDUwNzIgMDAwMDAgbiAKMDAwMDAwNTE1NCAwMDAwMCBuIAp0cmFpbGVyCjw8L0luZm8gMTMgMCBSL0lEIFs8ZTZiZDEzNGNhZGEwYTk1ZjZmNzY4NWM1NGMwNWNlZDI+PDJiODY0MWI2ZTMwMzMwYWNjNzUxN2ZkYmRkMjdjNDFjPl0vUm9vdCAxMiAwIFIvU2l6ZSAxND4+CnN0YXJ0eHJlZgo1MTc1CiUlRU9GCg==',
          },
        ],
      },
    ],
    notes: [
      {
        id: 30,
        version: 27,
        created: '2022-10-12T15:33:25.683273+02:00',
        updated: '2022-10-14T10:38:05.534146+02:00',
        extraParameters: {
          signed: 'true',
        },
        title: 'Ny anteckning',
        text: '<p>asdas</p><p>asd</p><p>asd</p><p>asd.</p>',
        createdBy: Cypress.env('mockAdUsername'),
        updatedBy: Cypress.env('mockAdUsername'),
      },
      {
        id: 31,
        version: 9,
        created: '2022-10-13T13:13:55.633508+02:00',
        updated: '2022-10-14T10:38:05.534789+02:00',
        extraParameters: {
          signed: 'true',
        },
        title: 'Testar igen',
        text: '<p>Vem skickade denna? Ändrad.</p>',
        createdBy: Cypress.env('mockAdUsername'),
        updatedBy: Cypress.env('mockAdUsername'),
      },
    ],
    messageIds: ['7e465e36-b099-4d7a-bcda-24d260f6eda8'],
    updatedByClient: 'WSO2_CaseManagementUI',
    createdBy: 'WSO2_CaseManagementUI',
    updatedBy: Cypress.env('mockAdUsername'),
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
  base: { data: { [key: string]: any }; message: string },
  obj: { [key: string]: any }
) => { data: { [key: string]: any }; message: string } = (base, obj) => ({
  data: {
    ...base.data,
    extraParameters: { ...base.data['extraParameters'], ...obj },
  },
  message: '',
});

const proposed = mockErrand_base.data.decisions.find((d) => d.decisionType === 'PROPOSED');
const final = mockErrand_base.data.decisions.find((d) => d.decisionType === 'FINAL');

export const mockPutProposedDecision: Decision = {
  id: proposed?.id,
  created: proposed?.created,
  updated: proposed?.updated,
  decisionType: 'PROPOSED',
  decisionOutcome: 'APPROVAL',
  description: proposed?.description || '',
  law: [
    {
      heading: proposed?.law[0].heading || '',
      sfs: 'Trafikförordningen (1998:1276)',
      chapter: '13',
      article: '8',
    },
  ],
  decidedAt: proposed?.decidedAt,
  // decidedBy: proposed.decidedBy,
  validFrom: '',
  validTo: '',
  attachments: [],
};

export const mockPutFinalDecision: Decision = {
  id: final?.id,
  created: final?.created,
  updated: final?.updated,
  decisionType: 'FINAL',
  decisionOutcome: 'APPROVAL',
  description: final?.description || '',
  law: [
    {
      heading: final?.law[0].heading || '',
      sfs: 'Trafikförordningen (1998:1276)',
      chapter: '13',
      article: '8',
    },
  ],
  decidedAt: final?.decidedAt,
  // decidedBy: final.decidedBy,
  validFrom: final?.validFrom || ' ',
  validTo: final?.validTo || '',
  attachments: [],
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
      lastName: 'Testarsson',
      addresses: [
        {
          addressCategory: 'POSTAL_ADDRESS',
          street: 'Testgatan 4',
          apartmentNumber: '',
          postalCode: '12345',
          city: 'SUNDSVALL',
        },
      ],
      contactInformation: [
        { contactType: 'PHONE', value: Cypress.env('mockPhoneNumber') },
        { contactType: 'EMAIL', value: Cypress.env('mockEmail') },
      ],
      personalNumber: Cypress.env('mockPersonNumber'),
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
  extraParameters: {
    'application.applicant.capacity': 'DRIVER',
    'application.reason': '',
    'application.role': 'SELF',
    'application.applicant.testimonial': 'true',
    'application.applicant.signingAbility': 'false',
    'disability.aid': 'Inget',
    'disability.walkingAbility': 'true',
    'disability.walkingDistance.beforeRest': '',
    'disability.walkingDistance.max': '',
    'disability.duration': 'P6M',
    'disability.canBeAloneWhileParking': 'true',
    'disability.canBeAloneWhileParking.note': '',
    'consent.contact.doctor': 'false',
    'consent.view.transportationServiceDetails': 'false',
  },
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
      lastName: 'Testargren',
      addresses: [
        {
          addressCategory: 'POSTAL_ADDRESS',
          street: 'Testvägen 234',
          apartmentNumber: '',
          postalCode: '12345',
          city: 'SUNDSVALL',
        },
      ],
      contactInformation: [
        { contactType: 'PHONE', value: Cypress.env('mockPhoneNumber') },
        { contactType: 'EMAIL', value: Cypress.env('mockEmail') },
      ],
      personalNumber: Cypress.env('mockPersonNumber'),
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
  extraParameters: {
    'application.applicant.capacity': 'DRIVER',
    'application.reason': 'Kan inte gå bra',
    'application.role': 'SELF',
    'application.applicant.testimonial': 'true',
    'application.applicant.signingAbility': 'true',
    'disability.aid': 'Krycka/kryckor/käpp,Rullator',
    'disability.walkingAbility': 'true',
    'disability.walkingDistance.beforeRest': '100',
    'disability.walkingDistance.max': '200',
    'disability.duration': 'P3Y',
    'disability.canBeAloneWhileParking': 'true',
    'disability.canBeAloneWhileParking.note': '',
    'consent.contact.doctor': 'true',
    'consent.view.transportationServiceDetails': 'true',
  },
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
      lastName: 'Testarsson',
      addresses: [
        {
          addressCategory: 'POSTAL_ADDRESS',
          street: 'Testgatan 54',
          apartmentNumber: '',
          postalCode: '12345',
          city: 'SUNDSVALL',
          careOf: 'Inneboende',
        },
      ],
      contactInformation: [
        { contactType: 'PHONE', value: Cypress.env('mockPhoneNumber') },
        { contactType: 'EMAIL', value: Cypress.env('mockEmail') },
      ],
      personalNumber: Cypress.env('mockPersonNumber'),
    },
    {
      type: 'PERSON',
      roles: ['ADMINISTRATOR'],
      contactInformation: [],
      firstName: 'Katarina',
      lastName: 'Testhandläggare',
    },
  ],
  extraParameters: {
    'application.applicant.capacity': 'PASSENGER',
    'application.reason': 'Har svårt att gå',
    'application.role': 'SELF',
    'application.applicant.testimonial': 'true',
    'application.applicant.signingAbility': 'false',
    'disability.aid': 'Elrullstol,Rullstol (manuell)',
    'disability.walkingAbility': 'true',
    'disability.walkingDistance.beforeRest': '100',
    'disability.walkingDistance.max': '150',
    'disability.duration': 'P0Y',
    'disability.canBeAloneWhileParking': 'false',
    'disability.canBeAloneWhileParking.note': '',
    'consent.contact.doctor': 'false',
    'consent.view.transportationServiceDetails': 'true',
  },
};

export const modifyPatchExtraParameter: (
  base: { [key: string]: any },
  obj: { [key: string]: any }
) => { [key: string]: any } = (base, obj) => ({
  ...base,
  extraParameters: { ...base.extraParameters, ...obj },
});
