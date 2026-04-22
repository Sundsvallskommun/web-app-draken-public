import { CAccountInformation } from 'src/data-contracts/backend/data-contracts';

export interface BillingAccountInformation extends CAccountInformation {
  object?: string;
}

export interface BillingServiceItem {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  quantity: number;
  costPerUnit: number;
  totalAmount: number;
  descriptions: string[];
  accountInformation: BillingAccountInformation;
}

export interface BillingSpecificationsData {
  ourReference: string;
  customerReference: string;
  rejectionDate?: string;
  avitext?: string;
  selectedFacilities: string[];
}

export interface BillingRecipient {
  name: string;
  organizationName?: string;
  personId?: string;
  personalNumber?: string | number;
  organizationNumber?: string;
  address: string;
  postalCode: string;
  city: string;
  role: string;
}

export interface BillingFormData {
  services: BillingServiceItem[];
  specifications: BillingSpecificationsData;
  recipient?: BillingRecipient;
}

const emptyBillingSpecifications: BillingSpecificationsData = {
  ourReference: '',
  customerReference: '',
  rejectionDate: '',
  avitext: '',
  selectedFacilities: [],
};

export const emptyBillingFormData: BillingFormData = {
  services: [],
  specifications: emptyBillingSpecifications,
  recipient: undefined,
};
