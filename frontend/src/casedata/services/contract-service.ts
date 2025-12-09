import { ContractData, StakeholderWithPersonnumber } from '@casedata/interfaces/contract-data';
import {
  Address,
  AddressType,
  Attachment,
  AttachmentCategory,
  Contract,
  Stakeholder as ContractStakeholder,
  StakeholderRole as ContractStakeholderRole,
  ContractType,
  Fees,
  InvoicedIn,
  LeaseType,
  Parameter,
  Party,
  StakeholderType,
  Status,
  TimeUnit,
} from '@casedata/interfaces/contracts';
import { IErrand } from '@casedata/interfaces/errand';
import { PrettyRole, Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { Render, TemplateSelector } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';
import { toBase64 } from '@common/utils/toBase64';
import { AxiosResponse } from 'axios';
import { saveExtraParameters } from './casedata-extra-parameters-service';
import { UploadFile } from '@sk-web-gui/react';
import { base64ToFile } from '@common/services/attachment-service';

export const contractTypes = [
  { label: 'Arrende', key: ContractType.LEASE_AGREEMENT },
  { label: 'Köpeavtal', key: ContractType.PURCHASE_AGREEMENT },
];

export const leaseTypes = [
  { label: 'Allmän platsupplåtelse', key: LeaseType.LAND_LEASE_PUBLIC },
  { label: 'Anläggningsarrende', key: LeaseType.SITE_LEASE_COMMERCIAL },
  { label: 'Bostadsarrende', key: LeaseType.LAND_LEASE_RESIDENTIAL },
  { label: 'Båtplats', key: LeaseType.USUFRUCT_MOORING },
  { label: 'Hyresobjekt', key: LeaseType.OBJECT_LEASE },
  { label: 'Jaktarrende', key: LeaseType.USUFRUCT_HUNTING },
  { label: 'Jordbruksarrende', key: LeaseType.USUFRUCT_FARMING },
  { label: 'Lägenhetsarrende', key: LeaseType.LAND_LEASE_MISC },
  { label: 'Nyttjanderätt', key: LeaseType.USUFRUCT_MISC },
  { label: 'Tomträtt', key: LeaseType.LEASEHOLD },
];

export const roleLabels: { [key in ContractStakeholderRole]: string } = {
  BUYER: 'Köpare',
  CONTACT_PERSON: 'Kontaktperson',
  GRANTOR: 'Upplåtare',
  LAND_RIGHT_OWNER: 'LAND_RIGHT_OWNER',
  LEASEHOLDER: 'LEASEHOLDER',
  PROPERTY_OWNER: 'PROPERTY_OWNER',
  POWER_OF_ATTORNEY_CHECK: 'POWER_OF_ATTORNEY_CHECK',
  POWER_OF_ATTORNEY_ROLE: 'POWER_OF_ATTORNEY_ROLE',
  SELLER: 'SELLER',
  SIGNATORY: 'SIGNATORY',
  PRIMARY_BILLING_PARTY: 'PRIMARY_BILLING_PARTY',
  LESSOR: 'LESSOR',
  LESSEE: 'LESSEE',
};

export const defaultKopeavtal: ContractData = {
  status: Status.DRAFT,
  type: ContractType.PURCHASE_AGREEMENT,
  contractId: '',
  propertyDesignations: [],
  buyers: [],
  sellers: [],
  generateInvoice: undefined,
  indexAdjusted: undefined,
};

export const defaultLagenhetsarrende: ContractData = {
  attachmentMetaData: [],
  contractId: '',
  externalReferenceId: '',
  type: ContractType.LEASE_AGREEMENT,
  leaseType: LeaseType.LAND_LEASE_MISC,
  status: Status.DRAFT,
  propertyDesignations: [],
  lessees: [],
  lessors: [],
  notices: [
    {
      party: Party.LESSEE,
      periodOfNotice: 3,
      unit: TimeUnit.MONTHS,
    },
    {
      party: Party.LESSOR,
      periodOfNotice: 3,
      unit: TimeUnit.MONTHS,
    },
  ],
  extraParameters: [
    {
      name: 'InvoiceInfo',
      parameters: {
        markup: '',
      },
    },
  ],
  generateInvoice: 'true',
  indexAdjusted: undefined,
};

export const saveContract: (contract: ContractData) => Promise<Contract> = (contract) => {
  console.log('Saving contract', contract);
  let apiCall: Promise<AxiosResponse<ApiResponse<Contract>>>;
  const apiContract: Contract =
    contract.type === ContractType.PURCHASE_AGREEMENT
      ? kopeavtalToContract(contract)
      : lagenhetsArrendeToContract(contract);

  console.log('Processed:', apiContract);
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
};

export const deleteContract: (contractId: string) => Promise<AxiosResponse<boolean>> = (contractId) => {
  if (!contractId) {
    console.error('No contract id found, cannot delete. Returning.');
  }
  const url = `contracts/${contractId}`;
  return apiService.deleteRequest<boolean>(url).catch((e) => {
    console.error('Something went wrong when deleting contract: ', contractId);
    throw e;
  });
};

export const fetchContract: (contractId: string) => Promise<ApiResponse<Contract>> = (contractId) => {
  if (!contractId) {
    console.error('No contract id found, cannot fetch. Returning.');
  }
  const url = `contracts/${contractId}`;
  return apiService
    .get<ApiResponse<ContractData>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching contract: ', contractId);
      throw e;
    });
};

