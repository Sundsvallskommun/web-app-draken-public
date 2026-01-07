import dayjs from 'dayjs';
import { CAccountInformation } from 'src/data-contracts/backend/data-contracts';
import { invoiceData2025 } from './invoiceData-2025';
import { invoiceData2026 } from './invoiceData-2026';

export interface CustomerIdentity {
  companyId: number;
  displayOrder: number;
  name: string;
  counterpart: string;
}

export interface InternalCustomerIdentity extends CustomerIdentity {
  orgId: string[];
  customerId: number;
}

export interface ExternalCustomerIdentity extends CustomerIdentity {
  orgNr?: string;
  customerReference?: string;
  legalEntityAddressSource: 'address' | 'postAddress';
}

export interface InvoiceActivity {
  value: string | null;
  name: string;
  costCenter?: string;
  default: string;
}

export interface InvoiceRow {
  costPerUnit: number;
  description: string;
  visible: boolean;
  main: boolean;
  accountInformationRows: AccountInformationRow[];
}

export interface AccountInformationRow {
  amountFromParent: boolean;
  amount?: number;
  project?: string;
}

export interface InvoiceType {
  invoiceType: string;
  fixedPrice: boolean;
  internal: InvoiceTypeInternal;
  external: InvoiceTypeExternal;
}

export interface InvoiceTypeInternal {
  invoiceRows: InvoiceRow[];
  accountInformation: CAccountInformation;
}

export interface InvoiceTypeExternal {
  invoiceRows: InvoiceRow[];
  accountInformation: CAccountInformation;
}

const breakDate = process.env.NEXT_PUBLIC_INVOICE_BREAK_DATE;
export const invoiceSettings =
  breakDate && dayjs().isBefore(dayjs(breakDate).endOf('day')) ? invoiceData2025 : invoiceData2026;
