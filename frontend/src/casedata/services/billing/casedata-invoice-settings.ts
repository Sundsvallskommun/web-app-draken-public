import { CAccountInformation } from 'src/data-contracts/backend/data-contracts';

import invoiceData from './invoicedata-MEX-2026-04-14.json';

interface InvoiceRow {
  costPerUnit: number;
  vatCode: string;
  description: string;
  detailedDescriptions?: string[];
  visible: boolean;
  main: boolean;
  accountInformationRows?: { amountFromParent: boolean; object?: string }[];
}

export interface CasedataService {
  id: string;
  name: string;
  description: string;
  costPerUnit: number;
  vatCode: string;
  fixedPrice: boolean;
  detailedDescriptions?: string[];
  accountInformation: CAccountInformation & { object?: string };
}

export interface CasedataInvoiceSettings {
  category: string;
  services: CasedataService[];
}

const mapInvoiceData = (): CasedataInvoiceSettings => {
  const services: CasedataService[] = invoiceData.invoiceTypes.map((type) => {
    const rows = type.external?.invoiceRows as InvoiceRow[] | undefined;
    const mainRow = rows?.find((r) => r.main) ?? rows?.[0];
    const accountInfo = type.external?.accountInformation ?? {};
    const objectValue = mainRow?.accountInformationRows?.[0]?.object;

    return {
      id: type.invoiceType,
      name: type.invoiceType,
      description: mainRow?.description ?? '',
      costPerUnit: mainRow?.costPerUnit ?? 0,
      vatCode: mainRow?.vatCode ?? '00',
      fixedPrice: type.fixedPrice ?? false,
      ...(mainRow?.detailedDescriptions && { detailedDescriptions: mainRow.detailedDescriptions }),
      accountInformation: {
        ...accountInfo,
        ...(objectValue && { object: objectValue }),
      },
    };
  });

  return {
    category: invoiceData.category,
    services: services.sort((a, b) => a.name.localeCompare(b.name)),
  };
};

export const casedataInvoiceSettings: CasedataInvoiceSettings = mapInvoiceData();
