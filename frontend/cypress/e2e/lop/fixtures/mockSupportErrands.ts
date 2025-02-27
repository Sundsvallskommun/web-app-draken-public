export const modifyField: (
  base: { [key: string]: any },
  obj: { [key: string]: any }
) => { data: { [key: string]: any }; message: string } = (base, obj) => ({
  ...base.data,
  ...obj,
});

export const mockEmptySupportErrand = {
  id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
  // title: 'Empty errand',
  priority: 'MEDIUM',
  customer: { id: 'abcdefg', type: 'EMPLOYEE' },
  externalTags: [{ key: 'caseId', value: '20230222-186' }],
  classification: {
    category: 'NONE',
    type: 'NONE',
  },
  labels: [],
  statusTag: 'ONGOING',
  resolution: 'INFORMED',
  reporterUserId: 'kctest',
  assignedUserId: 'kctest',
  created: '2023-02-22T13:06:02.567+01:00',
  touched: '2023-02-22T13:06:02.567+01:00',
};

export const mockSupportErrand = {
  id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
  errandNumber: 'LOP-24120103',
  title: 'Empty errand',
  priority: 'MEDIUM',
  stakeholders: [
    {
      externalId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      externalIdType: 'PRIVATE',
      role: 'PRIMARY',
      firstName: 'Kim',
      lastName: 'Svensson',
      address: 'NORRMALMSGATAN 4',
      zipCode: '851 85',
      country: 'SWEDEN',
      contactChannels: [
        { type: 'Email', value: 'a@example.com' },
        { type: 'Phone', value: '070000000' },
      ],
    },
    {
      externalId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      externalIdType: 'PRIVATE',
      role: 'CONTACT',
      firstName: 'Mormor',
      lastName: 'Svensson',
      address: 'NORRMALMSGATAN 5',
      zipCode: '851 85',
      country: 'SWEDEN',
      contactChannels: [{ type: 'Email', value: 'b@example.com' }],
    },
    {
      externalId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      externalIdType: 'PRIVATE',
      role: 'CONTACT',
      firstName: 'Kompis',
      lastName: 'Svensson',
      address: 'NORRMALMSGATAN 6',
      zipCode: '851 85',
      country: 'SWEDEN',
      contactChannels: [
        { type: 'Email', value: 'c@example.com' },
        { type: 'Phone', value: '070111111' },
      ],
    },
  ],
  description: 'En ärendebeskrivning',
  externalTags: [
    { key: 'caseId', value: '20230303-77' },
    { key: 'channel', value: 'IN_PERSON' },
  ],
  classification: {
    category: 'ADMINISTRATION',
    type: 'ADMINISTRATION.PERMISSION',
  },
  labels: ['ADMINISTRATION', 'ADMINISTRATION.PERMISSION'],
  status: 'ONGOING',
  reporterUserId: 'kctest',
  assignedUserId: 'kctest',
  created: '2023-03-03T16:24:43.777+01:00',
  modified: '2023-03-17T08:44:59.27+01:00',
  touched: '2023-03-17T08:44:59.27+01:00',
};

export const mockDifferentUserSupportErrand = {
  id: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
  title: 'Empty errand',
  priority: 'MEDIUM',
  stakeholders: [
    {
      externalId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      externalIdType: 'PRIVATE',
      role: 'PRIMARY',
      firstName: 'Kim',
      lastName: 'Svensson',
      address: 'NORRMALMSGATAN 4',
      zipCode: '851 85',
      country: 'SWEDEN',
      contactChannels: [
        { type: 'Email', value: 'a@example.com' },
        { type: 'Phone', value: '070000000' },
      ],
    },
    {
      externalId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      externalIdType: 'PRIVATE',
      role: 'CONTACT',
      firstName: 'Mormor',
      lastName: 'Svensson',
      address: 'NORRMALMSGATAN 5',
      zipCode: '851 85',
      country: 'SWEDEN',
      contactChannels: [{ type: 'Email', value: 'b@example.com' }],
    },
    {
      externalId: 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc',
      externalIdType: 'PRIVATE',
      role: 'CONTACT',
      firstName: 'Kompis',
      lastName: 'Svensson',
      address: 'NORRMALMSGATAN 6',
      zipCode: '851 85',
      country: 'SWEDEN',
      contactChannels: [
        { type: 'Email', value: 'c@example.com' },
        { type: 'Phone', value: '070111111' },
      ],
    },
  ],
  description: 'En ärendebeskrivning',
  externalTags: [
    { key: 'caseId', value: '20230303-77' },
    { key: 'channel', value: 'IN_PERSON' },
  ],
  classification: {
    category: 'IAF',
    type: 'ADULT_EDUCATION',
  },
  labels: [],
  status: 'ONGOING',
  reporterUserId: 'kctest3',
  assignedUserId: 'kctest3',
  created: '2023-03-03T16:24:43.777+01:00',
  modified: '2023-03-17T08:44:59.27+01:00',
  touched: '2023-03-17T08:44:59.27+01:00',
};

