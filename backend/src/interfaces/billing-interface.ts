import {
  AccountInformation,
  AddressDetails,
  BillingRecord,
  Invoice,
  InvoiceRow,
  PageableObject,
  PageBillingRecord,
  Recipient,
  SortObject,
  Status,
  Type,
} from '@/data-contracts/billingpreprocessor/data-contracts';
import { Type as TypeTransformer } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CAccountInformation implements AccountInformation {
  @IsOptional()
  @IsString()
  costCenter?: string;
  @IsOptional()
  @IsString()
  subaccount?: string;
  @IsOptional()
  @IsString()
  department?: string;
  @IsOptional()
  @IsString()
  accuralKey?: string;
  @IsOptional()
  @IsString()
  activity?: string;
  @IsOptional()
  @IsString()
  article?: string;
  @IsOptional()
  @IsString()
  project?: string;
  @IsOptional()
  @IsString()
  counterpart?: string;
  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class CInvoiceRow implements InvoiceRow {
  @IsOptional()
  @IsArray()
  descriptions?: string[];
  @IsOptional()
  @IsArray()
  detailedDescriptions?: string[];
  @IsOptional()
  @IsNumber()
  totalAmount?: number;
  @IsOptional()
  @IsString()
  vatCode?: string;
  @IsOptional()
  @IsNumber()
  costPerUnit?: number;
  @IsOptional()
  @IsNumber()
  quantity?: number;
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CAccountInformation)
  accountInformation?: AccountInformation[];
}

export class CInvoice implements Invoice {
  @IsString()
  customerId: string;
  @IsString()
  description: string;
  @IsOptional()
  @IsString()
  ourReference?: string;
  @IsString()
  customerReference: string;
  @IsOptional()
  @IsString()
  date?: string;
  @IsOptional()
  @IsString()
  dueDate?: string;
  @IsOptional()
  @IsNumber()
  totalAmount?: number;
  @IsArray()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CInvoiceRow)
  invoiceRows: InvoiceRow[];
}

export class CAddressDetails implements AddressDetails {
  @IsOptional()
  @IsString()
  street?: string;
  @IsOptional()
  @IsString()
  careOf?: string;
  @IsOptional()
  @IsString()
  postalCode?: string;
  @IsOptional()
  @IsString()
  city?: string;
}

export class CRecipient implements Recipient {
  @IsOptional()
  @IsString()
  partyId?: string;
  @IsOptional()
  @IsString()
  legalId?: string;
  @IsOptional()
  @IsString()
  organizationName?: string;
  @IsOptional()
  @IsString()
  firstName?: string;
  @IsOptional()
  @IsString()
  lastName?: string;
  @IsOptional()
  @IsString()
  userId?: string;
  @ValidateNested()
  @TypeTransformer(() => CAddressDetails)
  addressDetails: AddressDetails;
}

class CExtraParameters {
  @IsString()
  errandId: string;
  @IsString()
  errandNumber: string;
  @IsString()
  referenceName: string;
}
export class CBillingRecord implements BillingRecord {
  @IsOptional()
  @IsString()
  id?: string;
  @IsOptional()
  approvedBy?: string;
  @IsOptional()
  approved?: string;
  @IsOptional()
  @ValidateNested()
  @TypeTransformer(() => CRecipient)
  recipient?: Recipient;
  @IsOptional()
  created?: string;
  @IsOptional()
  modified?: string;
  @IsString()
  category: string;
  @IsEnum(Type)
  type: Type;
  @IsEnum(Status)
  status: Status;
  @ValidateNested()
  @TypeTransformer(() => CInvoice)
  invoice: CInvoice;
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @TypeTransformer(() => CExtraParameters)
  extraParameters?: {
    errandId: string;
    errandNumber: string;
    referenceName: string;
  };
}
export class CSortObject implements SortObject {
  @IsOptional()
  @IsBoolean()
  unsorted?: boolean;
  @IsOptional()
  @IsBoolean()
  empty?: boolean;
  @IsOptional()
  @IsBoolean()
  sorted?: boolean;
}

export class CPageableObject implements PageableObject {
  @IsOptional()
  @IsBoolean()
  paged?: boolean;
  @IsOptional()
  @IsNumber()
  pageNumber?: number;
  @IsOptional()
  @IsNumber()
  pageSize?: number;
  @IsOptional()
  @IsNumber()
  offset?: number;
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CSortObject)
  sort?: SortObject;
  @IsOptional()
  @IsBoolean()
  unpaged?: boolean;
}

export class CPageBillingRecord implements PageBillingRecord {
  @IsOptional()
  @IsNumber()
  totalElements?: number;
  @IsOptional()
  @IsNumber()
  totalPages?: number;
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CPageableObject)
  pageable?: PageableObject;
  @IsOptional()
  @IsNumber()
  size?: number;
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CBillingRecord)
  content?: CBillingRecord[];
  @IsOptional()
  @IsNumber()
  number?: number;
  @IsOptional()
  @ValidateNested({ each: true })
  @TypeTransformer(() => CSortObject)
  sort?: SortObject;
  @IsOptional()
  @IsNumber()
  numberOfElements?: number;
  @IsOptional()
  @IsBoolean()
  first?: boolean;
  @IsOptional()
  @IsBoolean()
  last?: boolean;
  @IsOptional()
  @IsBoolean()
  empty?: boolean;
}
