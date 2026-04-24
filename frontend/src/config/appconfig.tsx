import { FeatureFlagDto } from 'src/data-contracts/backend/data-contracts';


export interface AppConfig {
  applicationName: string;
  isCaseData: boolean;
  isSupportManagement: boolean;
  reopenSupportErrandLimit: string;
  features: AppConfigFeatures;
}

interface AppConfigFeatures {
  useErrandExport: boolean;
  useThreeLevelCategorization: boolean;
  useTwoLevelCategorization: boolean;
  useExplanationOfTheCause: boolean;
  useReasonForContact: boolean;
  useBusinessCase: boolean;
  useBilling: boolean;
  useContracts: boolean;
  useFacilities: boolean;
  useExtraInformationStakeholders: boolean;
  useDepartmentEscalation: boolean;
  useEmployeeSearch: boolean;
  useOrganizationStakeholders: boolean;
  useRecruitment: boolean;
  useEmailContactChannel: boolean;
  useSmsContactChannel: boolean;
  useStakeholderRelations: boolean;
  useRolesForStakeholders: boolean;
  useDetailsTab: boolean;
  useEscalation: boolean;
  useRequireContactChannel: boolean;
  useRelations: boolean;
  useMyPages: boolean;
  useUiPhases: boolean;
  useClosingMessageCheckbox: boolean;
  useMultipleContactChannels: boolean;
  useClosedAsDefaultResolution: boolean;
}

// JSON.parse prevents the minifier from folding placeholder comparisons at build time.
// This ensures entrypoint.sh can replace placeholders in the built files at runtime.
const envBool = (val: string | undefined): boolean => {
  try {
    return JSON.parse(val || 'false') === true;
  } catch {
    return false;
  }
};

export const appConfig: AppConfig = {
  applicationName: import.meta.env.VITE_APPLICATION_NAME || 'appen',
  isCaseData: envBool(import.meta.env.VITE_IS_CASEDATA),
  isSupportManagement: envBool(import.meta.env.VITE_IS_SUPPORTMANAGEMENT),
  reopenSupportErrandLimit: import.meta.env.VITE_REOPEN_SUPPORT_ERRAND_LIMIT || '30',
  features: {
    useErrandExport: envBool(import.meta.env.VITE_USE_ERRAND_EXPORT),
    useThreeLevelCategorization: envBool(import.meta.env.VITE_USE_THREE_LEVEL_CATEGORIZATION),
    useTwoLevelCategorization: envBool(import.meta.env.VITE_USE_TWO_LEVEL_CATEGORIZATION),
    useExplanationOfTheCause: envBool(import.meta.env.VITE_USE_EXPLANATION_OF_THE_CAUSE),
    useReasonForContact: envBool(import.meta.env.VITE_USE_REASON_FOR_CONTACT),
    useBusinessCase: envBool(import.meta.env.VITE_USE_BUSINESS_CASE),
    useBilling: envBool(import.meta.env.VITE_USE_BILLING),
    useContracts: envBool(import.meta.env.VITE_USE_CONTRACTS),
    useFacilities: envBool(import.meta.env.VITE_USE_FACILITIES),
    useExtraInformationStakeholders: envBool(import.meta.env.VITE_USE_EXTRA_INFORMATION_STAKEHOLDERS),
    useDepartmentEscalation: envBool(import.meta.env.VITE_USE_DEPARTMENT_ESCALATION),
    useEmployeeSearch: envBool(import.meta.env.VITE_USE_EMPLOYEE_SEARCH),
    useOrganizationStakeholders: envBool(import.meta.env.VITE_USE_ORGANIZATION_STAKEHOLDER),
    useRecruitment: envBool(import.meta.env.VITE_USE_RECRUITMENT),
    useEmailContactChannel: envBool(import.meta.env.VITE_USE_EMAIL_CONTACT_CHANNEL),
    useSmsContactChannel: envBool(import.meta.env.VITE_USE_SMS_CONTACT_CHANNEL),
    useStakeholderRelations: envBool(import.meta.env.VITE_USE_STAKEHOLDER_RELATIONS),
    useRolesForStakeholders: envBool(import.meta.env.VITE_USE_ROLES_FOR_STAKEHOLDERS),
    useDetailsTab: envBool(import.meta.env.VITE_USE_DETAILS_TAB),
    useEscalation: envBool(import.meta.env.VITE_USE_ESCALATION),
    useRequireContactChannel: envBool(import.meta.env.VITE_USE_REQUIRE_CONTACT_CHANNEL),
    useRelations: envBool(import.meta.env.VITE_USE_RELATIONS),
    useMyPages: envBool(import.meta.env.VITE_USE_MY_PAGES),
    useUiPhases: envBool(import.meta.env.VITE_USE_UI_PHASES),
    useClosingMessageCheckbox: envBool(import.meta.env.VITE_USE_CLOSING_MESSAGE_CHECKBOX),
    useMultipleContactChannels: envBool(import.meta.env.VITE_USE_MULTIPLE_CONTACT_CHANNELS),
    useClosedAsDefaultResolution: envBool(import.meta.env.VITE_USE_CLOSED_AS_DEFAULT_RESOLUTION),
  },
};

function resetAllFlagsToFalse() {
  appConfig.isCaseData = false;
  appConfig.isSupportManagement = false;
  appConfig.reopenSupportErrandLimit = '30';

  (Object.keys(appConfig.features) as (keyof AppConfigFeatures)[]).forEach((key) => {
    appConfig.features[key] = false;
  });
}

export function applyRuntimeFeatureFlags(flags: FeatureFlagDto[]) {
  if (!flags || flags.length === 0) {
    return;
  }

  resetAllFlagsToFalse();

  flags.forEach((flag) => {
    if (
      !(flag.name in appConfig.features) &&
      flag.name !== 'isCaseData' &&
      flag.name !== 'isSupportManagement' &&
      flag.name !== 'reopenSupportErrandLimit'
    ) {
      console.warn('Unknown feature flag from backend:', flag.name);
      return;
    }

    if (flag.name === 'isCaseData') {
      appConfig.isCaseData = flag.enabled;
      return;
    }

    if (flag.name === 'isSupportManagement') {
      appConfig.isSupportManagement = flag.enabled;
      return;
    }

    if (flag.name === 'reopenSupportErrandLimit' && flag.enabled) {
      appConfig.reopenSupportErrandLimit = flag.value ?? '30';
      return;
    }

    if (flag.name in appConfig.features) {
      appConfig.features[flag.name as keyof AppConfigFeatures] = flag.enabled;
    }
  });
}
