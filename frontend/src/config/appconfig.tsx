import { logClientWarning } from '@common/services/client-diagnostics';
import { FeatureFlagDto } from 'src/data-contracts/backend/data-contracts';

export class FeatureFlagConfigurationError extends Error {
  constructor() {
    super('Utredningens tidigare variantflaggor måste migreras innan applikationen kan användas.');
    this.name = 'FeatureFlagConfigurationError';
  }
}

export interface AppConfig {
  applicationName: string;
  readonly isCaseData: boolean;
  readonly isSupportManagement: boolean;
  reopenSupportErrandLimit: string;
  features: AppConfigFeatures;
}

export interface AppConfigFeatures {
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
  useEmployeeSearchOnly: boolean;
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
  useServices: boolean;
  useAppeal: boolean;
  useHandover: boolean;
  useInvestigation: boolean;
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

const buildDomain = process.env.DRAKEN_BUILD_DOMAIN;

export const appConfig: AppConfig = {
  applicationName: process.env.NEXT_PUBLIC_APPLICATION_NAME || 'appen',
  // Next bakes the catalog's domain into this application. Getters also prevent runtime writes.
  get isCaseData() {
    return buildDomain === 'casedata';
  },
  get isSupportManagement() {
    return buildDomain === 'supportmanagement';
  },
  reopenSupportErrandLimit: process.env.NEXT_PUBLIC_REOPEN_SUPPORT_ERRAND_LIMIT || '30',
  features: {
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
    useEmployeeSearchOnly: envBool(process.env.NEXT_PUBLIC_USE_EMPLOYEE_SEARCH_ONLY),
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
    useServices: envBool(process.env.NEXT_PUBLIC_USE_SERVICES),
    useAppeal: envBool(process.env.NEXT_PUBLIC_USE_APPEAL),
    useHandover: envBool(process.env.NEXT_PUBLIC_USE_HANDOVER),
    useInvestigation: envBool(process.env.NEXT_PUBLIC_USE_INVESTIGATION),
  },
};

function resetRuntimeFeatures() {
  appConfig.reopenSupportErrandLimit = '30';

  (Object.keys(appConfig.features) as (keyof AppConfigFeatures)[]).forEach((key) => {
    appConfig.features[key] = false;
  });
}

export function applyRuntimeFeatureFlags(flags: FeatureFlagDto[]) {
  if (!flags || flags.length === 0) {
    return;
  }

  if (flags.some((flag) => ['useAvvikelseInvestigation', 'useAotInvestigation'].includes(flag.name))) {
    throw new FeatureFlagConfigurationError();
  }
  resetRuntimeFeatures();

  flags.forEach((flag) => {
    // Adminpanel already persisted these domain rows before per-dragon builds existed. They are
    // obsolete configuration, not capabilities; partial or stale rows cannot replace the build.
    if (flag.name === 'isCaseData' || flag.name === 'isSupportManagement') return;

    if (!Object.hasOwn(appConfig.features, flag.name) && flag.name !== 'reopenSupportErrandLimit') {
      logClientWarning('config.appconfig.applyRuntimeFeatureFlags');
      return;
    }

    if (flag.name === 'reopenSupportErrandLimit' && flag.enabled) {
      appConfig.reopenSupportErrandLimit = flag.value ?? '30';
      return;
    }

    if (Object.hasOwn(appConfig.features, flag.name)) {
      appConfig.features[flag.name as keyof AppConfigFeatures] = flag.enabled;
    }
  });
}
