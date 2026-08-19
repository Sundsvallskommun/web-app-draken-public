import { ContractData, StakeholderWithPersonnumber } from '@casedata/interfaces/contract-data';
import {
  Address,
  AddressType,
  Attachment,
  AttachmentCategory,
  Contract,
  ContractType,
  Fees,
  IntervalType,
  InvoicedIn,
  LeaseType,
  PageContract,
  Party,
  StakeholderRole as ContractStakeholderRole,
  StakeholderType as ContractStakeholderType,
  Status,
  TimeUnit,
} from '@casedata/interfaces/contracts';
import { IErrand } from '@casedata/interfaces/errand';
import { Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact, StakeholderType } from '@casedata/interfaces/stakeholder';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { EstateInfoSearch } from '@common/interfaces/estate-details';
import { ApiResponse, apiService } from '@common/services/api-service';
import { base64ToFile } from '@common/services/attachment-service';
import { getSingleFacilityByDesignation } from '@common/services/facilities-service';
import { toBase64 } from '@common/utils/toBase64';
import { UploadFile } from '@sk-web-gui/react';
import { AxiosResponse } from 'axios';
import { CBillingRecord, CBillingRecordStatusEnum } from 'src/data-contracts/backend/data-contracts';

import { saveExtraParameters } from './casedata-extra-parameters-service';

export const contractTypes = [
  { label: 'Arrende', key: ContractType.LEASE_AGREEMENT },
  { label: 'Köpeavtal', key: ContractType.PURCHASE_AGREEMENT },
  { label: 'Upplåtelse av allmän plats', key: ContractType.LAND_LEASE_PUBLIC },
  { label: 'Korttidsarrende', key: ContractType.SHORT_TERM_LEASE_AGREEMENT },
  { label: 'Tomträtt', key: ContractType.LEASEHOLD },
  { label: 'Hyresobjekt', key: ContractType.OBJECT_LEASE },
  { label: 'Skötselavtal', key: ContractType.MAINTENANCE_AGREEMENT },
];

export const leaseTypes = [
  { label: 'Anläggningsarrende', key: LeaseType.SITE_LEASE_COMMERCIAL },
  { label: 'Bostadsarrende', key: LeaseType.LAND_LEASE_RESIDENTIAL },
  { label: 'Jaktarrende', key: LeaseType.USUFRUCT_HUNTING },
  { label: 'Jordbruksarrende', key: LeaseType.USUFRUCT_FARMING },
  { label: 'Lägenhetsarrende', key: LeaseType.LAND_LEASE_MISC },
  { label: 'Nyttjanderättsavtal', key: LeaseType.USUFRUCT_MISC },
  { label: 'Markupplåtelseavtal', key: LeaseType.LAND_LEASE_LICENSE },
  { label: 'Av kommunen arrenderad mark', key: LeaseType.LAND_LEASE_MUNICIPALITY },
  { label: 'Arrende', key: LeaseType.OTHER_FEE }, // Ska inte kunna finnas för nya avtal
];

const feeDescriptionByLeaseType: Partial<Record<LeaseType, string>> = {
  [LeaseType.SITE_LEASE_COMMERCIAL]: 'Avgift, anläggningsarrende',
  [LeaseType.LAND_LEASE_RESIDENTIAL]: 'Avgift, bostadsarrende',
  [LeaseType.LAND_LEASE_MISC]: 'Avgift, lägenhetsarrende',
  [LeaseType.USUFRUCT_HUNTING]: 'Avgift, jaktarrende',
  [LeaseType.USUFRUCT_FARMING]: 'Avgift, jordbruksarrende',
  [LeaseType.USUFRUCT_MISC]: 'Avgift, nyttjanderätt',
  [LeaseType.LAND_LEASE_LICENSE]: 'Avgift, markupplåtelse',
  [LeaseType.OTHER_FEE]: 'Övrig avgift',
};

const feeDescriptionByContractType: Partial<Record<ContractType, string>> = {
  [ContractType.LAND_LEASE_PUBLIC]: 'Avgift, allmän platsupplåtelse',
  [ContractType.OBJECT_LEASE]: 'Avgift, hyra',
  [ContractType.LEASEHOLD]: 'Avgift, tomträttsavgäld',
};

