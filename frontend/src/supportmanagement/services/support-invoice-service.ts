import { apiService } from '@common/services/api-service';

export interface Invoice {
  invoiceType: string;
  hours: string;
  supervisor: string;
  referenceNumber: string;
}

export interface AttestationInvoiceRequest {
  supervisor: string;
  referenceNumber: string;
  client: string;
  activity: string;
  type: string;
  quantity: string;
  amount: string;
  totalAmount: string;
  registeredAt: string;
  registeredBy: string;
  updatedAt: string;
  attested: string;
  status: string;
}

// TODO Endpoint
export const updateSupportInvoice: (errandId: string, municipalityId: string, data: Invoice) => Promise<boolean> = (
  errandId,
  municipalityId,
  data
) => {
  return apiService
    .patch<boolean, Partial<Invoice>>('', data)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when updating invoice');
      throw e;
    });
};
