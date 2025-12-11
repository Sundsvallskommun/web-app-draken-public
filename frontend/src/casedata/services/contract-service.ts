import {
  Address,
  AddressType,
  Contract,
  Stakeholder as ContractStakeholder,
  StakeholderRole as ContractStakeholderRole,
  ContractType,
  LeaseType,
  StakeholderType,
  Status,
} from '@casedata/interfaces/contracts';
import { IErrand, RegisterErrandData } from '@casedata/interfaces/errand';
import { KopeAvtalsData, KopeavtalStakeholder, KopeavtalsTemplate } from '@casedata/interfaces/kopeavtals-data';
import {
  LagenhetsArendeTemplate,
  LagenhetsArrendeData,
  LagenhetsArrendeStakeholder,
} from '@casedata/interfaces/lagenhetsarrende-data';
import { PrettyRole, Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { Render, TemplateSelector } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';
import { toBase64 } from '@common/utils/toBase64';
import { AxiosResponse } from 'axios';
import { replaceExtraParameter, saveExtraParameters } from './casedata-extra-parameters-service';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';

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

export type AvtalsData = KopeAvtalsData | LagenhetsArrendeData;

const defaultKopeavtalTemplate: KopeavtalsTemplate = {
  overlatelseforklaringTerms: {
    includeBuildingsOnProperties: 'false',
    mapAttachments: '',
    mapAttachmentReference: '',
    includeBuildingsInArea: 'true',
  },
  kopeskillingTerms: {
    amountText: '',
    amountNumber: 0,
    paymentCondition: 'onDate',
    condition: {
      header: 'Betalning på angivet datum',
      conditionText: '',
    },
  },
  tilltradeTerms: {
    timeOfAccess: 'onDate',
    accessDate: '',
  },
  markfororeningarTerms: {
    detailPlan: '',
    propertyOrArea: '',
    condition: {
      pollutionGuaranteeBuildable: undefined,
      pollutionGuaranteeExtended: undefined,
      pollutionGuaranteeInspected: undefined,
    },
  },
  skogTerms: {
    condition: {
      noClaims: undefined,
      huntingRights: undefined,
      noLogging: undefined,
      noUnsoldLoggingRights: undefined,
      takeOverAllAgreements: undefined,
    },
  },
  forpliktelserTerms: {
    condition: {
      insurance: undefined,
      cleaning: undefined,
    },
  },
  utgifterTerms: {
    condition: {
      fees: undefined,
      taxes: undefined,
      regulation: undefined,
      lagfart: undefined,
    },
  },
  fastighetsbildningTerms: {
    condition: {
      kringkostnader: undefined,
      taxes: undefined,
      regulation: undefined,
    },
  },
  otherTerms: {
    condition: {
      inspected: undefined,
      asis: undefined,
      fees: undefined,
      keys: undefined,
      deedPaidByBuyer: undefined,
    },
  },
  signatureTerms: {
    condition: {
      emptyRowSeller: undefined,
      emptyRowBuyer: undefined,
      example: undefined,
    },
  },
};

export const defaultKopeavtal: KopeAvtalsData & KopeavtalsTemplate = {
  ...defaultKopeavtalTemplate,
  status: Status.DRAFT,
  type: ContractType.PURCHASE_AGREEMENT,
  contractId: '',
  propertyDesignations: [],
  buyers: [],
  sellers: [],
  overlatelseforklaring: '',
  kopeskilling: '',
  tilltrade: '',
  markfororeningar: '',
  skog: '',
  forpliktelser: '',
  utgifter: '',
  fastighetsbildning: '',
  other: '',
  attachmentMetaData: [],
  signature: '',
};

export const defaultLagenhetsArrendeTemplate: LagenhetsArendeTemplate = {
  omradeTerms: {
    areaType: 'land',
    areaSize: '',
    propertiesInvolved: [],
    condition: {
      areaType: { header: 'Typ av område', conditionText: '' },
      propertiesInvolved: { header: 'Fastigheter', conditionText: '' },
      areaSize: { header: 'Områdets storlek', conditionText: '' },
      mapAttachments: { header: 'Kartbilagor', conditionText: '' },
      mapAttachmentReference: { header: 'Referens till kartbilagor', conditionText: '' },
    },
  },
  andamalTerms: {
    clarification: '',
    bygglovExists: 'false',
    condition: {
      byggnad: undefined,
      batplats: undefined,
      idrattsandamal: undefined,
      led: undefined,
      parkering: undefined,
      skylt: undefined,
      snotipp: undefined,
      tomtkomplement: undefined,
      upplag: undefined,
      uppstallning: undefined,
      ytjordvarme: undefined,
      vag: undefined,
      atervinningsstation: undefined,
      clarification: undefined,
      bygglovExists: undefined,
      other: undefined,
      consent: undefined,
      detailedplan: undefined,
    },
  },
  arrendetidTerms: {
    startDate: '',
    endDate: '',
    monthsNotice: '',
    autoRenewal: '',
  },
  arrendeavgiftTerms: {
    yearly: 'true',
    byYear: 'false',
    byLease: 'false',
    indexAdjustedFee: 'false',
    period: 'yearly',
    yearlyFee: 0,
    feeByYear: 0,
    associatedFeeYear: 0,
    feeByLease: 0,
    indexYear: 0,
    indexFee: 0,
    prepaid: 'false',
    yearOrQuarter: 'year',
    preOrPost: 'pre',
  },
  bygglovTerms: {
    condition: {
      permitFees: undefined,
      buildingOwnership: undefined,
    },
  },
  overlatelseTerms: {
    condition: {
      subletting: undefined,
    },
  },
  inskrivningTerms: {
    condition: {
      inskrivning: undefined,
    },
  },
  skickTerms: {
    condition: {
      nuisance: undefined,
      accessibility: undefined,
    },
  },
  ledningarTerms: {
    condition: {
      ledningar: undefined,
    },
  },
  kostnaderTerms: {
    condition: {
      kostnader: undefined,
    },
  },
  markfororeningarTerms: {
    condition: {
      pollutionAvoidance: undefined,
      verificationResponsibility: undefined,
      testDone: undefined,
      testingAtEnd: undefined,
      testingAtTransfer: undefined,
    },
  },
  upphorandeTerms: {
    noRefundLeaseFeeAmount: 0,
    condition: {
      restorationCleaning: undefined,
      restorationBuildingRemoval: undefined,
      noRefundLeaseFee: undefined,
      inspectionRequirements: undefined,
      inspectionLandWater: undefined,
    },
  },
  skadaansvarTerms: {
    condition: {
      skadeaterstallning: undefined,
      skadestandsskyldighet: undefined,
      befrielse: undefined,
      begransning: undefined,
      anpassat: undefined,
    },
  },
  sarskildaTerms: {
    condition: {
      sarskilda: undefined,
    },
  },
  jordabalkenTerms: {
    condition: {
      jordabalken: undefined,
    },
    replaces: undefined,
  },
  signatureTerms: {
    condition: {
      emptyRowPropertyowner: undefined,
      emptyRowLeaseholder: undefined,
      example: undefined,
    },
  },
};

export const defaultLagenhetsarrende: LagenhetsArrendeData & LagenhetsArendeTemplate = {
  ...defaultLagenhetsArrendeTemplate,
  attachmentMetaData: [],
  contractId: '',
  externalReferenceId: '',
  type: ContractType.LEASE_AGREEMENT,
  leaseType: LeaseType.LAND_LEASE_MISC,
  status: Status.DRAFT,
  propertyDesignations: [],
  lessees: [],
  lessors: [],
  omrade: '',
  andamal: '',
  arrendetid: '',
  arrendeavgift: '',
  bygglov: '',
  overlatelse: '',
  inskrivning: '',
  skick: '',
  ledningar: '',
  kostnader: '',
  markfororeningar: '',
  upphorande: '',
  skadaansvar: '',
  sarskilda: '',
  jordabalken: '',
  signature: '',
};

export interface CasedataContractAttachment {
  attachmentData: {
    content: string;
  };
  metaData: {
    category: string;
    filename: string;
    mimeType: string;
    note: string;
  };
}

export const saveContract: (contract: AvtalsData) => Promise<Contract> = (contract) => {
  let apiCall: Promise<AxiosResponse<ApiResponse<Contract>>>;
  const apiContract: Contract =
    contract.type === ContractType.PURCHASE_AGREEMENT
      ? kopeavtalToContract(contract as KopeAvtalsData)
      : lagenhetsArrendeToContract(contract as LagenhetsArrendeData);

  if (contract.contractId) {
    const url = `contract/${contract.contractId}`;
    apiCall = apiService.put<ApiResponse<Contract>, Contract>(url, apiContract);
  } else {
    const url = `contract`;
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
  const url = `contract/${contractId}`;
  return apiService.deleteRequest<boolean>(url).catch((e) => {
    console.error('Something went wrong when deleting contract: ', contractId);
    throw e;
  });
};

export const fetchContract: (contractId: string) => Promise<ApiResponse<Contract>> = (contractId) => {
  if (!contractId) {
    console.error('No contract id found, cannot fetch. Returning.');
  }
  const url = `contract/${contractId}`;
  return apiService
    .get<ApiResponse<KopeAvtalsData>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching contract: ', contractId);
      throw e;
    });
};

