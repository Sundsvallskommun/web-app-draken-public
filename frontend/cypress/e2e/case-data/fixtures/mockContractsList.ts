import {
  PageContract,
  ContractType,
  LeaseType,
  Status,
  StakeholderRole,
  StakeholderType,
  TimeUnit,
  IntervalType,
} from '@casedata/interfaces/contracts';

// Mock contract invoices response
export const mockContractInvoices = {
  content: [
    {
      id: 'INV-001',
      status: 'NEW',
      category: 'MEX_INVOICE',
      invoice: {
        date: '2024-01-15',
        dueDate: '2024-02-15',
        totalAmount: 25000,
      },
      extraParameters: {
        contractId: '2049-00010',
      },
      transferDate: '2024-01-15',
    },
    {
      id: 'INV-002',
      status: 'APPROVED',
      category: 'MEX_INVOICE',
      invoice: {
        date: '2024-04-15',
        dueDate: '2024-05-15',
        totalAmount: 25000,
      },
      extraParameters: {
        contractId: '2049-00010',
      },
      transferDate: '2024-04-15',
    },
    {
      id: 'INV-003',
      status: 'INVOICED',
      category: 'MEX_INVOICE',
      invoice: {
        date: '2024-07-15',
        dueDate: '2024-08-15',
        totalAmount: 25000,
      },
      extraParameters: {
        contractId: '2049-00010',
      },
      transferDate: '2024-07-15',
    },
    {
      id: 'INV-004',
      status: 'REJECTED',
      category: 'MEX_INVOICE',
      invoice: {
        date: '2024-10-15',
        dueDate: '2024-11-15',
        totalAmount: 12500,
      },
      extraParameters: {
        contractId: '2049-00010',
      },
      transferDate: '2024-10-15',
    },
  ],
  totalElements: 4,
  totalPages: 1,
  size: 10,
  number: 0,
};

export const mockContractInvoicesEmpty = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: 10,
  number: 0,
};