export const fetchAllContracts: () => Promise<ApiResponse<Contract[]>> = () => {
  const url = `contracts`;
  return apiService
    .get<ApiResponse<ContractData[]>>(url)
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
  const contractId = errand.extraParameters.find((p) => p.key === 'contractId')?.values[0];
  if (!contractId) {
    return Promise.reject('No contract id found on errand, cannot fetch contract. Returning.');
  }
  return fetchContract(contractId)
    .then((res) => {
      if (res.data.type === ContractType.PURCHASE_AGREEMENT) {
        return contractToKopeavtal(res.data as Contract);
      } else if (res.data.type === ContractType.LEASE_AGREEMENT) {
        return contractToLagenhetsArrende(res.data as Contract);
      } else {
        console.error('Unknown contract type: ', res.data.type);
        throw new Error('Unknown contract type');
      }
    })
    .catch((e) => {
      console.error('Something went wrong when fetching contract: ', contractId);
      throw e;
    });
};

export const renderContractPdf: (
  errand: IErrand,
  contract: Contract,
  isDraft: boolean
) => Promise<{ pdfBase64: string; error?: string }> = async (errand, contract, isDraft) => {
  if (!contract?.contractId) {
    console.error('No contract id found. Cannot render contract pdf.');
  }

  const templateIdentifier =
    contract.type === ContractType.PURCHASE_AGREEMENT
      ? `mex.contract.purchaseagreement`
      : contract.type === ContractType.LEASE_AGREEMENT
      ? `mex.contract.landlease`
      : 'mex.contract.purchaseagreement';

  const renderBody: TemplateSelector = {
    identifier: templateIdentifier,
    parameters: {
      header: contract.type === ContractType.PURCHASE_AGREEMENT ? 'KÖPEAVTAL' : 'AVTAL OM LÄGENHETSARRENDE',
      description: `<b>Avtals ID:</b> ${contract.contractId}<br />
                    <b>Ärendenummer:</b> ${errand.errandNumber} <br />`,
      isDraft: isDraft,

      stakeholders: contract.stakeholders.map((s) => ({
        name: s.type === 'PERSON' ? s.firstName + ' ' + s.lastName : s.organizationName + ' ' + s.organizationNumber,
        street: s.address.streetAddress,
        careof: s.address.careOf,
        zip: s.address.postalCode + ' ' + s.address.town,
        role: s.roles.map((r) => PrettyRole[r]).join(', '),
        extraInformation: s.parameters?.find((p) => p.key === 'extraInformation')?.values[0],
      })),
      sections: contract.indexTerms
        .filter((t) => t.terms.some((term) => term.term !== '' && typeof term.term !== 'undefined'))
        .map((t) => ({
          header: t.header,
          content: t.terms.map((t) => `<p>${t.term}</p>`).join('<br />'),
        })),
    },
  };

  return apiService
    .post<ApiResponse<Render>, TemplateSelector>('render/pdf', renderBody)
    .then((res) => {
      const pdfBase64 = res.data.data.output;
      return { pdfBase64 };
    })
    .catch((e) => {
      throw new Error('Något gick fel när dokumentet skulle skapas');
    });
};

// export const contractRoles: string[] = ['BUYER', 'SELLER', 'LEASEHOLDER', 'GRANTOR'];
export const contractRoles: string[] = [
  'BUYER',
  'CONTACT_PERSON',
  'GRANTOR',
  'LAND_OWNER',
  'LEASEHOLDER',
  'POWER_OF_ATTORNEY_CHECK',
  'POWER_OF_ATTORNEY_ROLE',
  'SELLER',
  'SIGNATORY',
];

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

export const prettyPaymentPeriods: {
  [key in 'yearly' | 'byYear' | 'byLease' | 'indexAdjustedFee' | 'prepaid']: string;
} = {
  yearly: 'Årlig',
  byYear: 'Per år',
  byLease: 'Per arrende',
  indexAdjustedFee: 'Indexjusterad',
  prepaid: 'Förskott',
};

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
    //   return ContractStakeholderRole.APPLICANT;
    default:
      return ContractStakeholderRole.CONTACT_PERSON; // Default role
  }
};

