//Subscribed APIS as lowercased
export const APIS = [
  {
    name: 'activedirectory',
    version: '2.0',
  },
  {
    name: 'contract',
    version: '6.0',
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
    version: '2.0',
  },
  {
    name: 'messaging',
    version: '7.10',
  },
  {
    name: 'case-data',
    version: '11.10',
  },
  {
    name: 'supportmanagement',
    version: '12.7',
  },
  {
    name: 'billingpreprocessor',
    version: '4.3',
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
    version: '2.0',
  },
  {
    name: 'partyassets',
    version: '4.0',
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

export function apiServiceName(name: string): string {
  const api = APIS.find(a => a.name === name);
  return api ? `${api.name}/${api.version}` : name;
}