export const mockContractsList: PageContract = {
  content: [
    {
      contractId: '2049-00001',
      externalReferenceId: '101',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.LAND_LEASE_MISC,
      notice: {
        terms: [
          {
            party: 'LESSEE',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '6',
          },
          {
            party: 'LESSOR',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '12',
          },
        ],
      },
      startDate: '2024-01-01',
      endDate: '2025-12-31',
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
      leaseType: LeaseType.LAND_LEASE_MISC,
      startDate: '2023-06-01',
      endDate: '2024-05-31',
      notice: {
        terms: [
          {
            party: 'LESSEE',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '6',
          },
          {
            party: 'LESSOR',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '12',
          },
        ],
      },
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
      notice: {
        terms: [
          {
            party: 'LESSEE',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '6',
          },
          {
            party: 'LESSOR',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '12',
          },
        ],
      },
      startDate: '2024-03-15',
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
      notice: {
        terms: [
          {
            party: 'LESSEE',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '6',
          },
          {
            party: 'LESSOR',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '12',
          },
        ],
      },
      startDate: '2020-01-01',
      endDate: '2023-12-31',
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
      notice: {
        terms: [
          {
            party: 'LESSEE',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '6',
          },
          {
            party: 'LESSOR',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '12',
          },
        ],
      },
      startDate: '2024-01-01',
      endDate: '2029-12-31',
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
  number: 0,
  size: 12,
  totalElements: 5,
  totalPages: 1,
};

export const mockContractsListPage2: PageContract = {
  content: [
    {
      contractId: '2049-00006',
      externalReferenceId: '106',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.USUFRUCT_HUNTING,
      notice: {
        terms: [
          {
            party: 'LESSEE',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '6',
          },
          {
            party: 'LESSOR',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '12',
          },
        ],
      },
      startDate: '2024-02-01',
      endDate: '2025-01-31',
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
  number: 1,
  size: 12,
  totalElements: 6,
  totalPages: 2,
};

export const mockContractsListEmpty: PageContract = {
  content: [],
  number: 0,
  size: 12,
  totalElements: 0,
  totalPages: 0,
};

export const mockContractsListFiltered: PageContract = {
  content: [
    {
      contractId: '2049-00001',
      externalReferenceId: '101',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.LEASEHOLD,
      notice: {
        terms: [
          {
            party: 'LESSEE',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '6',
          },
          {
            party: 'LESSOR',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '12',
          },
        ],
      },
      startDate: '2024-01-01',
      endDate: '2025-12-31',
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
  number: 0,
  size: 12,
  totalElements: 1,
  totalPages: 1,
};

// Detailed mock contract with all fields for detail view testing
export const mockContractDetailLeaseAgreement: PageContract = {
  content: [
    {
      contractId: '2049-00010',
      externalReferenceId: 'EXT-12345',
      status: Status.ACTIVE,
      type: ContractType.LEASE_AGREEMENT,
      leaseType: LeaseType.LEASEHOLD,
      startDate: '2024-01-01',
      endDate: '2026-12-31',
      propertyDesignations: [
        { name: 'SUNDSVALL TESTMARK 1:100', district: 'Sundsvall Norra' },
        { name: 'SUNDSVALL TESTMARK 1:101', district: 'Sundsvall Norra' },
      ],
      stakeholders: [
        {
          type: StakeholderType.ORGANIZATION,
          roles: [StakeholderRole.LESSOR],
          organizationName: 'Sundsvalls Kommun',
          organizationNumber: '212000-2411',
          address: {
            streetAddress: 'Storgatan 1',
            postalCode: '85230',
            town: 'Sundsvall',
          },
        },
        {
          type: StakeholderType.PERSON,
          roles: [StakeholderRole.LESSEE],
          firstName: 'Anna',
          lastName: 'Arrendator',
          address: {
            streetAddress: 'Arrendevägen 10',
            careOf: '',
            postalCode: '85240',
            town: 'Sundsvall',
          },
        },
        {
          type: StakeholderType.PERSON,
          roles: [StakeholderRole.LESSEE],
          firstName: 'Bengt',
          lastName: 'Arrendator',
          address: {
            streetAddress: 'Arrendevägen 10',
            careOf: '',
            postalCode: '85240',
            town: 'Sundsvall',
          },
        },
      ],
      notice: {
        terms: [
          {
            party: 'LESSEE',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '6',
          },
          {
            party: 'LESSOR',
            unit: TimeUnit.MONTHS,
            periodOfNotice: '12',
          },
        ],
      },
      extension: {
        autoExtend: true,
        unit: TimeUnit.YEARS,
        leaseExtension: '5',
      },
      fees: {
        yearly: 25000,
        additionalInformation: ['Arrendeavgift för mark', 'Kompletterande info'],
      },
      invoicing: {
        invoiceInterval: IntervalType.YEARLY,
      },
      indexAdjusted: true,
      attachmentMetaData: [
        {
          id: 1,
          category: 'CONTRACT',
          filename: 'signerat-avtal.pdf',
          mimeType: 'application/pdf',
          note: 'Signerat arrendeavtal',
        },
      ],
    },
  ],
  number: 0,
  size: 12,
  totalElements: 1,
  totalPages: 1,
};

export const mockContractDetailPurchaseAgreement: PageContract = {
  content: [
    {
      contractId: '2049-00011',
      externalReferenceId: 'EXT-67890',
      status: Status.DRAFT,
      type: ContractType.PURCHASE_AGREEMENT,
      startDate: '2024-06-15',
      propertyDesignations: [{ name: 'SUNDSVALL KÖPMARK 2:200', district: 'Sundsvall Södra' }],
      stakeholders: [
        {
          type: StakeholderType.ORGANIZATION,
          roles: [StakeholderRole.SELLER],
          organizationName: 'Sundsvalls Kommun',
          organizationNumber: '212000-2411',
          address: {
            streetAddress: 'Storgatan 1',
            postalCode: '85230',
            town: 'Sundsvall',
          },
        },
        {
          type: StakeholderType.PERSON,
          roles: [StakeholderRole.BUYER],
          firstName: 'Kalle',
          lastName: 'Köpare',
          address: {
            streetAddress: 'Köpvägen 20',
            careOf: '',
            postalCode: '85250',
            town: 'Sundsvall',
          },
        },
      ],
    },
  ],
  number: 0,
  size: 12,
  totalElements: 1,
  totalPages: 1,
};
