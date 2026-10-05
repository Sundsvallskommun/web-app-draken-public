export interface SupportStatementCounterparty {
  name: string;
  key: string;
  street?: string;
  postalAddress?: string;
}

export const SUPPORT_STATEMENT_COUNTERPARTIES: SupportStatementCounterparty[] = [
  { name: 'Polismyndigheten', key: 'POLICE' },
  { name: 'Skatteverket', key: 'TAX_AGENCY' },
  { name: 'Kronofogden', key: 'ENFORCEMENT_AUTHORITY', street: 'Box 1050', postalAddress: '172 21 Sundbyberg' },
  {
    name: 'Medelpads Räddningstjänstförbund',
    key: 'RESCUE_SERVICE',
    street: 'Box 1',
    postalAddress: '851 02 Sundsvall',
  },
  { name: 'Miljökontoret', key: 'ENVIRONMENT_OFFICE' },
  { name: 'Kreditupplysning (Syna)', key: 'CREDIT_REPORT' },
];

export const supportStatementCounterparty = (
  counterpartyName: string | undefined
): SupportStatementCounterparty | undefined =>
  SUPPORT_STATEMENT_COUNTERPARTIES.find((candidate) => candidate.name === counterpartyName);

export const supportStatementCounterpartyKey = (counterpartyName: string | undefined): string | undefined =>
  supportStatementCounterparty(counterpartyName)?.key;
