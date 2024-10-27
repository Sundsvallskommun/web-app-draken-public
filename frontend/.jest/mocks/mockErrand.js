import { ongoingErrandLabels } from '@services/errand-service'

export const applicantAdress = {
  street: 'NORRMALMSGATAN 4',
  postalCode: '851 85',
  city: 'SUNDSVALL',
}

export const applicantStakeholder = {
  id: 667,
  version: 81,
  created: '2022-10-11T12:13:29.226233+02:00',
  updated: '2022-10-14T10:38:05.529007+02:00',
  extraParameters: {},
  type: 'PERSON',
  firstName: 'Kim',
  lastName: 'Svensson',
  personId: 'd7af5f83-166a-468b-ab86-da8ca30ea97c',
  roles: ['APPLICANT'],
  addresses: [
    applicantAdress
  ],
  contactInformation: [
    {
      contactType: 'PHONE',
      value: '0701740635',
    },
    {
      contactType: 'EMAIL',
      value: 'test@example.com',
    },
  ],
  personalNumber: '199001012385',
};

export const fellowApplicantStakeholder = {
  id: 835,
  version: 4,
  created: '2022-10-14T09:17:53.402692+02:00',
  updated: '2022-10-14T10:38:05.531953+02:00',
  extraParameters: {},
  type: 'PERSON',
  firstName: 'Testadmin',
  lastName: 'Testsson',
  roles: ['CONTACT_PERSON'],
  addresses: [],
  contactInformation: [],
}

export const mockApiErrand = {
  data: {
    id: 103,
    version: 92,
    created: '2022-10-11T12:13:29.224392+02:00',
    updated: '2022-10-14T10:38:05.416038+02:00',
    extraParameters: {
      'disability.walkingAbility': 'true',
      'application.applicant.testimonial': 'true',
      'consent.view.transportationServiceDetails': 'false',
      'disability.aid': 'Elrullstol,Rullstol (manuell)',
      'disability.canBeAloneWhileParking': 'false',
      'application.role': 'SELF',
      'application.applicant.capacity': 'PASSENGER',
      'application.applicant.signingAbility': 'false',
      'disability.walkingDistance.max': '150',
      'disability.walkingDistance.beforeRest': '100',
      'consent.contact.doctor': 'false',
      'application.reason': '',
      'disability.canBeAloneWhileParking.note': '',
      'disability.duration': 'P6M',
    },
    caseType: 'PARKING_PERMIT',
    priority: 'MEDIUM',
    description: '',
    caseTitleAddition: 'Nytt parkeringstillstånd',
    diaryNumber: '',
    phase: 'Beslut',
    statuses: [
      {
        statusType: 'Ärende inkommit',
        description: 'Ärende inkommit',
        dateTime: '2022-10-14T09:17:52.067+02:00',
      },
    ],
    municipalityId: '2281',
    processId: '5a671ddf-494d-11ed-850f-0242ac110002',
    stakeholders: [
      {
        id: 823,
        version: 72,
        created: '2022-10-12T08:08:14.72102+02:00',
        updated: '2022-10-14T10:38:05.531044+02:00',
        extraParameters: {},
        type: 'PERSON',
        firstName: 'Testadmin',
        lastName: 'Testsson',
        roles: ['ADMINISTRATOR'],
        addresses: [],
        contactInformation: [],
      },
      applicantStakeholder,
      fellowApplicantStakeholder
    ],
    facilities: [],
    attachments: [
      {
        id: 163,
        version: 1,
        created: '2022-10-12T11:39:24.241497+02:00',
        updated: '2022-10-12T11:39:30.972489+02:00',
        extraParameters: {},
        category: 'PASSPORT_PHOTO',
        name: 'example.jpg',
        note: '',
        extension: 'jpg',
        mimeType: 'image/jpeg',
        file: '/9j/4AAQSkZJRgABAQAAAQABAAD'
      },
    ],
    decisions: [
      {
        id: 627,
        version: 11,
        created: '2022-10-13T12:58:56.30307+02:00',
        updated: '2022-10-14T10:38:05.532248+02:00',
        extraParameters: {},
        decisionType: 'PROPOSED',
        decisionOutcome: 'REJECTION',
        description: '<p>Utredningstext, föreslår avslag</p>',
        law: [
          {
            heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
            sfs: 'Trafikförordningen (1998:1276)',
            chapter: '13',
            article: '8',
          },
        ],
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
        description:
          '<p>Utredningstext, föreslår avslag men det blir bifall ändå.</p><p><br /></p><p>Hej nu har vi beslutat i ditt ärende</p>',
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
        attachments: [],
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
        createdBy: 'kar52and',
        updatedBy: 'kar52and',
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
        createdBy: 'kar52and',
        updatedBy: 'kar52and',
      },
    ],
    messageIds: [
      '7e465e36-b099-4d7a-bcda-24d260f6eda8',
      '193ecadc-70bf-425f-8dff-1cf365af7244',
      '46303dd2-b59d-42f3-b07a-492f000bc1d3',
      '28eae749-492a-4b96-8dfc-2c4e79ccf50f',
    ],
    updatedByClient: 'WSO2_CaseManagementUI',
    createdBy: 'WSO2_CaseManagementUI',
    updatedBy: 'kar52and',
  },
  message: 'success',
};

