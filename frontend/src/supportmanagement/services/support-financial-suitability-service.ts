import { SupportErrand } from './support-errand-service';

export interface SupportFinancingSource {
  kind: string;
  amount: string;
  lender: string;
}

interface FinancingEntry {
  bank?: string;
  lender?: string;
  loanType?: string;
  amountSek?: string;
}

const applicationOf = (errand: SupportErrand | undefined): Record<string, unknown> | undefined =>
  (errand?.jsonParameters ?? []).map((parameter) => parameter.value).find(Boolean) as
    | Record<string, unknown>
    | undefined;

const entriesUnder = (application: Record<string, unknown> | undefined, key: string): FinancingEntry[] =>
  Array.isArray(application?.[key]) ? (application[key] as FinancingEntry[]) : [];

export const supportFinancingAmount = (amountSek: string | undefined): string => {
  const given = (amountSek ?? '').trim();
  const digits = given.replace(/\s/g, '');
  if (!given) return '';
  return /^\d+$/.test(digits) ? `${Number(digits).toLocaleString('sv-SE')} kr` : given;
};

export const supportFinancingSourcesOf = (
  application: Record<string, unknown> | undefined
): SupportFinancingSource[] => {
  const sourcesOf = (key: string, kind: string): SupportFinancingSource[] =>
    entriesUnder(application, key).map((entry) => ({
      kind: entry.loanType?.trim() || kind,
      amount: supportFinancingAmount(entry.amountSek),
      lender: (entry.bank ?? entry.lender ?? '').trim(),
    }));

  return [
    ...sourcesOf('ownFunds', 'Egna medel'),
    ...sourcesOf('bankLoans', 'Banklån'),
    ...sourcesOf('privateLoans', 'Privatlån'),
    ...sourcesOf('otherFinancing', 'Annan finansiering'),
  ];
};

export const supportFinancingSources = (errand: SupportErrand | undefined): SupportFinancingSource[] =>
  supportFinancingSourcesOf(applicationOf(errand));

export const supportFinancingNotesOf = (application: Record<string, unknown> | undefined): string =>
  ((application?.financingNotes as string) ?? '').trim();

export const supportFinancingNotes = (errand: SupportErrand | undefined): string =>
  supportFinancingNotesOf(applicationOf(errand));

export const supportFinancingSourceLine = (source: SupportFinancingSource): string =>
  [source.kind, source.amount].filter(Boolean).join(' ') + (source.lender ? ` (${source.lender})` : '');
