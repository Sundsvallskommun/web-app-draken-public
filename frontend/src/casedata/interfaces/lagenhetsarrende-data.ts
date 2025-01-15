import { BaseContract } from '@casedata/services/contract-service';
import { CasedataOwnerOrContact } from './stakeholder';

export type LagenhetsArrendeStakeholder = Omit<Omit<CasedataOwnerOrContact, 'personId'>, 'stakeholderType'> & {
  partyId: string;
  partOwnership?: string;
  type: 'PERSON' | 'COMPANY' | 'ASSOCIATION';
};

export interface LagenhetsArendeTemplate {
  omradeTerms: {
    areaType: 'land' | 'landAndWater';
    propertiesInvolved: string[];
    areaSize: string;
    mapAttachments?: string;
    mapAttachmentReference?: string;
    condition?: {
      [key in 'areaType' | 'propertiesInvolved' | 'areaSize' | 'mapAttachments' | 'mapAttachmentReference']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  andamalTerms: {
    clarification: string;
    bygglovExists: 'true' | 'false';
    condition?: {
      [key in
        | 'byggnad'
        | 'batplats'
        | 'idrattsandamal'
        | 'led'
        | 'parkering'
        | 'skylt'
        | 'snotipp'
        | 'tomtkomplement'
        | 'upplag'
        | 'uppstallning'
        | 'ytjordvarme'
        | 'vag'
        | 'atervinningsstation'
        | 'other'
        | 'clarification'
        | 'bygglovExists'
        | 'consent'
        | 'detailedplan']: {
        header: string;
        conditionText?: string;
      };
    };
  };
  arrendetidTerms: {
    startDate: string;
    endDate: string;
    monthsNotice: string;
    autoRenewal: string;
    condition?: {
      [key in 'extension' | 'end' | 'termination']: {
        header: string;
        conditionText?: string;
      };
    };
  };
  arrendeavgiftTerms: {
    yearly: 'true' | 'false';
    byYear: 'true' | 'false';
    byLease: 'true' | 'false';
    indexAdjustedFee: 'true' | 'false';
    period: 'yearly' | 'byYear' | 'byLease' | 'indexAdjustedFee' | 'prepaid';
    prepaid: 'true' | 'false';
    yearlyFee?: number;
    feeByYear?: number;
    associatedFeeYear?: number;
    feeByLease?: number;
    indexYear?: number;
    indexFee?: number;
    yearOrQuarter?: 'year' | 'quarter';
    preOrPost?: 'pre' | 'post';
  };
  bygglovTerms: {
    condition?: {
      [key in 'permitFees' | 'buildingOwnership']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  overlatelseTerms: {
    condition?: {
      [key in 'subletting']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  inskrivningTerms: {
    condition?: {
      [key in 'inskrivning']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  skickTerms: {
    condition?: {
      [key in 'nuisance' | 'accessibility']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  ledningarTerms: {
    condition?: {
      [key in 'ledningar']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  kostnaderTerms: {
    condition?: {
      [key in 'kostnader']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  markfororeningarTerms: {
    condition?: {
      [key in 'pollutionAvoidance' | 'verificationResponsibility' | 'testDone' | 'testingAtTransfer' | 'testingAtEnd']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  upphorandeTerms: {
    noRefundLeaseFeeAmount: number;
    condition?: {
      [key in
        | 'restorationCleaning'
        | 'restorationBuildingRemoval'
        | 'noRefundLeaseFee'
        | 'inspectionRequirements'
        | 'inspectionLandWater']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  skadaansvarTerms: {
    condition?: {
      [key in 'skadeaterstallning' | 'skadestandsskyldighet' | 'befrielse' | 'begransning' | 'anpassat']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  sarskildaTerms: {
    condition?: {
      [key in 'sarskilda']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  jordabalkenTerms: {
    condition?: {
      [key in 'jordabalken' | 'replaces']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
  signatureTerms: {
    condition?: {
      [key in 'emptyRowPropertyowner' | 'emptyRowLeaseholder' | 'example']:
        | {
            header: string;
            conditionText?: string;
          }
        | undefined;
    };
  };
}

export type LagenhetsArrendeData = BaseContract & {
  leaseholders?: LagenhetsArrendeStakeholder[];
  grantors?: LagenhetsArrendeStakeholder[];
  omrade: string;
  andamal: string;
  arrendetid: string;
  arrendeavgift: string;
  bygglov: string;
  overlatelse: string;
  inskrivning: string;
  skick: string;
  ledningar: string;
  kostnader: string;
  markfororeningar: string;
  upphorande: string;
  skadaansvar: string;
  sarskilda: string;
  jordabalken: string;
  signature: string;
};

export interface Stakeholder {
  name: string;
  ssn?: string; // Social Security Number or equivalent identifier
  address: {
    street: string;
    city: string;
    zip: string;
  };
  ownershipShare?: number;
}

export interface FeeCondition {
  feeType: 'annual' | 'byYear' | 'byLease' | 'feePaid' | 'indexAdjustedFee';
  amount?: number;
  period?: string;
  indexYear?: number;
}

export interface MaintenanceCondition {
  type: 'cleaning' | 'accessibility' | 'beachAccess';
  details: string;
}

export interface PollutionCondition {
  type: 'avoidance' | 'verification' | 'testing';
  details: string;
}

export interface RestorationCondition {
  type: 'cleanup' | 'buildingRemoval' | 'noRefund';
  details: string;
  refundAmount?: number;
}

export interface DamageLiabilityCondition {
  type: 'restoration' | 'thirdPartyClaims' | 'exemption';
  details: string;
}
