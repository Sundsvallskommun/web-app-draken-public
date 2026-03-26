import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { apiService } from '@common/services/api-service';
import { twoDecimals } from '@common/services/helper-service';
import {
  CBillingRecord,
  CBillingRecordStatusEnum,
  CBillingRecordTypeEnum,
  CInvoiceRow,
} from 'src/data-contracts/backend/data-contracts';
import { BillingFormData, BillingServiceItem } from '../interfaces/billing';
import { IErrand } from '../interfaces/errand';
import { casedataInvoiceSettings, CasedataService } from './billing/casedata-invoice-settings';

const BILLING_RECORD_IDS_KEY = 'billingRecordIds';

const PROCESS_PARAMETER_KEYS = ['process.displayPhase', 'process.phaseAction', 'process.phaseStatus'];

const buildInvoiceRows = (services: BillingServiceItem[]): CInvoiceRow[] => {
  return services.map((service) => {
    const detailedDescriptions: string[] = [];
    if (service.avitext) {
      detailedDescriptions.push(service.avitext);
    }

    const serviceConfig: CasedataService | undefined = casedataInvoiceSettings.services.find(
      (s) => s.id === service.serviceId
    );

    return {
      descriptions: [service.name],
      detailedDescriptions,
      totalAmount: twoDecimals(service.quantity * service.costPerUnit),
      costPerUnit: twoDecimals(service.costPerUnit),
      quantity: twoDecimals(service.quantity),
      accountInformation: [
        {
          costCenter: service.accountInformation.costCenter,
          subaccount: service.accountInformation.subaccount,
          department: service.accountInformation.department,
          activity: service.accountInformation.activity,
          project: service.accountInformation.project,
          article: service.accountInformation.object,
          counterpart: service.accountInformation.counterpart || casedataInvoiceSettings.counterpart,
          amount: twoDecimals(service.quantity * service.costPerUnit),
        },
      ],
      vatCode: serviceConfig?.vatCode || '00',
    };
  });
};

const buildBillingRecord = (formData: BillingFormData, errand: IErrand): CBillingRecord => {
  const selectedFacilities = formData.specifications.selectedFacilities || [];
  const invoiceRows = buildInvoiceRows(formData.services);
  const totalAmount = invoiceRows.reduce((sum, row) => sum + (row.totalAmount || 0), 0);

  const recipient = formData.recipient;
  const hasValidRecipient = recipient && (recipient.personId || recipient.organizationNumber);
  const hasValidAddress = recipient?.address && recipient?.postalCode && recipient?.city;

  const orgNumber = recipient?.organizationNumber;
  const persNumber = recipient?.personalNumber;
  const orgNumberStr = orgNumber ? String(orgNumber).trim() : '';
  const persNumberStr = persNumber ? String(persNumber).trim() : '';
  const customerId = orgNumberStr !== '' ? orgNumberStr : persNumberStr !== '' ? persNumberStr : '';

  return {
    category: casedataInvoiceSettings.category,
    type: CBillingRecordTypeEnum.EXTERNAL,
    status: CBillingRecordStatusEnum.NEW,
    recipient:
      hasValidRecipient && hasValidAddress && recipient
        ? {
            ...(recipient.organizationName
              ? { organizationName: recipient.organizationName }
              : {
                  firstName: recipient.name.split(' ')[0] || '',
                  lastName: recipient.name.split(' ').slice(1).join(' ') || '',
                }),
            ...(recipient.personId && { partyId: recipient.personId }),
            ...(recipient.organizationNumber && { legalId: recipient.organizationNumber }),
            addressDetails: {
              street: recipient.address,
              postalCode: recipient.postalCode,
              city: recipient.city,
            },
          }
        : undefined,
    invoice: {
      customerId,
      customerReference: formData.specifications.customerReference,
      ourReference: formData.specifications.ourReference,
      description: formData.specifications.avitext || `Faktura för ärende ${errand.errandNumber}`,
      date: formData.specifications.rejectionDate || undefined,
      totalAmount: twoDecimals(totalAmount),
      invoiceRows,
    },
    extraParameters: {
      errandId: errand.id.toString(),
      errandNumber: errand.errandNumber,
      referenceName: formData.specifications.ourReference,
      ...(selectedFacilities.length > 0 && { facilities: selectedFacilities.join('|') }),
    },
  };
};

const satisfyApi = (data: CBillingRecord): CBillingRecord => {
  const processed: Partial<CBillingRecord> = {};
  processed.recipient = data.recipient;
  processed.invoice = { ...data.invoice };
  delete processed.invoice.totalAmount;
  processed.invoice.invoiceRows = data.invoice.invoiceRows.map((row) => {
    const newRow = { ...row };
    delete newRow.totalAmount;
    newRow.detailedDescriptions = (newRow.detailedDescriptions || []).filter((d) => d !== '');
    newRow.quantity = twoDecimals(parseFloat((newRow.quantity || 0).toString()));
    newRow.costPerUnit = twoDecimals(parseFloat((newRow.costPerUnit || 0).toString()));
    return newRow;
  });
  processed.category = casedataInvoiceSettings.category;
  processed.type = data.type;
  processed.status = data.status;
  processed.approvedBy = data.approvedBy;
  processed.extraParameters = data.extraParameters;
  return processed as CBillingRecord;
};

export const getBillingRecordIdsFromErrand = (errand: IErrand): string[] => {
  const param = errand.extraParameters?.find((p) => p.key === BILLING_RECORD_IDS_KEY);
  return param?.values || [];
};