const getFeeDescription = (type: ContractType, leaseType?: LeaseType): string => {
  if (type === ContractType.LEASE_AGREEMENT && leaseType) {
    return feeDescriptionByLeaseType[leaseType] ?? 'Övrig avgift';
  }
  return feeDescriptionByContractType[type] ?? 'Övrig avgift';
};

export const isLeaseAgreement = (contractType: ContractType) =>
  [
    ContractType.LEASE_AGREEMENT,
    ContractType.LAND_LEASE_PUBLIC,
    ContractType.SHORT_TERM_LEASE_AGREEMENT,
    ContractType.LEASEHOLD,
    ContractType.OBJECT_LEASE,
  ].includes(contractType);

export const hasRecurringFee = (contractType: ContractType, leaseType?: LeaseType) =>
  [
    ContractType.LAND_LEASE_PUBLIC,
    ContractType.OBJECT_LEASE,
    ContractType.LEASEHOLD,
    ContractType.LEASE_AGREEMENT,
  ].includes(contractType) ||
  (contractType === ContractType.LEASE_AGREEMENT &&
    !!leaseType &&
    [
      LeaseType.SITE_LEASE_COMMERCIAL,
      LeaseType.LAND_LEASE_RESIDENTIAL,
      LeaseType.LAND_LEASE_MISC,
      LeaseType.USUFRUCT_HUNTING,
      LeaseType.USUFRUCT_FARMING,
      LeaseType.USUFRUCT_MISC,
      LeaseType.LAND_LEASE_LICENSE,
      LeaseType.OTHER_FEE,
    ].includes(leaseType));

export const defaultKopeavtal: ContractData = {
  status: Status.DRAFT,
  type: ContractType.PURCHASE_AGREEMENT,
  contractId: '',
  propertyDesignations: [],
  stakeholders: [],
  generateInvoice: 'false',
  indexAdjusted: 'true',
};

export const defaultLagenhetsarrende: ContractData = {
  attachmentMetaData: [],
  contractId: '',
  externalReferenceId: '',
  type: ContractType.LEASE_AGREEMENT,
  leaseType: LeaseType.LAND_LEASE_MISC,
  status: Status.DRAFT,
  propertyDesignations: [],
  stakeholders: [],
  invoicing: { invoicedIn: InvoicedIn.ADVANCE, invoiceInterval: IntervalType.YEARLY },
  notice: {
    terms: [
      {
        party: Party.ALL,
        periodOfNotice: 3,
        unit: TimeUnit.MONTHS,
      },
    ],
  },
  extension: {
    autoExtend: false,
    unit: TimeUnit.DAYS,
  },
  extraParameters: [
    {
      name: 'errandId',
      parameters: {
        errandId: '',
      },
    },
    {
      name: 'InvoiceInfo',
      parameters: {
        markup: '',
      },
    },
  ],
  generateInvoice: 'true',
  indexAdjusted: 'true',
};

export const saveContract: (contract: ContractData) => Promise<Contract> = (contract) => {
  console.log('Saving contract', contract);
  try {
    let apiCall: Promise<AxiosResponse<ApiResponse<Contract>>>;
    const apiContract: Contract =
      contract.type === ContractType.PURCHASE_AGREEMENT
        ? kopeavtalToContract(contract)
        : lagenhetsArrendeToContract(contract);

    if (contract.contractId) {
      const url = `contracts/${contract.contractId}`;
      apiCall = apiService.put<ApiResponse<Contract>, Contract>(url, apiContract);
    } else {
      const url = `contracts`;
      apiCall = apiService.post<ApiResponse<Contract>, Contract>(url, apiContract);
    }
    return apiCall
      .then((res) => {
        return res.data.data;
      })
      .catch((e) => {
        console.error('Something went wrong when adding/editing contract: ', contract);
        throw e;
      });
  } catch (error) {
    return Promise.reject('Saving contracts is currently disabled');
  }
};

const fetchContract: (contractId: string) => Promise<ApiResponse<Contract>> = (contractId) => {
  if (!contractId) {
    console.error('No contract id found, cannot fetch. Returning.');
  }
  const url = `contracts/${contractId}`;
  return apiService
    .get<ApiResponse<Contract>>(url)
    .then((res) => res.data)
    .catch((e) => {
      throw e;
    });
};