export const casedataStakeholderToContractStakeholder = (stakeholder: CasedataOwnerOrContact): ContractStakeholder => {
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
  const parameters: Parameter[] = [
    {
      key: 'extraParameter',
      values: [stakeholder.extraInformation ?? ''],
    },
  ];
  const contractStakeholderType = stakeholder.stakeholderType as StakeholderType;
  return {
    ...(stakeholder.stakeholderType && { type: contractStakeholderType }),
    roles: stakeholder.roles.map(toContractStakeholderRole),
    ...(stakeholder.personalNumber && { personalNumber: stakeholder.personalNumber }),
    ...(stakeholder.organizationName && { organizationName: stakeholder.organizationName }),
    ...(stakeholder.organizationNumber && { organizationNumber: stakeholder.organizationNumber }),
    ...(stakeholder.firstName && { firstName: stakeholder.firstName }),
    ...(stakeholder.lastName && { lastName: stakeholder.lastName }),
    ...(stakeholder.personId && { partyId: stakeholder.personId }),
    ...(stakeholder.extraInformation && { extraInformation: stakeholder.extraInformation }),
    ...(stakeholder.extraInformation && { extraInformation: stakeholder.extraInformation }),
    parameters: parameters,
    ...(phone && { phone }),
    ...(email && { email }),
    ...(address && { address }),
  };
};

export const kopeavtalToContract = (data: ContractData): Contract => {
  return {
    propertyDesignations: data.propertyDesignations,
    contractId: data.contractId,
    type: ContractType.PURCHASE_AGREEMENT,
    leaseType: undefined,
    status: data.status,
    stakeholders: [...data.buyers, ...data.sellers],
    externalReferenceId: data.externalReferenceId.toString(),
    extraParameters: data.extraParameters,
    additionalTerms: data.additionalTerms,
  };
};

export const contractToKopeavtal = (contract: Contract): ContractData => {
  return {
    ...defaultKopeavtal,
    ...contract,
    buyers: contract.stakeholders.filter((s) => s.roles.includes(ContractStakeholderRole.BUYER)),
    sellers: contract.stakeholders.filter((s) => s.roles.includes(ContractStakeholderRole.SELLER)),
    attachmentMetaData: contract.attachmentMetaData,
  };
};

export const lagenhetsArrendeToContract = (data: ContractData): Contract => {
  console.log('transforming to contract: ', data);
  let fees: Fees = undefined;
  if (data.generateInvoice) {
    const yearlyNumber = Number.parseFloat(data.fees.yearly.toString());
    fees = {
      yearly: yearlyNumber,
      monthly: 0,
      total: yearlyNumber,
      currency: 'SEK',
      additionalInformation: [
        `Avgift, ${leaseTypes.find((t) => t.key === data.leaseType)?.label.toLocaleLowerCase() ?? 'okänd typ'}`,
        data.fees?.additionalInformation?.[1] ?? '',
      ],
      ...(data.indexAdjusted && { indexYear: 2025 }),
      ...(data.indexAdjusted && { indexNumber: 419.35 }),
      ...(data.indexAdjusted && { indexationRate: 1.0 }),
      // FIXME indexType saknas i APIet
      // ...(data.indexAdjusted && {indexType: 'KPI 80'}),
    };
  }
  return {
    extension: {
      autoExtend: data.extension?.autoExtend,
      unit: data.extension?.unit,
      ...(data?.extension?.autoExtend && { leaseExtension: data.extension?.leaseExtension }),
    },
    fees: fees,
    invoicing: {
      invoicedIn: InvoicedIn.ADVANCE,
      invoiceInterval: data.invoicing?.invoiceInterval,
    },
    start: data.start,
    end: data.end,
    notices: data.notices,
    propertyDesignations: data.propertyDesignations,
    contractId: data.contractId,
    type: ContractType.LEASE_AGREEMENT,
    leaseType: data.leaseType,
    status: data.status,
    externalReferenceId: data.externalReferenceId.toString(),
    stakeholders: [...data.lessees, ...data.lessors],
    extraParameters: data.extraParameters,
    additionalTerms: data.additionalTerms,
  };
};

export const contractToLagenhetsArrende = (contract: Contract): ContractData => {
  const lagenhetsarrende: ContractData = {
    ...defaultLagenhetsarrende,
    ...contract,
    lessees: contract.stakeholders.filter((s) => s.roles.includes(ContractStakeholderRole.LESSEE)),
    lessors: contract.stakeholders.filter((s) => s.roles.includes(ContractStakeholderRole.LESSOR)),
    attachmentMetaData: contract.attachmentMetaData,
    additionalTerms: contract.additionalTerms,
    fees: {
      ...contract.fees,
      additionalInformation: contract.fees?.additionalInformation ?? [
        `Avgift, ${leaseTypes.find((t) => t.key === contract.leaseType)?.label.toLocaleLowerCase() ?? 'okänd typ'}`,
        '',
      ],
    },
  };
  return lagenhetsarrende;
};

export const getContractStakeholderName: (c: StakeholderWithPersonnumber) => string = (c) =>
  c.type === 'COMPANY' || c.type === 'ASSOCIATION' || c.type === 'MUNICIPALITY'
    ? c.organizationName
    : `${c.firstName} ${c.lastName}`;

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
  attachment: { id: string; file: File }[],
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
      created: '',
      updated: '',
      ...({} as TExtraMeta),
      isValidAttachment: attachment.attachmentData.content,
    },
  };
  return a;
}