const saveBillingRecordIdToErrand = async (
  errand: IErrand,
  municipalityId: string,
  billingRecordId: string
): Promise<void> => {
  const existingIds = getBillingRecordIdsFromErrand(errand);

  if (existingIds.includes(billingRecordId)) {
    return;
  }

  const updatedIds = [...existingIds, billingRecordId];

  const updatedExtraParameters: ExtraParameter[] = errand.extraParameters
    ? errand.extraParameters
        .filter((p) => p.key !== BILLING_RECORD_IDS_KEY)
        .filter((p) => !PROCESS_PARAMETER_KEYS.includes(p.key))
        .filter((p) => !p.key.startsWith('process.'))
    : [];

  updatedExtraParameters.push({
    key: BILLING_RECORD_IDS_KEY,
    values: updatedIds,
  });

  await apiService.patch<unknown, ExtraParameter[]>(
    `casedata/${municipalityId}/errands/${errand.id}/extraparameters`,
    updatedExtraParameters
  );
};

const removeBillingRecordIdFromErrand = async (
  errand: IErrand,
  municipalityId: string,
  billingRecordId: string
): Promise<void> => {
  const existingIds = getBillingRecordIdsFromErrand(errand);
  const updatedIds = existingIds.filter((id) => id !== billingRecordId);

  const updatedExtraParameters: ExtraParameter[] = errand.extraParameters
    ? errand.extraParameters
        .filter((p) => p.key !== BILLING_RECORD_IDS_KEY)
        .filter((p) => !PROCESS_PARAMETER_KEYS.includes(p.key))
        .filter((p) => !p.key.startsWith('process.'))
    : [];

  if (updatedIds.length > 0) {
    updatedExtraParameters.push({
      key: BILLING_RECORD_IDS_KEY,
      values: updatedIds,
    });
  }

  await apiService.patch<unknown, ExtraParameter[]>(
    `casedata/${municipalityId}/errands/${errand.id}/extraparameters`,
    updatedExtraParameters
  );
};

export const saveCasedataBillingRecord = async (
  formData: BillingFormData,
  errand: IErrand,
  municipalityId: string,
  existingRecordId?: string
): Promise<CBillingRecord> => {
  const record = buildBillingRecord(formData, errand);
  const url = `billing/${municipalityId}/billingrecords${existingRecordId ? `/${existingRecordId}` : ''}`;
  const action = existingRecordId ? apiService.put : apiService.post;
  const data = satisfyApi(record);

  try {
    const res = await action<CBillingRecord, CBillingRecord>(url, data);

    if (!existingRecordId && res.data.id) {
      await saveBillingRecordIdToErrand(errand, municipalityId, res.data.id);
    }

    return res.data;
  } catch (e) {
    console.error('Something went wrong when saving billing record');
    throw e;
  }
};

export const getCasedataBillingRecord = async (recordId: string, municipalityId: string): Promise<CBillingRecord> => {
  const url = `billing/${municipalityId}/billingrecords/${recordId}`;
  try {
    const res = await apiService.get<CBillingRecord>(url);
    return res.data;
  } catch (e) {
    console.error('Something went wrong when fetching billing record');
    throw e;
  }
};

export const getCasedataBillingRecordsForErrand = async (
  errand: IErrand,
  municipalityId: string
): Promise<CBillingRecord[]> => {
  const billingRecordIds = getBillingRecordIdsFromErrand(errand);

  if (billingRecordIds.length === 0) {
    return [];
  }

  try {
    const records = await Promise.all(
      billingRecordIds.map((id) => getCasedataBillingRecord(id, municipalityId).catch(() => null))
    );

    return records.filter((record): record is CBillingRecord => record !== null);
  } catch (e) {
    console.error('Something went wrong when fetching billing records');
    throw e;
  }
};

export const deleteCasedataBillingRecord = async (
  errand: IErrand,
  recordId: string,
  municipalityId: string
): Promise<boolean> => {
  const url = `billing/${municipalityId}/billingrecords/${recordId}`;
  try {
    await apiService.deleteRequest(url);

    await removeBillingRecordIdFromErrand(errand, municipalityId, recordId);

    return true;
  } catch (e) {
    console.error('Something went wrong when deleting billing record');
    throw e;
  }
};

export const updateCasedataBillingRecord = async (
  record: CBillingRecord,
  municipalityId: string
): Promise<CBillingRecord> => {
  const url = `billing/${municipalityId}/billingrecords/${record.id}`;
  const data = satisfyApi(record);

  try {
    const res = await apiService.put<CBillingRecord, CBillingRecord>(url, data);
    return res.data;
  } catch (e) {
    console.error('Something went wrong when updating billing record');
    throw e;
  }
};

export const approveCasedataBillingRecord = async (
  record: CBillingRecord,
  municipalityId: string
): Promise<CBillingRecord> => {
  const url = `billing/${municipalityId}/billingrecords/${record.id}/status`;
  const data = satisfyApi({ ...record, status: CBillingRecordStatusEnum.APPROVED });

  try {
    const res = await apiService.put<CBillingRecord, CBillingRecord>(url, data);
    return res.data;
  } catch (e) {
    console.error('Something went wrong when approving billing record');
    throw e;
  }
};

export const calculateServiceTotal = (quantity: number, costPerUnit: number): number => {
  return twoDecimals(quantity * costPerUnit);
};