export interface ContractFilterParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  query?: string;
  status?: string;
  contractType?: string;
  leaseType?: string;
  startDate?: string;
  endDate?: string;
}

export const fetchContracts: (params?: ContractFilterParams) => Promise<PageContract> = (params = {}) => {
  const { page = 0, size = 12, sortBy, sortOrder, query, status, contractType, leaseType, startDate, endDate } = params;

  let url = `contracts?page=${page}&size=${size}`;

  if (sortBy) {
    url += `&sortBy=${sortBy}&sortOrder=${sortOrder || 'desc'}`;
  }
  if (query) {
    url += `&query=${encodeURIComponent(query)}`;
  }
  if (status) {
    url += `&status=${status}`;
  }
  if (contractType) {
    url += `&contractType=${contractType}`;
  }
  if (leaseType) {
    url += `&leaseType=${leaseType}`;
  }
  if (startDate) {
    url += `&startDate=${startDate}`;
  }
  if (endDate) {
    url += `&endDate=${endDate}`;
  }

  return apiService
    .get<PageContract>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching contracts');
      throw e;
    });
};

export const saveContractToErrand = (municipalityId: string, contractId: string, errand: IErrand) => {
  const data: ExtraParameter[] = [
    {
      key: 'contractId',
      values: [contractId],
    },
  ];
  return saveExtraParameters(municipalityId, data, errand);
};

export const getErrandContract: (errand: IErrand) => Promise<ContractData> = (errand) => {
  if (!errand) {
    return Promise.reject('No errand found, cannot fetch contract. Returning.');
  }
  const contractId = errand.extraParameters?.find((p) => p.key === 'contractId')?.values?.[0];
  if (!contractId) {
    return Promise.reject('No contract id found on errand, cannot fetch contract. Returning.');
  }
  return fetchContract(contractId)
    .then((res) => {
      if (res.data.type === ContractType.PURCHASE_AGREEMENT) {
        return contractToKopeavtal(res.data as Contract);
      } else if (isLeaseAgreement(res.data.type)) {
        return contractToLagenhetsArrende(res.data as Contract);
      } else {
        console.error('Unknown contract type: ', res.data.type);
        throw new Error('Unknown contract type');
      }
    })
    .catch((e) => {
      throw e;
    });
};

export const prettyContractRoles: { [key: string]: string } = {
  BUYER: 'Köpare',
  SELLER: 'Säljare',
  GRANTOR: 'Upplåtare',
  LEASEHOLDER: 'Arrendator',
  LESSOR: 'Upplåtare',
  LESSEE: 'Arrendator',
  CONTACT_PERSON: 'Kontaktperson',
  PRIMARY_BILLING_PARTY: 'Fakturamottagare',
};

// A party is an invoice recipient ("fakturamottagare") if it carries the PRIMARY_BILLING_PARTY role.
const isBillingParty = (stakeholder: { roles?: ContractStakeholderRole[] }): boolean =>
  (stakeholder.roles ?? []).includes(ContractStakeholderRole.PRIMARY_BILLING_PARTY);

// A party is *exclusively* an invoice recipient when PRIMARY_BILLING_PARTY is its only role.
// Only such parties are hidden from the party listing in the contract overview ("avtalsöversikt");
// a party that is also e.g. a leaseholder is kept so it still shows up on its contract row.
export const isOnlyBillingParty = (stakeholder: { roles?: ContractStakeholderRole[] }): boolean =>
  isBillingParty(stakeholder) &&
  (stakeholder.roles ?? []).every((role) => role === ContractStakeholderRole.PRIMARY_BILLING_PARTY);

const toContractStakeholderRole = (role: Role): ContractStakeholderRole => {
  switch (role) {
    case Role.BUYER:
      return ContractStakeholderRole.BUYER;
    case Role.SELLER:
      return ContractStakeholderRole.SELLER;
    case Role.LEASEHOLDER:
      return ContractStakeholderRole.LESSEE;
    case Role.GRANTOR:
      return ContractStakeholderRole.LESSOR;
    case Role.PROPERTY_OWNER:
      return ContractStakeholderRole.LESSOR;
    case Role.APPLICANT:
    default:
      return ContractStakeholderRole.CONTACT_PERSON; // Default role
  }
};