export const fetchAllContracts: () => Promise<ApiResponse<Contract[]>> = () => {
  const url = `contract`;
  return apiService
    .get<ApiResponse<KopeAvtalsData[]>>(url)
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

export const getErrandContract: (errand: IErrand) => Promise<KopeAvtalsData | LagenhetsArrendeData> = (errand) => {
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
    case Role.APPLICANT:
    //   return ContractStakeholderRole.APPLICANT;
    default:
      return ContractStakeholderRole.CONTACT_PERSON; // Default role
  }
};

export const casedataStakeholderToContractStakeholder = (stakeholder: CasedataOwnerOrContact): ContractStakeholder => {
  // const phone = stakeholder.contactInformation?.find(c => c.contactType === 'PHONE')?.value;
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
    ...(phone && { phone }),
    ...(email && { email }),
    ...(address && { address }),
  };
};

export const kopeavtalToContract = (kopeavtal: KopeAvtalsData): Contract => {
  return {
    propertyDesignations: kopeavtal.propertyDesignations,
    contractId: kopeavtal.contractId,
    type: ContractType.PURCHASE_AGREEMENT,
    leaseType: undefined,
    status: kopeavtal.status,
    externalReferenceId: kopeavtal.externalReferenceId.toString(),
    stakeholders: [...kopeavtal.buyers, ...kopeavtal.sellers],
    indexTerms: [
      {
        header: 'Överlåtelseförklaring',
        terms: [
          {
            description: 'content',
            term: kopeavtal.overlatelseforklaring,
          },
        ],
      },
      {
        header: 'Köpeskilling och betalning',
        terms: [
          {
            description: 'content',
            term: kopeavtal.kopeskilling,
          },
        ],
      },
      {
        header: 'Tillträde',
        terms: [
          {
            description: 'content',
            term: kopeavtal.tilltrade,
          },
        ],
      },
      {
        header: 'Markföroreningar',
        terms: [
          {
            description: 'content',
            term: kopeavtal.markfororeningar,
          },
        ],
      },
      {
        header: 'Skog',
        terms: [
          {
            description: 'content',
            term: kopeavtal.skog,
          },
        ],
      },
      {
        header: 'Förpliktelser',
        terms: [
          {
            description: 'content',
            term: kopeavtal.forpliktelser,
          },
        ],
      },
      {
        header: 'Utgifter och kostnader',
        terms: [
          {
            description: 'content',
            term: kopeavtal.utgifter,
          },
        ],
      },
      {
        header: 'Fastighetsbildning',
        terms: [
          {
            description: 'content',
            term: kopeavtal.fastighetsbildning,
          },
        ],
      },
      {
        header: 'Övriga villkor',
        terms: [
          {
            description: 'content',
            term: kopeavtal.other,
          },
        ],
      },
      {
        header: 'Underskrifter',
        terms: [
          {
            description: 'content',
            term: kopeavtal.signature,
          },
        ],
      },
    ],
  };
};