export const mockSupportAttachments = [
  {
    id: '89f48922-0cec-49c0-8b47-0bc25bc41b5b',
    fileName: 'image.24982.2505690.jpg',
    mimeType: 'image/jpeg',
  },
  {
    id: 'dd0836b0-b095-4d8d-86d2-b882c95c966e',
    fileName: 'otherInformationFile PDF_liten_10k.pdf',
    mimeType: 'application/pdf',
  },
  {
    id: '3945712f-075c-4731-8903-58cbbf2f8396',
    fileName: 'tree-838667__480.jpg',
    mimeType: 'image/jpeg',
  },
];

export const mockSupportMessages = [
  {
    communicationID: 'f1b1b3b4-0b1b-4b3b-8b1b-1b3b4b5b6b7b',
    errandNumber: 'KC-21120141',
    direction: 'OUTBOUND',
    messageBody: 'Mock body',
    sent: '2024-05-08T14:44:18.378412+02:00',
    subject: 'Meddelande från Sundsvalls kommun',
    communicationType: 'EMAIL',
    target: 'mock@example.com',
    viewed: false,
    emailHeaders: {},
    communicationAttachments: [],
  },
];

export const mockSupportNotes = [];

export const mockSupportErrands = {
  content: [
    {
      id: '2c9e9f0d-9447-4cf5-bec0-05bcf5edfc75',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'HIGH',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'CHAT' }],
      classification: { category: 'KSK_SERVICE_CENTER_IT', type: 'IT' },
      labels: [],
      status: 'NEW',
      suspension: {},
      reporterUserId: 'kctest',
      created: '2023-02-22T13:06:02.567+01:00',
      touched: '2023-02-22T13:06:02.567+01:00',
    },
    {
      id: 'fe20c0ec-aa50-4358-b0d5-dd238d093421',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'PHONE' }],
      classification: { category: 'BOU', type: 'CHILDCARE_PROCESSING_AND_INVOICES' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      suspension: {},
      reporterUserId: 'kctest',
      created: '2023-02-28T13:04:20.427+01:00',
      touched: '2023-02-28T13:04:20.427+01:00',
    },
    {
      id: '7251c861-a21a-49be-91c6-c2271f8efb5b',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'EMAIL' }],
      classification: { category: 'IAF', type: 'ADDICTION_AND_MENTAL_ILLNESS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      suspension: {},
      reporterUserId: 'kctest2',
      created: '2023-02-28T13:02:34.976+01:00',
      touched: '2023-02-28T13:02:34.976+01:00',
    },
    {
      id: '0636ddf1-46fe-40bb-a718-8a170e628c24',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [
        { key: 'caseId', value: '20240515-8152' },
        { key: 'channel', value: 'CHAT' },
      ],
      classification: { category: 'BOU', type: 'COMPLAINTS_AND_COMMENTS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      suspension: {},
      reporterUserId: 'kctest2',
      created: '2023-03-22T13:00:43.836+01:00',
      touched: '2023-03-22T13:00:43.836+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 4,
  totalElements: 34,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockOngoingSupportErrands = {
  content: [
    {
      id: '4c9e9f0d-9447-4cf5-bec0-05bcf5edfc75',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'HIGH',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'CHAT' }],
      classification: { category: 'KSK_SERVICE_CENTER_IT', type: 'IT' },
      labels: [],
      status: 'ONGOING',
      suspension: {},
      reporterUserId: 'kctest',
      created: '2023-02-22T13:06:02.567+01:00',
      touched: '2023-02-22T13:06:02.567+01:00',
    },
    {
      id: 'pe20c0ec-aa50-4358-b0d5-dd238d093421',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'PHONE' }],
      classification: { category: 'BOU', type: 'CHILDCARE_PROCESSING_AND_INVOICES' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'ONGOING',
      suspension: {},
      reporterUserId: 'kctest',
      created: '2023-02-28T13:04:20.427+01:00',
      touched: '2023-02-28T13:04:20.427+01:00',
    },
    {
      id: '0036ddf1-46fe-40bb-a718-8a170e628c24',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [
        { key: 'caseId', value: '20240515-8152' },
        { key: 'channel', value: 'CHAT' },
      ],
      classification: { category: 'BOU', type: 'COMPLAINTS_AND_COMMENTS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'ONGOING',
      suspension: {},
      reporterUserId: 'kctest2',
      created: '2023-03-22T13:00:43.836+01:00',
      touched: '2023-03-22T13:00:43.836+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 4,
  totalElements: 34,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockSuspendedSupportErrands = {
  content: [
    {
      id: '5d9e9f0d-9447-4cf5-bec0-05bcf5edfc75',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'HIGH',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'CHAT' }],
      classification: { category: 'KSK_SERVICE_CENTER_IT', type: 'IT' },
      labels: [],
      suspension: {
        suspendedTo: '2024-07-27T08:00:00+02:00',
        suspendedFrom: '2024-06-27T13:18:45.424+02:00',
      },
      suspended: true,
      reporterUserId: 'kctest',
      created: '2023-02-22T13:06:02.567+01:00',
      touched: '2023-02-22T13:06:02.567+01:00',
    },
    {
      id: 'pe33c0ec-aa50-4358-b0d5-dd238d093421',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'PHONE' }],
      classification: { category: 'BOU', type: 'CHILDCARE_PROCESSING_AND_INVOICES' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'SUSPENDED',
      suspension: {
        suspendedTo: '2024-07-27T08:00:00+02:00',
        suspendedFrom: '2024-06-27T13:18:45.424+02:00',
      },
      reporterUserId: 'kctest',
      created: '2023-02-28T13:04:20.427+01:00',
      touched: '2023-02-28T13:04:20.427+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 4,
  totalElements: 34,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockSupportErrandsEmpty = {
  content: [],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 1,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 2,
  totalElements: 4,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 0,
  empty: false,
};

export const mockSolvedSupportErrands = {
  content: [
    {
      id: '4b4e9f0d-9447-4cf5-bec0-05bcf5edfc75',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'HIGH',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'CHAT' }],
      classification: { category: 'KSK_SERVICE_CENTER_IT', type: 'IT' },
      labels: [],
      status: 'SOLVED',
      suspension: {},
      reporterUserId: 'kctest',
      created: '2023-02-22T13:06:02.567+01:00',
      touched: '2023-02-22T13:06:02.567+01:00',
    },
    {
      id: 'pe40b0ec-aa50-4358-b0d5-dd238d093421',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'PHONE' }],
      classification: { category: 'BOU', type: 'CHILDCARE_PROCESSING_AND_INVOICES' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'SOLVED',
      suspension: {},
      reporterUserId: 'kctest',
      created: '2023-02-28T13:04:20.427+01:00',
      touched: '2023-02-28T13:04:20.427+01:00',
    },
    {
      id: '0166ddf1-46fe-40bb-a718-8a170e628c24',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [
        { key: 'caseId', value: '20240515-8152' },
        { key: 'channel', value: 'CHAT' },
      ],
      classification: { category: 'BOU', type: 'COMPLAINTS_AND_COMMENTS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'SOLVED',
      suspension: {},
      reporterUserId: 'kctest2',
      created: '2023-03-22T13:00:43.836+01:00',
      touched: '2023-03-22T13:00:43.836+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 4,
  totalElements: 34,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockFilteredCategoryErrands = {
  content: [
    {
      id: 'fe20c0ec-aa50-4358-b0d5-dd238d093421',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'PHONE' }],
      classification: { category: 'BOU', type: 'CHILDCARE_PROCESSING_AND_INVOICES' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      reporterUserId: 'kctest',
      created: '2023-02-28T13:04:20.427+01:00',
      touched: '2023-02-28T13:04:20.427+01:00',
    },

    {
      id: '0636ddf1-46fe-40bb-a718-8a170e628c24',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [
        { key: 'caseId', value: '20240515-8152' },
        { key: 'channel', value: 'CHAT' },
      ],
      classification: { category: 'BOU', type: 'COMPLAINTS_AND_COMMENTS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      reporterUserId: 'kctest2',
      created: '2023-02-28T13:00:43.836+01:00',
      touched: '2023-02-28T13:00:43.836+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 2,
  totalElements: 14,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockFilteredPrioErrands = {
  content: [
    {
      id: '2c9e9f0d-9447-4cf5-bec0-05bcf5edfc75',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'HIGH',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'CHAT' }],
      classification: { category: 'KSK_SERVICE_CENTER_IT', type: 'IT' },
      labels: [],
      status: 'NEW',
      reporterUserId: 'kctest',
      created: '2023-02-22T13:06:02.567+01:00',
      touched: '2023-02-22T13:06:02.567+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 1,
  totalElements: 1,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockFilterDateErrands = {
  content: [
    {
      id: '2c9e9f0d-9447-4cf5-bec0-05bcf5edfc75',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'HIGH',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'CHAT' }],
      classification: { category: 'KSK_SERVICE_CENTER_IT', type: 'IT' },
      labels: [],
      status: 'NEW',
      reporterUserId: 'kctest',
      created: '2023-02-22T13:06:02.567+01:00',
      touched: '2023-02-22T13:06:02.567+01:00',
    },
    {
      id: 'fe20c0ec-aa50-4358-b0d5-dd238d093421',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'PHONE' }],
      classification: { category: 'BOU', type: 'CHILDCARE_PROCESSING_AND_INVOICES' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      reporterUserId: 'kctest',
      created: '2023-02-28T13:04:20.427+01:00',
      touched: '2023-02-28T13:04:20.427+01:00',
    },
    {
      id: '7251c861-a21a-49be-91c6-c2271f8efb5b',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'EMAIL' }],
      classification: { category: 'IAF', type: 'ADDICTION_AND_MENTAL_ILLNESS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      reporterUserId: 'kctest2',
      created: '2023-02-28T13:02:34.976+01:00',
      touched: '2023-02-28T13:02:34.976+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 1,
  totalElements: 3,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockFilterAdminErrands = {
  content: [
    {
      id: '7251c861-a21a-49be-91c6-c2271f8efb5b',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'EMAIL' }],
      classification: { category: 'IAF', type: 'ADDICTION_AND_MENTAL_ILLNESS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      reporterUserId: 'kctest2',
      created: '2023-02-28T13:02:34.976+01:00',
      touched: '2023-02-28T13:02:34.976+01:00',
    },
    {
      id: '0636ddf1-46fe-40bb-a718-8a170e628c24',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [
        { key: 'caseId', value: '20240515-8152' },
        { key: 'channel', value: 'CHAT' },
      ],
      classification: { category: 'BOU', type: 'COMPLAINTS_AND_COMMENTS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      reporterUserId: 'kctest2',
      created: '2023-02-28T13:00:43.836+01:00',
      touched: '2023-02-28T13:00:43.836+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 1,
  totalElements: 2,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockFilterChannelErrands = {
  content: [
    {
      id: '2c9e9f0d-9447-4cf5-bec0-05bcf5edfc75',
      assignedUserId: 'kctest',
      title: 'Empty errand',
      priority: 'HIGH',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [{ key: 'channel', value: 'CHAT' }],
      classification: { category: 'KSK_SERVICE_CENTER_IT', type: 'IT' },
      labels: [],
      status: 'NEW',
      reporterUserId: 'kctest',
      created: '2023-02-22T13:06:02.567+01:00',
      touched: '2023-02-22T13:06:02.567+01:00',
    },
    {
      id: '0636ddf1-46fe-40bb-a718-8a170e628c24',
      assignedUserId: 'kctest2',
      title: 'Empty errand',
      priority: 'MEDIUM',
      customer: { id: 'abcdefg', type: 'EMPLOYEE' },
      externalTags: [
        { key: 'caseId', value: '20240515-8152' },
        { key: 'channel', value: 'CHAT' },
      ],
      classification: { category: 'BOU', type: 'COMPLAINTS_AND_COMMENTS' },
      labels: [],
      type: 'OPEN-HOURS',
      status: 'NEW',
      reporterUserId: 'kctest2',
      created: '2023-03-22T13:00:43.836+01:00',
      touched: '2023-03-22T13:00:43.836+01:00',
    },
  ],
  pageable: {
    sort: { empty: false, unsorted: false, sorted: true },
    offset: 0,
    pageNumber: 0,
    pageSize: 10,
    paged: true,
    unpaged: false,
  },
  last: false,
  totalPages: 1,
  totalElements: 2,
  size: 10,
  number: 0,
  sort: { empty: false, unsorted: false, sorted: true },
  first: true,
  numberOfElements: 10,
  empty: false,
};

export const mockSupportErrandCommunication = [
  {
    communicationID: '12',
    errandNumber: 'PRH-2022-000001',
    direction: 'OUTBOUND',
    messageBody: 'Hello world',
    sent: '2024-05-20T10:44:25.582Z',
    subject: 'Hello world',
    communicationType: 'EMAIL',
    target: '+46701740635',
    viewed: false,
    emailHeaders: {
      IN_REPLY_TO: [],
      REFERENCES: ['123456789hijkl'],
      MESSAGE_ID: ['123456789hijkl'],
    },
    communicationAttachments: [
      {
        attachmentID: 'aGVsbG8gd29ybGQK',
        name: 'test.txt',
        contentType: 'text/plain',
      },
    ],
  },
  {
    communicationID: '13',
    errandNumber: 'PRH-2022-000001',
    direction: 'OUTBOUND',
    messageBody: 'Hello world 2',
    sent: '2024-05-20T10:44:25.582Z',
    subject: 'Hello world 2',
    communicationType: 'EMAIL',
    target: '+46701740635',
    viewed: false,
    emailHeaders: {
      IN_REPLY_TO: ['123456789hijkl'],
      REFERENCES: ['123456789acbde', '123456789hijkl'],
      MESSAGE_ID: ['123456789acbde'],
    },
    communicationAttachments: [
      {
        attachmentID: 'aGVsbG8gd29ybGQK',
        name: 'test.txt',
        contentType: 'text/plain',
      },
    ],
  },
];

export const mockMissingRootMessage = [
  {
    communicationID: '13',
    errandNumber: 'PRH-2022-000001',
    direction: 'OUTBOUND',
    messageBody: 'Hello world 2',
    sent: '2024-05-20T10:44:25.582Z',
    subject: 'Hello world 2',
    communicationType: 'EMAIL',
    target: '+46701740635',
    viewed: false,
    emailHeaders: {
      IN_REPLY_TO: ['123456789hijkl'],
      REFERENCES: ['123456789acbde', '123456789hijkl'],
      MESSAGE_ID: ['123456789acbde'],
    },
    communicationAttachments: [
      {
        attachmentID: 'aGVsbG8gd29ybGQK',
        name: 'test.txt',
        contentType: 'text/plain',
      },
    ],
  },
];

export const mockFacilitiesData = {
  data: [
    {
      designation: 'SUNDSVALL BALDER 1',
      objectidentifier: '909a6a80-6ded-90ec-e040-ed8f66444c3f',
    },
    {
      designation: 'SUNDSVALL BALDER GA:1',
    },
    {
      designation: 'SUNDSVALL BALDER S:1',
      objectidentifier: '909a6a82-a001-90ec-e040-ed8f66444c3f',
    },
  ],
  message: 'success',
};

export const mockSaveFacilities = {
  id: 'c3132d0d-c733-4779-b5a5-a0e7358ef36d',
  name: 'propertyDesignation',
  value: 'SUNDSVALL BALDER 1',
};