const toContractStakeholderType = (type: StakeholderType): ContractStakeholderType => {
  return type as ContractStakeholderType;
};

const kopeavtalToContract = (data: ContractData): Contract => {
  // Strip personalNumber and stakeholderId from stakeholders before sending to API
  const stakeholders = ((data.stakeholders ?? []) as StakeholderWithPersonnumber[]).map(
    ({ personalNumber, stakeholderId, ...rest }) => rest
  );

  return {
    startDate: data.startDate,
    propertyDesignations: data.propertyDesignations,
    contractId: data.contractId,
    type: ContractType.PURCHASE_AGREEMENT,
    leaseType: undefined,
    status: data.status,
    stakeholders,
    externalReferenceId: (data.externalReferenceId ?? '').toString(),
    extraParameters: data.extraParameters,
    additionalTerms: data.additionalTerms,
  };
};

export const contractToKopeavtal = (contract: Contract): ContractData => {
  return {
    ...defaultKopeavtal,
    ...contract,
    attachmentMetaData: contract.attachmentMetaData,
  };
};

const lagenhetsArrendeToContract = (data: ContractData): Contract => {
  console.log('transforming to contract: ', data);
  let fees: Fees | undefined = undefined;
  if (data.generateInvoice) {
    const feeDescription = getFeeDescription(data.type, data.leaseType);
    const yearlyNumber = Number.parseFloat((data.fees?.yearly ?? 0).toString());
    // Index fields must be sent all-or-nothing (API rule fees.consistentIndexFields): only include
    // them when indexation is on AND both indexYear and indexNumber are populated (> 0). Sending
    // indexType/indexationRate alone (e.g. after fees was cleared on a type switch) is rejected.
    const indexComplete =
      data.indexAdjusted === 'true' && Number(data.fees?.indexYear) > 0 && Number(data.fees?.indexNumber) > 0;
    fees = {
      yearly: yearlyNumber,
      monthly: 0,
      total: yearlyNumber,
      currency: 'SEK',
      // [0] = standardized fee description, [1] = optional supplementary avitext (appended below).
      additionalInformation: [feeDescription],
      ...(indexComplete && {
        indexYear: data.fees?.indexYear,
        indexNumber: data.fees?.indexNumber,
        indexationRate: data.fees?.indexationRate ?? 1,
        indexType: data.fees?.indexType ?? 'KPI 80',
      }),
    };
  }

  // Strip personalNumber and stakeholderId from stakeholders before sending to API
  const stakeholders = ((data.stakeholders ?? []) as StakeholderWithPersonnumber[]).map(
    ({ personalNumber, stakeholderId, ...rest }) => rest
  );

  return {
    extension: {
      autoExtend: data.extension?.autoExtend,
      unit: data.extension?.unit,
      ...(data?.extension?.autoExtend && { leaseExtension: data.extension?.leaseExtension }),
    },
    fees: fees,
    invoicing: {
      invoicedIn: data.invoicing?.invoicedIn ?? InvoicedIn.ADVANCE,
      invoiceInterval: data.invoicing?.invoiceInterval ?? IntervalType.YEARLY,
    },
    currentPeriod: data.currentPeriod,
    startDate: data.status === Status.ACTIVE ? data.startDate : data.currentPeriod?.startDate,
    endDate: data.endDate,
    notice: {
      terms: data.notice?.terms?.filter((t) => Boolean(t)),
      noticeDate: data.notice?.noticeDate !== '' ? data.notice?.noticeDate : undefined,
      noticeGivenBy:
        data.notice?.noticeGivenBy && [Party.LESSEE, Party.LESSOR].includes(data.notice?.noticeGivenBy)
          ? data.notice?.noticeGivenBy
          : undefined,
    },
    propertyDesignations: data.propertyDesignations,
    contractId: data.contractId,
    type: data.type,
    leaseType: data.leaseType,
    status: data.status,
    externalReferenceId: (data.externalReferenceId ?? '').toString(),
    stakeholders,
    extraParameters: data.extraParameters,
    additionalTerms: data.additionalTerms,
  };
};

