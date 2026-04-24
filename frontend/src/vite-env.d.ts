/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APPLICATION: string;
  readonly VITE_APPLICATION_NAME: string;
  readonly VITE_APP_URL: string;
  readonly VITE_BASEPATH: string;
  readonly VITE_ENVIRONMENT: string;
  readonly VITE_INVOICE_BREAK_DATE: string;
  readonly VITE_IS_CASEDATA: string;
  readonly VITE_IS_SUPPORTMANAGEMENT: string;
  readonly VITE_MATOMO_SITE_ID: string;
  readonly VITE_MATOMO_URL: string;
  readonly VITE_MUNICIPALITY_ID: string;
  readonly VITE_PROTECTED_ROUTES: string;
  readonly VITE_REOPEN_SUPPORT_ERRAND_LIMIT: string;
  readonly VITE_SHOW_DEPLOY_INFO: string;
  readonly VITE_USE_BILLING: string;
  readonly VITE_USE_BUSINESS_CASE: string;
  readonly VITE_USE_CLOSED_AS_DEFAULT_RESOLUTION: string;
  readonly VITE_USE_CLOSING_MESSAGE_CHECKBOX: string;
  readonly VITE_USE_CONTRACTS: string;
  readonly VITE_USE_DEPARTMENT_ESCALATION: string;
  readonly VITE_USE_DETAILS_TAB: string;
  readonly VITE_USE_EMAIL_CONTACT_CHANNEL: string;
  readonly VITE_USE_EMPLOYEE_SEARCH: string;
  readonly VITE_USE_ERRAND_EXPORT: string;
  readonly VITE_USE_ESCALATION: string;
  readonly VITE_USE_EXPLANATION_OF_THE_CAUSE: string;
  readonly VITE_USE_EXTRA_INFORMATION_STAKEHOLDERS: string;
  readonly VITE_USE_FACILITIES: string;
  readonly VITE_USE_MULTIPLE_CONTACT_CHANNELS: string;
  readonly VITE_USE_MY_PAGES: string;
  readonly VITE_USE_ORGANIZATION_STAKEHOLDER: string;
  readonly VITE_USE_REASON_FOR_CONTACT: string;
  readonly VITE_USE_RECRUITMENT: string;
  readonly VITE_USE_RELATIONS: string;
  readonly VITE_USE_REQUIRE_CONTACT_CHANNEL: string;
  readonly VITE_USE_ROLES_FOR_STAKEHOLDERS: string;
  readonly VITE_USE_SMS_CONTACT_CHANNEL: string;
  readonly VITE_USE_STAKEHOLDER_RELATIONS: string;
  readonly VITE_USE_THREE_LEVEL_CATEGORIZATION: string;
  readonly VITE_USE_TWO_LEVEL_CATEGORIZATION: string;
  readonly VITE_USE_UI_PHASES: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
