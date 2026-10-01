export interface SupportStatementCounterparty {
  name: string;
  key: string;
}

export const SUPPORT_STATEMENT_COUNTERPARTIES: SupportStatementCounterparty[] = [
  { name: 'Polismyndigheten', key: 'POLICE' },
  { name: 'Skatteverket', key: 'TAX_AGENCY' },
  { name: 'Kronofogden', key: 'ENFORCEMENT_AUTHORITY' },
  { name: 'Medelpads Räddningstjänstförbund', key: 'RESCUE_SERVICE' },
  { name: 'Miljökontoret', key: 'ENVIRONMENT_OFFICE' },
  { name: 'Kreditupplysning (Syna)', key: 'CREDIT_REPORT' },
];

export const supportStatementCounterpartyKey = (counterpartyName: string | undefined): string | undefined =>
  SUPPORT_STATEMENT_COUNTERPARTIES.find((candidate) => candidate.name === counterpartyName)?.key;