export const contractToLagenhetsArrende = (contract: Contract): ContractData => {
  const feeDescription = getFeeDescription(contract.type, contract.leaseType);
  const hasIndexation = !!(
    contract.fees?.indexType ||
    contract.fees?.indexYear ||
    contract.fees?.indexNumber ||
    contract.fees?.indexationRate
  );
  const lagenhetsarrende: ContractData = {
    ...defaultLagenhetsarrende,
    ...contract,
    attachmentMetaData: contract.attachmentMetaData,
    additionalTerms: contract.additionalTerms,
    indexAdjusted: hasIndexation ? 'true' : 'false',
    fees: {
      ...contract.fees,
      additionalInformation: [feeDescription],
    },
  };
  return lagenhetsarrende;
};

export const getContractStakeholderName: (c: StakeholderWithPersonnumber) => string = (c) =>
  c.type === 'ASSOCIATION' || c.type === 'MUNICIPALITY' || c.type === 'ORGANIZATION'
    ? c.organizationName ?? ''
    : `${c.firstName} ${c.lastName}`;

// Convert errand stakeholder to contract stakeholder format (for adding new parties)
export const errandStakeholderToContractStakeholder = (
  stakeholder: CasedataOwnerOrContact,
  roles: ContractStakeholderRole[]
): StakeholderWithPersonnumber => {
  const phone = stakeholder.phoneNumbers?.[0] || '';
  const email = stakeholder.emails?.[0] || '';
  const address: Address = {
    type: AddressType.POSTAL_ADDRESS,
    streetAddress: stakeholder.street || '',
    postalCode: stakeholder.zip || '',
    town: stakeholder.city || '',
    country: '',
    attention: '',
    careOf: stakeholder.careof || '',
  };

  return {
    type:
      stakeholder.stakeholderType === 'ORGANIZATION'
        ? ContractStakeholderType.ORGANIZATION
        : ContractStakeholderType.PERSON,
    roles,
    firstName: stakeholder.firstName,
    lastName: stakeholder.lastName,
    organizationName: stakeholder.organizationName,
    organizationNumber: stakeholder.organizationNumber,
    partyId: stakeholder.personId,
    personalNumber: stakeholder.personalNumber,
    stakeholderId: String(stakeholder.id),
    address,
    phoneNumber: typeof phone === 'string' ? phone : phone?.value,
    emailAddress: typeof email === 'string' ? email : email?.value,
  };
};

export const fetchSignedContractAttachment: (
  municipalityId: string,
  contractId: string,
  attachmentId: number
) => Promise<ApiResponse<Attachment>> = (municipalityId, contractId, attachmentId) => {
  if (!attachmentId) {
    console.error('No attachment id found, cannot fetch. Returning.');
  }
  const url = `contracts/${municipalityId}/${contractId}/attachments/${attachmentId}`;
  return apiService
    .get<ApiResponse<Attachment>>(url)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching attachment: ', attachmentId);
      throw e;
    });
};

export const saveSignedContractAttachment = (
  municipalityId: string,
  contractId: string,
  attachment: UploadFile[],
  note: string
) => {
  const attachmentPromise = attachment.map(async (attachment) => {
    console.log('Processing attachment', attachment);
    const fileData = await toBase64(attachment.file);

    const formData: Attachment = {
      attachmentData: {
        content: fileData,
      },
      metadata: {
        category: AttachmentCategory.CONTRACT,
        filename: attachment.file.name,
        mimeType: attachment.file.type,
        note: note,
      },
    };

    return apiService
      .post<boolean, Attachment>(`contracts/${municipalityId}/${contractId}/attachments`, formData)
      .then((res) => {
        return res;
      })
      .catch((e) => {
        console.error('Something went wrong when saving attachment');
        throw e;
      });
  });

  return Promise.all(attachmentPromise).then(() => {
    return true;
  });
};

export const deleteSignedContractAttachment = (municipalityId: string, contractId: string, attachmentId: number) => {
  if (!attachmentId) {
    console.error('No id found, cannot continue.');
    return;
  }

  return apiService
    .deleteRequest<boolean>(`contracts/${municipalityId}/${contractId}/attachments/${attachmentId}`)
    .then((res) => {
      return res;
    })
    .catch((e) => {
      console.error('Something went wrong when removing attachment ', attachmentId);
      throw e;
    });
};