export const contractToKopeavtal = (contract: Contract): KopeAvtalsData => {
  return {
    ...defaultKopeavtal,
    contractId: contract.contractId,
    externalReferenceId: contract.externalReferenceId,
    type: ContractType.PURCHASE_AGREEMENT,
    status: contract.status,
    buyers: contract.stakeholders.filter((s) => s.roles.includes(ContractStakeholderRole.BUYER)),
    sellers: contract.stakeholders.filter((s) => s.roles.includes(ContractStakeholderRole.SELLER)),
    overlatelseforklaring: contract.indexTerms.find((t) => t.header === 'Överlåtelseförklaring')?.terms[0].term,
    kopeskilling: contract.indexTerms.find((t) => t.header === 'Köpeskilling och betalning')?.terms[0].term,
    tilltrade: contract.indexTerms.find((t) => t.header === 'Tillträde')?.terms[0].term,
    markfororeningar: contract.indexTerms.find((t) => t.header === 'Markföroreningar')?.terms[0].term,
    skog: contract.indexTerms.find((t) => t.header === 'Skog')?.terms[0].term,
    forpliktelser: contract.indexTerms.find((t) => t.header === 'Förpliktelser')?.terms[0].term,
    utgifter: contract.indexTerms.find((t) => t.header === 'Utgifter och kostnader')?.terms[0].term,
    fastighetsbildning: contract.indexTerms.find((t) => t.header === 'Fastighetsbildning')?.terms[0].term,
    other: contract.indexTerms.find((t) => t.header === 'Övriga villkor')?.terms[0].term,
    attachmentMetaData: contract.attachmentMetaData,
    signature: contract.indexTerms.find((t) => t.header === 'Underskrifter')?.terms[0].term,
  };
};

