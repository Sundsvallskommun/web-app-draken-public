//Subscribed APIS as lowercased
export const APIS = [
  {
    name: 'activedirectory',
    version: '2.0',
  },
  {
    name: 'contract',
    version: '9.0',
  },
  {
    name: 'citizen',
    version: '3.0',
  },
  {
    name: 'employee',
    version: '2.0',
  },
  {
    name: 'estateinfo',
    version: '2.2',
  },
  {
    name: 'templating',
    version: '2.1',
  },
  {
    name: 'messaging',
    version: '7.10',
  },
  {
    name: 'case-data',
    version: '13.0',
  },
  {
    name: 'supportmanagement',
    version: '15.1',
  },
  {
    name: 'supportmanagement-sprint',
    version: '15.1',
    // Runtime transport target only. Application code imports the stable
    // Support Management facade, so generating a second unused contract would
    // create two competing TypeScript owners for the same domain.
    generateDataContract: false,
  },
  {
    name: 'support-management-alkt-sprint',
    version: '15.1',
    // Runtime transport target only. Application code imports the stable
    // Support Management facade, so generating a second unused contract would
    // create two competing TypeScript owners for the same domain.
    generateDataContract: false,
  },
  {
    name: 'billingpreprocessor',
    version: '4.5',
  },
  {
    name: 'billing-data-collector',
    version: '2.1',
  },
  {
    name: 'legalentity',
    version: '2.0',
  },
  {
    name: 'relations',
    version: '1.1',
  },
  {
    name: 'casestatus',
    version: '4.3',
  },
  {
    name: 'party',
    version: '2.1',
  },
  {
    name: 'partyassets',
    version: '6.5',
  },
  {
    name: 'jsonschema',
    version: '1.0',
  },
  {
    name: 'company',
    version: '1.0',
  },
];

export const SUPPORT_MANAGEMENT_API_TARGETS = ['stable', 'sprint', 'alktsprint'] as const;

export type SupportManagementApiTarget = (typeof SUPPORT_MANAGEMENT_API_TARGETS)[number];

const SUPPORT_MANAGEMENT_SERVICE_BY_TARGET: Readonly<Record<SupportManagementApiTarget, string>> = {
  stable: 'supportmanagement',
  sprint: 'supportmanagement-sprint',
  alktsprint: 'support-management-alkt-sprint',
};

export const resolveSupportManagementApiTarget = (configuredTarget = process.env.SUPPORTMANAGEMENT_API_TARGET): SupportManagementApiTarget => {
  const target = configuredTarget?.trim().toLowerCase() || 'stable';
  if ((SUPPORT_MANAGEMENT_API_TARGETS as readonly string[]).includes(target)) {
    return target as SupportManagementApiTarget;
  }

  throw new Error(`Unsupported SUPPORTMANAGEMENT_API_TARGET "${configuredTarget}". Expected one of: ${SUPPORT_MANAGEMENT_API_TARGETS.join(', ')}`);
};

export function apiServiceName(name: string): string {
  const resolvedName = name === 'supportmanagement' ? SUPPORT_MANAGEMENT_SERVICE_BY_TARGET[resolveSupportManagementApiTarget()] : name;
  const api = APIS.find(a => a.name === resolvedName);
  return api ? `${api.name}/${api.version}` : name;
}
