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
  applicationName: process.env.NEXT_PUBLIC_APPLICATION_NAME || 'appen',
  isCaseData: envBool(process.env.NEXT_PUBLIC_IS_CASEDATA),
  isSupportManagement: envBool(process.env.NEXT_PUBLIC_IS_SUPPORTMANAGEMENT),
  reopenSupportErrandLimit: process.env.NEXT_PUBLIC_REOPEN_SUPPORT_ERRAND_LIMIT || '30',
  features: {
    useErrandExport: envBool(process.env.NEXT_PUBLIC_USE_ERRAND_EXPORT),
    useThreeLevelCategorization: envBool(process.env.NEXT_PUBLIC_USE_THREE_LEVEL_CATEGORIZATION),
    useTwoLevelCategorization: envBool(process.env.NEXT_PUBLIC_USE_TWO_LEVEL_CATEGORIZATION),
    useExplanationOfTheCause: envBool(process.env.NEXT_PUBLIC_USE_EXPLANATION_OF_THE_CAUSE),
    useReasonForContact: envBool(process.env.NEXT_PUBLIC_USE_REASON_FOR_CONTACT),
    useBusinessCase: envBool(process.env.NEXT_PUBLIC_USE_BUSINESS_CASE),
    useBilling: envBool(process.env.NEXT_PUBLIC_USE_BILLING),
    useContracts: envBool(process.env.NEXT_PUBLIC_USE_CONTRACTS),
    useFacilities: envBool(process.env.NEXT_PUBLIC_USE_FACILITIES),
    useExtraInformationStakeholders: envBool(process.env.NEXT_PUBLIC_USE_EXTRA_INFORMATION_STAKEHOLDERS),
    useDepartmentEscalation: envBool(process.env.NEXT_PUBLIC_USE_DEPARTMENT_ESCALATION),
    useEmployeeSearch: envBool(process.env.NEXT_PUBLIC_USE_EMPLOYEE_SEARCH),
    useOrganizationStakeholders: envBool(process.env.NEXT_PUBLIC_USE_ORGANIZATION_STAKEHOLDER),
    useRecruitment: envBool(process.env.NEXT_PUBLIC_USE_RECRUITMENT),
    useEmailContactChannel: envBool(process.env.NEXT_PUBLIC_USE_EMAIL_CONTACT_CHANNEL),
    useSmsContactChannel: envBool(process.env.NEXT_PUBLIC_USE_SMS_CONTACT_CHANNEL),
    useStakeholderRelations: envBool(process.env.NEXT_PUBLIC_USE_STAKEHOLDER_RELATIONS),
    useRolesForStakeholders: envBool(process.env.NEXT_PUBLIC_USE_ROLES_FOR_STAKEHOLDERS),
    useDetailsTab: envBool(process.env.NEXT_PUBLIC_USE_DETAILS_TAB),
    useEscalation: envBool(process.env.NEXT_PUBLIC_USE_ESCALATION),
    useRequireContactChannel: envBool(process.env.NEXT_PUBLIC_USE_REQUIRE_CONTACT_CHANNEL),
    useRelations: envBool(process.env.NEXT_PUBLIC_USE_RELATIONS),
    useMyPages: envBool(process.env.NEXT_PUBLIC_USE_MY_PAGES),
    useUiPhases: envBool(process.env.NEXT_PUBLIC_USE_UI_PHASES),
    useClosingMessageCheckbox: envBool(process.env.NEXT_PUBLIC_USE_CLOSING_MESSAGE_CHECKBOX),
    useMultipleContactChannels: envBool(process.env.NEXT_PUBLIC_USE_MULTIPLE_CONTACT_CHANNELS),
    useClosedAsDefaultResolution: envBool(process.env.NEXT_PUBLIC_USE_CLOSED_AS_DEFAULT_RESOLUTION),
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