export function mapContractAttachmentToUploadFile<TExtraMeta extends object = object>(
  attachment: Attachment
): UploadFile<TExtraMeta> {
  let file: File;
  if (attachment.attachmentData.content) {
    file = base64ToFile(
      attachment.attachmentData.content,
      `${attachment.metadata.filename}`,
      attachment.metadata.mimeType
    );
  } else {
    file = new File([], `${attachment.metadata.filename}`, { type: attachment.metadata.mimeType });
  }

  const a: UploadFile<TExtraMeta> = {
    id: attachment.metadata.id?.toString() ?? crypto.randomUUID(),
    file,
    meta: {
      name: attachment.metadata.filename.replace(/\.[^/.]+$/, ''),
      ending: attachment.metadata.filename.split('.')?.[1] ?? '',
      category: attachment.metadata.category,
      note: attachment.metadata.note,
      mimeType: attachment.metadata.mimeType,
      version: '',
      created: attachment.metadata.created ?? '',
      updated: '',
      ...({} as TExtraMeta),
      isValidAttachment: attachment.attachmentData.content,
    },
  };
  return a;
}

export const getErrandPropertyInformation: (errand: IErrand) => Promise<{ name: string; district: string }[]> = async (
  errand: IErrand
) => {
  const designations = (errand.facilities ?? [])
    .filter((facility) => facility.address?.propertyDesignation)
    .map((facility) => facility.address!.propertyDesignation!);

  const infos = await Promise.allSettled(designations.map((d) => getSingleFacilityByDesignation(d)));

  return infos
    .filter((info): info is PromiseFulfilledResult<ApiResponse<EstateInfoSearch[]>> => info.status === 'fulfilled')
    .flatMap((info) => {
      const estates = info.value?.data || [];
      return estates.map((estate) => ({
        name: estate.designation || '',
        district: estate.districtname || '',
      }));
    });
};

// Contract Invoices

export interface ContractInvoice {
  id: string;
  status: CBillingRecordStatusEnum;
  invoiceDate?: string;
  dueDate?: string;
  amount?: number;
}

export interface ContractInvoicesResponse {
  invoices: ContractInvoice[];
  records: CBillingRecord[];
  totalCount: number;
  totalPages: number;
}

export const invoiceStatusLabels: Record<CBillingRecordStatusEnum, string> = {
  [CBillingRecordStatusEnum.NEW]: 'Ny',
  [CBillingRecordStatusEnum.APPROVED]: 'Godkänd',
  [CBillingRecordStatusEnum.INVOICED]: 'Fakturerad',
  [CBillingRecordStatusEnum.REJECTED]: 'Avslagen',
};

export const invoiceStatusColors: Record<CBillingRecordStatusEnum, 'tertiary' | 'vattjom' | 'gronsta' | 'error'> = {
  [CBillingRecordStatusEnum.NEW]: 'tertiary',
  [CBillingRecordStatusEnum.APPROVED]: 'vattjom',
  [CBillingRecordStatusEnum.INVOICED]: 'gronsta',
  [CBillingRecordStatusEnum.REJECTED]: 'error',
};

export const fetchContractInvoices: (
  municipalityId: string,
  contractId: string,
  page?: number,
  size?: number
) => Promise<ContractInvoicesResponse> = async (municipalityId, contractId, page = 0, size = 10) => {
  if (!municipalityId || !contractId) {
    console.error('Missing municipalityId or contractId for fetching contract invoices');
    return { invoices: [], records: [], totalCount: 0, totalPages: 0 };
  }

  const url = `billing/${municipalityId}/contracts/${contractId}/invoices?page=${page}&size=${size}`;

  return apiService
    .get<{
      content?: CBillingRecord[];
      totalElements?: number;
      totalPages?: number;
    }>(url)
    .then((res) => {
      const content = res.data?.content || [];
      const invoices: ContractInvoice[] = content.map((record) => {
        const inv: ContractInvoice = {
          id: record.id || '',
          status: record.status,
          invoiceDate: record.invoice?.date || record.transferDate,
          dueDate: record.invoice?.dueDate,
          amount: record.invoice?.totalAmount,
        };
        return inv;
      });

      return {
        invoices,
        records: content,
        totalCount: res.data?.totalElements || 0,
        totalPages: res.data?.totalPages || 0,
      };
    })
    .catch((e) => {
      console.error('Something went wrong when fetching contract invoices:', e);
      return { invoices: [], records: [], totalCount: 0, totalPages: 0 };
    });
};
