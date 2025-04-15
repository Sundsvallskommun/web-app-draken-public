import { isKC } from '@common/services/application-service';
import { AngeSymbol } from 'src/styles/ange-symbol';

export interface AppConfig {
  symbol: React.ReactNode | null;
  applicationName: string;
  features: AppConfigFeatures;
}

interface AppConfigFeatures {
  useThreeLevelCategorization: boolean;
  useTwoLevelCategorization: boolean;
  useExplanationOfTheCause: boolean;
  useReasonForContact: boolean;
  useBusinessCase: boolean;
  useBilling: boolean;
  useFacilites: boolean;
  useExtraInformationStakeholders: boolean;
  useDepartmentEscalation: boolean;
}

export const appConfig: AppConfig = {
  symbol: symbolByMunicipalityId(),
  applicationName: process.env.NEXT_PUBLIC_APPLICATION_NAME || 'appen',
  features: {
    useThreeLevelCategorization: process.env.USE_THREE_LEVEL_CATEGORIZATION === 'true',
    useTwoLevelCategorization: process.env.USE_TWO_LEVEL_CATEGORIZATION === 'true',
    useExplanationOfTheCause: process.env.USE_EXPLANATION_OF_THE_CAUSE === 'true',
    useReasonForContact: process.env.USE_REASON_FOR_CONTACT === 'true',
    useBusinessCase: process.env.USE_BUSINESS_CASE === 'true',
    useBilling: process.env.USE_BILLING === 'true',
    useFacilites: process.env.USE_FACILITES === 'true',
    useExtraInformationStakeholders: process.env.USE_EXTRA_INFORMATION_STAKEHOLDERS === 'true',
    useDepartmentEscalation: process.env.NEXT_PUBLIC_USE_DEPARTMENT_ESCALATION === 'true',
  },
};

export function symbolByMunicipalityId(): React.ReactNode {
  switch (process.env.NEXT_PUBLIC_MUNICIPALITY_ID) {
    case '2260': {
      //Ånge
      return <AngeSymbol />;
    }
    default: {
      //Sundsvall
      return null;
    }
  }
}
