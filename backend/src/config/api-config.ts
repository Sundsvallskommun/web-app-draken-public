//Subscribed APIS as lowercased
export const APIS = [
  {
    name: 'activedirectory',
    version: '2.0',
  },
  {
    name: 'contract',
    version: '2.1',
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
    version: '2.0',
  },
  {
    name: 'templating',
    version: '2.0',
  },
  {
    name: 'messaging',
    version: '7.3',
  },
  {
    name: 'case-data',
    version: '11.5',
  },
  {
    name: 'supportmanagement',
    version: '10.6',
  },
  {
    name: 'businessengagements',
    version: '3.0',
  },
  {
    name: 'billingpreprocessor',
    version: '4.0',
  },
  {
    name: 'legalentity',
    version: '2.0',
  },
  {
    name: 'relations',
    version: '1.0',
  },
  {
    name: 'casestatus',
    version: '4.0',
  },
];

export function apiServiceName(name: string): string {
  const api = APIS.find(a => a.name === name);
  return api ? `${api.name}/${api.version}` : name;
}
