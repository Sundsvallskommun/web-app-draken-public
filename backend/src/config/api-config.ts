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
    version: '14.9',
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

const serviceOverrideEnvKeys: Record<string, string> = {
  supportmanagement: 'SUPPORTMANAGEMENT_SERVICE',
};

const getServiceOverride = (name: string): string | undefined => {
  const envKey = serviceOverrideEnvKeys[name];
  if (!envKey) return undefined;
  return process.env[envKey]?.trim() || undefined;
};

export const apiServiceName = (name: string): string => {
  const override = getServiceOverride(name);
  if (override) return override;
  const api = APIS.find(a => a.name === name);
  return api ? `${api.name}/${api.version}` : name;
};
