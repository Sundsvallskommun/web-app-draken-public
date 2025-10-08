export interface FeatureFlags {
  useErrandExport: boolean;
  useBilling: boolean;
  useThreeLevelCategorization: boolean;
  useTwoLevelCategorization: boolean;
  useExplanationOfTheCause: boolean;
  useReasonForContact: boolean;
  useBusinessCase: boolean;
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
  isCaseData: boolean;
  isSupportManagement: boolean;
}

export const defaultFeatureFlags: FeatureFlags = {
  useErrandExport: false,
  useBilling: false,
  useThreeLevelCategorization: false,
  useTwoLevelCategorization: false,
  useExplanationOfTheCause: false,
  useReasonForContact: false,
  useBusinessCase: false,
  useFacilities: false,
  useExtraInformationStakeholders: false,
  useDepartmentEscalation: false,
  useEmployeeSearch: false,
  useOrganizationStakeholders: false,
  useRecruitment: false,
  useEmailContactChannel: false,
  useSmsContactChannel: false,
  useStakeholderRelations: false,
  useRolesForStakeholders: false,
  useDetailsTab: false,
  useEscalation: false,
  useRequireContactChannel: false,
  useRelations: false,
  useMyPages: false,
  isCaseData: false,
  isSupportManagement: false,
};
