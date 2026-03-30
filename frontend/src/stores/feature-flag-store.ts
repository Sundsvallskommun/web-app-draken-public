import { create } from 'zustand';
import { FeatureFlagDto } from 'src/data-contracts/backend/data-contracts';

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

interface FeatureFlagStore {
  isCaseData: boolean;
  isSupportManagement: boolean;
  reopenSupportErrandLimit: string;
  features: AppConfigFeatures;
  applyFlags: (flags: FeatureFlagDto[]) => void;
}

const defaultFeatures: AppConfigFeatures = {
  useErrandExport: process.env.NEXT_PUBLIC_USE_ERRAND_EXPORT === 'true',
  useThreeLevelCategorization: process.env.NEXT_PUBLIC_USE_THREE_LEVEL_CATEGORIZATION === 'true',
  useTwoLevelCategorization: process.env.NEXT_PUBLIC_USE_TWO_LEVEL_CATEGORIZATION === 'true',
  useExplanationOfTheCause: process.env.NEXT_PUBLIC_USE_EXPLANATION_OF_THE_CAUSE === 'true',
  useReasonForContact: process.env.NEXT_PUBLIC_USE_REASON_FOR_CONTACT === 'true',
  useBusinessCase: process.env.NEXT_PUBLIC_USE_BUSINESS_CASE === 'true',
  useBilling: process.env.NEXT_PUBLIC_USE_BILLING === 'true',
  useContracts: process.env.NEXT_PUBLIC_USE_CONTRACTS === 'true',
  useFacilities: process.env.NEXT_PUBLIC_USE_FACILITIES === 'true',
  useExtraInformationStakeholders: process.env.NEXT_PUBLIC_USE_EXTRA_INFORMATION_STAKEHOLDERS === 'true',
  useDepartmentEscalation: process.env.NEXT_PUBLIC_USE_DEPARTMENT_ESCALATION === 'true',
  useEmployeeSearch: process.env.NEXT_PUBLIC_USE_EMPLOYEE_SEARCH === 'true',
  useOrganizationStakeholders: process.env.NEXT_PUBLIC_USE_ORGANIZATION_STAKEHOLDER === 'true',
  useRecruitment: process.env.NEXT_PUBLIC_USE_RECRUITMENT === 'true',
  useEmailContactChannel: process.env.NEXT_PUBLIC_USE_EMAIL_CONTACT_CHANNEL === 'true',
  useSmsContactChannel: process.env.NEXT_PUBLIC_USE_SMS_CONTACT_CHANNEL === 'true',
  useStakeholderRelations: process.env.NEXT_PUBLIC_USE_STAKEHOLDER_RELATIONS === 'true',
  useRolesForStakeholders: process.env.NEXT_PUBLIC_USE_ROLES_FOR_STAKEHOLDERS === 'true',
  useDetailsTab: process.env.NEXT_PUBLIC_USE_DETAILS_TAB === 'true',
  useEscalation: process.env.NEXT_PUBLIC_USE_ESCALATION === 'true',
  useRequireContactChannel: process.env.NEXT_PUBLIC_USE_REQUIRE_CONTACT_CHANNEL === 'true',
  useRelations: process.env.NEXT_PUBLIC_USE_RELATIONS === 'true',
  useMyPages: process.env.NEXT_PUBLIC_USE_MY_PAGES === 'true',
  useUiPhases: process.env.NEXT_PUBLIC_USE_UI_PHASES === 'true',
  useClosingMessageCheckbox: process.env.NEXT_PUBLIC_USE_CLOSING_MESSAGE_CHECKBOX === 'true',
  useMultipleContactChannels: process.env.NEXT_PUBLIC_USE_MULTIPLE_CONTACT_CHANNELS === 'true',
  useClosedAsDefaultResolution: process.env.NEXT_PUBLIC_USE_CLOSED_AS_DEFAULT_RESOLUTION === 'true',
};

export const useFeatureFlagStore = create<FeatureFlagStore>((set) => ({
  isCaseData: process.env.NEXT_PUBLIC_IS_CASEDATA === 'true',
  isSupportManagement: process.env.NEXT_PUBLIC_IS_SUPPORTMANAGEMENT === 'true',
  reopenSupportErrandLimit: process.env.NEXT_PUBLIC_REOPEN_SUPPORT_ERRAND_LIMIT || '30',
  features: defaultFeatures,
  applyFlags: (flags) => {
    if (!flags || flags.length === 0) return;

    const resetFeatures: AppConfigFeatures = Object.fromEntries(
      Object.keys(defaultFeatures).map((key) => [key, false])
    ) as unknown as AppConfigFeatures;

    let isCaseData = false;
    let isSupportManagement = false;
    let reopenSupportErrandLimit = '30';

    flags.forEach((flag) => {
      if (flag.name === 'isCaseData') {
        isCaseData = flag.enabled;
      } else if (flag.name === 'isSupportManagement') {
        isSupportManagement = flag.enabled;
      } else if (flag.name === 'reopenSupportErrandLimit' && flag.enabled) {
        reopenSupportErrandLimit = flag.value ?? '30';
      } else if (flag.name in resetFeatures) {
        (resetFeatures as any)[flag.name] = flag.enabled;
      }
    });

    set({
      isCaseData,
      isSupportManagement,
      reopenSupportErrandLimit,
      features: resetFeatures,
    });
  },
}));