export const lagenhetsArrendeToContract = (lagenhetsarrende: LagenhetsArrendeData): Contract => {
  return {
    propertyDesignations: lagenhetsarrende.propertyDesignations,
    contractId: lagenhetsarrende.contractId,
    type: ContractType.LEASE_AGREEMENT,
    leaseType: lagenhetsarrende.leaseType,
    status: lagenhetsarrende.status,
    externalReferenceId: lagenhetsarrende.externalReferenceId.toString(),
    stakeholders: [...lagenhetsarrende.lessees, ...lagenhetsarrende.lessors],
    indexTerms: [
      {
        header: 'Område och upplåtelse',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.omrade,
          },
        ],
      },
      {
        header: 'Ändamål',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.andamal,
          },
        ],
      },
      {
        header: 'Arrendetid och uppsägning',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.arrendetid,
          },
        ],
      },
      {
        header: 'Arrendeavgift',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.arrendeavgift,
          },
        ],
      },
      {
        header: 'Bygglov och tillstånd',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.bygglov,
          },
        ],
      },
      {
        header: 'Överlåtelse och underupplåtelse',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.overlatelse,
          },
        ],
      },
      {
        header: 'Inskrivning',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.inskrivning,
          },
        ],
      },
      {
        header: 'Skick och skötsel',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.skick,
          },
        ],
      },
      {
        header: 'Ledningar',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.ledningar,
          },
        ],
      },
      {
        header: 'Kostnader',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.kostnader,
          },
        ],
      },
      {
        header: 'Markföroreningar',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.markfororeningar,
          },
        ],
      },
      {
        header: 'Arrendets upphörande och återställning av området',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.upphorande,
          },
        ],
      },
      {
        header: 'Skada och ansvar',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.skadaansvar,
          },
        ],
      },
      ...(lagenhetsarrende.additionalTerms?.[0]?.header && lagenhetsarrende.additionalTerms?.[0]?.terms?.[0]?.term
        ? [
            {
              header: lagenhetsarrende.additionalTerms?.[0]?.header.toString(),
              terms: [
                {
                  description: 'content',
                  term: lagenhetsarrende.additionalTerms?.[0]?.terms[0]?.term.toString(),
                },
              ],
            },
          ]
        : []),
      {
        header: 'Särskilda bestämmelser',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.sarskilda,
          },
        ],
      },
      {
        header: 'Hänvisning till jordabalken',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.jordabalken,
          },
        ],
      },
      {
        header: 'Underskrifter',
        terms: [
          {
            description: 'content',
            term: lagenhetsarrende.signature,
          },
        ],
      },
    ],
    additionalTerms: lagenhetsarrende.additionalTerms,
  };
};

