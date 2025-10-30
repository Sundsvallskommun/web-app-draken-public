export interface AppConfig {
  applicationName: string;
  isCaseData: boolean;
  isSupportManagement: boolean;
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
}

export const appConfig: AppConfig = {
  applicationName: process.env.NEXT_PUBLIC_APPLICATION_NAME || 'appen',
  isCaseData: process.env.NEXT_PUBLIC_IS_CASEDATA === 'true',
  isSupportManagement: process.env.NEXT_PUBLIC_IS_SUPPORTMANAGEMENT === 'true',
  features: {
    useErrandExport: process.env.NEXT_PUBLIC_USE_ERRAND_EXPORT === 'true',
    useThreeLevelCategorization: process.env.NEXT_PUBLIC_USE_THREE_LEVEL_CATEGORIZATION === 'true',
    useTwoLevelCategorization: process.env.NEXT_PUBLIC_USE_TWO_LEVEL_CATEGORIZATION === 'true',
    useExplanationOfTheCause: process.env.NEXT_PUBLIC_USE_EXPLANATION_OF_THE_CAUSE === 'true',
    useReasonForContact: process.env.NEXT_PUBLIC_USE_REASON_FOR_CONTACT === 'true',
    useBusinessCase: process.env.NEXT_PUBLIC_USE_BUSINESS_CASE === 'true',
    useBilling: process.env.NEXT_PUBLIC_USE_BILLING === 'true',
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
    useRelations: process.env.NEXT_PUBLIC_USE_RELATIONS === 'true', //Temporary
    useMyPages: process.env.NEXT_PUBLIC_USE_MY_PAGES === 'true',
  },
};
