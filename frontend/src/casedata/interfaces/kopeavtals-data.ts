import { BaseContract } from '@casedata/services/contract-service';
import { CasedataOwnerOrContact } from './stakeholder';

export type KopeavtalStakeholder = Omit<Omit<CasedataOwnerOrContact, 'personId'>, 'stakeholderType'> & {
  partyId: string;
  partOwnership?: string;
  type: 'PERSON' | 'COMPANY' | 'ASSOCIATION';
};

export interface KopeavtalsTemplate {
  overlatelseforklaringTerms: {
    includeBuildingsOnProperties: string;
    mapAttachments?: string;
    mapAttachmentReference?: string;
    includeBuildingsInArea: string;
  };
  kopeskillingTerms: {
    amountText?: string;
    amountNumber?: number;
    paymentCondition: 'onDate' | 'thirtyDays' | 'fourWeeks' | 'other';
    condition?: {
      header: string;
      conditionText?: string;
    };
  };
  tilltradeTerms: {
    timeOfAccess: 'onDate' | 'whenPaid';
    accessDate?: string;
  };
  markfororeningarTerms: {
    detailPlan?: string;
    propertyOrArea?: string;
    condition?: {
      [key in 'pollutionGuaranteeBuildable' | 'pollutionGuaranteeExtended' | 'pollutionGuaranteeInspected']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  skogTerms: {
    condition?: {
      [key in 'noClaims' | 'huntingRights' | 'noLogging' | 'noUnsoldLoggingRights' | 'takeOverAllAgreements']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  forpliktelserTerms: {
    condition?: {
      [key in 'insurance' | 'cleaning']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  utgifterTerms: {
    condition?: {
      [key in 'fees' | 'taxes' | 'regulation' | 'lagfart']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  fastighetsbildningTerms: {
    condition?: {
      [key in 'kringkostnader' | 'taxes' | 'regulation']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  otherTerms: {
    condition?: {
      [key in 'inspected' | 'asis' | 'fees' | 'keys' | 'deedPaidByBuyer']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  signatureTerms: {
    condition?: {
      [key in 'emptyRowSeller' | 'emptyRowBuyer' | 'example']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
}

export type KopeAvtalsData = BaseContract & {
  buyers: KopeavtalStakeholder[];
  sellers: KopeavtalStakeholder[];
  overlatelseforklaring: string;
  kopeskilling: string;
  tilltrade: string;
  markfororeningar: string;
  skog: string;
  forpliktelser: string;
  utgifter: string;
  fastighetsbildning: string;
  other: string;
  signature: string;
};