export const mockIErrand = {
  id: 103,
  version: 92,
  created: '2022-10-11 12:13',
  updated: '2022-10-14 10:38',
  extraParameters: {
    'disability.walkingAbility': 'true',
    'application.applicant.testimonial': 'true',
    'consent.view.transportationServiceDetails': 'false',
    'disability.aid': [ 'Elrullstol', 'Rullstol (manuell)' ],
    'disability.canBeAloneWhileParking': 'false',
    'application.role': 'SELF',
    'application.applicant.capacity': 'PASSENGER',
    'application.applicant.signingAbility': 'false',
    'disability.walkingDistance.max': '150',
    'disability.walkingDistance.beforeRest': '100',
    'consent.contact.doctor': 'false',
    'application.reason': '',
    'disability.canBeAloneWhileParking.note': '',
    'disability.duration': 'Mindre än 6 månader'
  },
  caseType: 'PARKING_PERMIT',
  priority: 'MEDIUM',
  description: '',
  caseTitleAddition: 'Nytt parkeringstillstånd',
  diaryNumber: '',
  phase: 'Beslut',
  statuses: [
    {
      statusType: 'Ärende inkommit',
      description: 'Ärende inkommit',
      dateTime: '2022-10-14T09:17:52.067+02:00'
    }
  ],
  municipalityId: '2281',
  processId: '5a671ddf-494d-11ed-850f-0242ac110002',
  stakeholders: [
   
    {
      id: 823,
      version: 72,
      created: '2022-10-12T08:08:14.72102+02:00',
      updated: '2022-10-14T10:38:05.531044+02:00',
      extraParameters: {},
      type: 'PERSON',
      firstName: 'Testadmin',
      lastName: 'Testsson',
      roles: ['ADMINISTRATOR'],
      addresses: [],
      contactInformation: [],
    },
    applicantStakeholder,
    fellowApplicantStakeholder
  ],
  facilities: [],
  attachments: [
    {
      id: 163,
      version: 1,
      created: '2022-10-12T11:39:24.241497+02:00',
      updated: '2022-10-12T11:39:30.972489+02:00',
      extraParameters: {},
      category: 'PASSPORT_PHOTO',
      name: 'example.jpg',
      note: '',
      extension: 'jpg',
      mimeType: 'image/jpeg',
      file: '/9j/4AAQSkZJRgABAQAAAQABAAD'
    },
  ],
  decisions: [
    {
      id: 627,
      version: 11,
      created: '2022-10-13T12:58:56.30307+02:00',
      updated: '2022-10-14T10:38:05.532248+02:00',
      extraParameters: {},
      decisionType: 'PROPOSED',
      decisionOutcome: 'REJECTION',
      description: '<p>Utredningstext, föreslår avslag</p>',
      law: [
        {
          heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
          sfs: 'Trafikförordningen (1998:1276)',
          chapter: '13',
          article: '8',
        },
      ],
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
      description:
        '<p>Utredningstext, föreslår avslag men det blir bifall ändå.</p><p><br /></p><p>Hej nu har vi beslutat i ditt ärende</p>',
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
      attachments: [],
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
      createdBy: 'kar52and',
      updatedBy: 'kar52and',
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
      createdBy: 'kar52and',
      updatedBy: 'kar52and',
    },
  ],
  messageIds: [
    '7e465e36-b099-4d7a-bcda-24d260f6eda8',
    '193ecadc-70bf-425f-8dff-1cf365af7244',
    '46303dd2-b59d-42f3-b07a-492f000bc1d3',
    '28eae749-492a-4b96-8dfc-2c4e79ccf50f',
  ],
  updatedByClient: 'WSO2_CaseManagementUI',
  createdBy: 'WSO2_CaseManagementUI',
  updatedBy: 'kar52and',
  label: 'Nytt parkeringstillstånd',
  owner: 'Kim Svensson',
  administrator: {
    id: 823,
    version: 72,
    created: '2022-10-12T08:08:14.72102+02:00',
    updated: '2022-10-14T10:38:05.531044+02:00',
    extraParameters: {},
    type: 'PERSON',
    firstName: 'Testadmin',
    lastName: 'Testsson',
    roles: ['ADMINISTRATOR'],
    addresses: [],
    contactInformation: [],
  },
  category: 'Nytt parkeringstillstånd',
  status: 'Ärende inkommit'
}

export const mockApiErrands = {
  "data": {
    "content": [
      mockApiErrand.data
    ],
    "pageable": {
      "sort": {
        "empty": true,
        "sorted": false,
        "unsorted": true
      },
      "offset": 0,
      "pageNumber": 0,
      "pageSize": 20,
      "paged": true,
      "unpaged": false
    },
    "totalPages": 1,
    "totalElements": 1,
    "last": true,
    "size": 20,
    "number": 0,
    "sort": {
      "empty": true,
      "sorted": false,
      "unsorted": true
    },
    "first": true,
    "numberOfElements": 1,
    "empty": false
  },
  "message": "success"
}

export const mockIErrands = {
  errands: [mockIErrand],
  page: mockApiErrands.data.pageable.pageNumber,
  size: mockApiErrands.data.pageable.pageSize,
  totalPages: mockApiErrands.data.totalPages,
  totalElements: mockApiErrands.data.totalElements,
  labels: ongoingErrandLabels,
}
