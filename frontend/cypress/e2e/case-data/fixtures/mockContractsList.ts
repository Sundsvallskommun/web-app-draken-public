import { ContractPaginatedResponse, ContractType, LeaseType, Status, StakeholderType } from '@casedata/interfaces/contracts';

export const mockContractsList: ContractPaginatedResponse = {
  contracts: [
    {
      contractId: '2049-00001',
      externalReferenceId: '101',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.LEASEHOLD,
      start: '2024-01-01',
      end: '2025-12-31',
      propertyDesignations: [{ name: 'TESTKOMMUN TESTFASTIGHET 1:1', district: 'Testdistrikt Norra' }],
      stakeholders: [
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Test Kommun AB',
        },
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Testföretag AB',
        },
      ],
    },
    {
      contractId: '2049-00002',
      externalReferenceId: '102',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.USUFRUCT_MOORING,
      start: '2023-06-01',
      end: '2024-05-31',
      propertyDesignations: [{ name: 'TESTKOMMUN HAMNEN 2:3', district: 'Testdistrikt Södra' }],
      stakeholders: [
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Test Kommun AB',
        },
        {
          type: StakeholderType.PERSON,
          roles: [],
          firstName: 'Test',
          lastName: 'Testsson',
        },
      ],
    },
    {
      contractId: '2049-00003',
      externalReferenceId: '103',
      status: Status.DRAFT,
      type: ContractType.PURCHASE_AGREEMENT,
      start: '2024-03-15',
      propertyDesignations: [{ name: 'TESTKOMMUN ÅKERN 3:45', district: 'Testdistrikt Västra' }],
      stakeholders: [
        {
          type: StakeholderType.PERSON,
          roles: [],
          firstName: 'Köpare',
          lastName: 'Köparsson',
        },
        {
          type: StakeholderType.PERSON,
          roles: [],
          firstName: 'Säljare',
          lastName: 'Säljarsson',
        },
      ],
    },
    {
      contractId: '2049-00004',
      externalReferenceId: '104',
      status: Status.TERMINATED,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.LAND_LEASE_RESIDENTIAL,
      start: '2020-01-01',
      end: '2023-12-31',
      propertyDesignations: [
        { name: 'TESTKOMMUN SKOGEN 4:100', district: 'Testdistrikt Östra' },
        { name: 'TESTKOMMUN SKOGEN 4:101', district: 'Testdistrikt Östra' },
      ],
      stakeholders: [
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Test Kommun AB',
        },
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Testenergi AB',
        },
      ],
    },
    {
      contractId: '2049-00005',
      externalReferenceId: '105',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.SITE_LEASE_COMMERCIAL,
      start: '2024-01-01',
      end: '2029-12-31',
      propertyDesignations: [{ name: 'TESTKOMMUN CENTRUM 5:55', district: 'Testdistrikt Norra' }],
      stakeholders: [
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Test Kommun AB',
        },
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Testfastigheter AB',
        },
      ],
    },
  ],
  _meta: {
    page: 1,
    limit: 12,
    count: 5,
    totalRecords: 5,
    totalPages: 1,
  },
};

export const mockContractsListPage2: ContractPaginatedResponse = {
  contracts: [
    {
      contractId: '2049-00006',
      externalReferenceId: '106',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.USUFRUCT_HUNTING,
      start: '2024-02-01',
      end: '2025-01-31',
      propertyDesignations: [{ name: 'TESTKOMMUN JAKTMARK 6:99', district: 'Testdistrikt Västra' }],
      stakeholders: [
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Test Kommun AB',
        },
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Testjakt Förening',
        },
      ],
    },
  ],
  _meta: {
    page: 2,
    limit: 12,
    count: 1,
    totalRecords: 6,
    totalPages: 2,
  },
};

export const mockContractsListEmpty: ContractPaginatedResponse = {
  contracts: [],
  _meta: {
    page: 1,
    limit: 12,
    count: 0,
    totalRecords: 0,
    totalPages: 0,
  },
};

export const mockContractsListFiltered: ContractPaginatedResponse = {
  contracts: [
    {
      contractId: '2049-00001',
      externalReferenceId: '101',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.LEASEHOLD,
      start: '2024-01-01',
      end: '2025-12-31',
      propertyDesignations: [{ name: 'TESTKOMMUN TESTFASTIGHET 1:1', district: 'Testdistrikt Norra' }],
      stakeholders: [
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Test Kommun AB',
        },
        {
          type: StakeholderType.ORGANIZATION,
          roles: [],
          organizationName: 'Testföretag AB',
        },
      ],
    },
  ],
  _meta: {
    page: 1,
    limit: 12,
    count: 1,
    totalRecords: 1,
    totalPages: 1,
  },
};