export const contractToLagenhetsArrende = (contract: Contract): LagenhetsArrendeData => {
  const lagenhetsarrende: LagenhetsArrendeData = {
    ...defaultLagenhetsarrende,
    contractId: contract.contractId,
    externalReferenceId: contract.externalReferenceId,
    type: ContractType.LEASE_AGREEMENT,
    leaseType: contract.leaseType,
    status: contract.status,
    lessees: contract.stakeholders.filter((s) => s.roles.includes(ContractStakeholderRole.LESSEE)),
    lessors: contract.stakeholders.filter((s) => s.roles.includes(ContractStakeholderRole.LESSOR)),
    omrade: contract.indexTerms.find((t) => t.header === 'Område och upplåtelse')?.terms[0].term,
    andamal: contract.indexTerms.find((t) => t.header === 'Ändamål')?.terms[0].term,
    arrendetid: contract.indexTerms.find((t) => t.header === 'Arrendetid och uppsägning')?.terms[0].term,
    arrendeavgift: contract.indexTerms.find((t) => t.header === 'Arrendeavgift')?.terms[0].term,
    bygglov: contract.indexTerms.find((t) => t.header === 'Bygglov och tilstånd')?.terms[0].term,
    overlatelse: contract.indexTerms.find((t) => t.header === 'Överlåtelse och underupplåtelse')?.terms[0].term,
    inskrivning: contract.indexTerms.find((t) => t.header === 'Inskrivning')?.terms[0].term,
    skick: contract.indexTerms.find((t) => t.header === 'Skick och skötsel')?.terms[0].term,
    ledningar: contract.indexTerms.find((t) => t.header === 'Ledningar')?.terms[0].term,
    kostnader: contract.indexTerms.find((t) => t.header === 'Kostnader')?.terms[0].term,
    markfororeningar: contract.indexTerms.find((t) => t.header === 'Markföroreningar')?.terms[0].term,
    upphorande: contract.indexTerms.find((t) => t.header === 'Arrendets upphörande och återställning av området')
      ?.terms[0].term,
    skadaansvar: contract.indexTerms.find((t) => t.header === 'Skada och ansvar')?.terms[0].term,
    sarskilda: contract.indexTerms.find((t) => t.header === 'Särskilda bestämmelser')?.terms[0].term,
    jordabalken: contract.indexTerms.find((t) => t.header === 'Hänvisning till jordabalken')?.terms[0].term,
    attachmentMetaData: contract.attachmentMetaData,
    additionalTerms: contract.additionalTerms,
    signature: contract.indexTerms.find((t) => t.header === 'Underskrifter')?.terms[0].term,
  };
  return lagenhetsarrende;
};

export const getContractStakeholderName: (c: KopeavtalStakeholder | LagenhetsArrendeStakeholder) => string = (c) =>
  c.type === 'COMPANY' || c.type === 'ASSOCIATION' || c.type === 'MUNICIPALITY'
    ? c.organizationName
    : `${c.firstName} ${c.lastName}`;

export const getContractType = (contract: AvtalsData) => {
  return contract.type === ContractType.PURCHASE_AGREEMENT
    ? kopeavtalToContract(contract as KopeAvtalsData)
    : lagenhetsArrendeToContract(contract as LagenhetsArrendeData);
};

export const fetchSignedContractAttachment: (
  municipalityId: string,
  contractId: string,
  attachmentId: number
) => Promise<ApiResponse<CasedataContractAttachment>> = (municipalityId, contractId, attachmentId) => {
  if (!attachmentId) {
    console.error('No attachment id found, cannot fetch. Returning.');
  }
  const url = `contracts/${municipalityId}/${contractId}/attachments/${attachmentId}`;
  return apiService
    .get<ApiResponse<CasedataContractAttachment>>(url)
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
    const fileData = await toBase64(attachment.file[0]);

    const formData: CasedataContractAttachment = {
      attachmentData: {
        content: fileData,
      },
      metaData: {
        category: 'CONTRACT',
        filename: attachment.file[0].name,
        mimeType: attachment.file[0].type,
        note: note,
      },
    };

    apiService
      .post<boolean, CasedataContractAttachment>(`contracts/${municipalityId}/${contractId}/attachments`, formData)
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

export const saveDoneMarksOnErrande = (municipalityId: string, errand: IErrand, inKey: string, element: string[]) => {
  if (!municipalityId) {
    console.error('No municipalityId found. Cannot update set marks of contract.');
    return;
  }
  if (!errand.id) {
    console.error('No id found. Cannot update set marks of contract.');
    return;
  }

  const newParameter: ExtraParameter = {
    key: inKey,
    values: element,
  };
  const e: Partial<RegisterErrandData> = {
    id: errand.id.toString(),
    extraParameters: replaceExtraParameter(errand.extraParameters, newParameter),
  };
  return apiService
    .patch<boolean, Partial<RegisterErrandData>>(`casedata/${municipalityId}/errands/${errand.id}`, e)
    .catch((e) => {
      console.error('Something went wrong when triggering errand phase change', e);
      throw e;
    });
};
