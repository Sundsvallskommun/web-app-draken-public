import { All } from '@casedata/interfaces/priority';
import { PortalPersonData } from '@common/data-contracts/employee/data-contracts';
import { User } from '@common/interfaces/user';
import { ApiResponse, apiService } from '@common/services/api-service';
import { twoDecimals } from '@common/services/helper-service';
import { useAppContext } from '@contexts/app.context';
import { useSnackbar } from '@sk-web-gui/react';
import { useCallback, useEffect } from 'react';
import {
  CBillingRecord,
  CBillingRecordStatusEnum,
  CBillingRecordTypeEnum,
  CExternalTag,
  CInvoiceRow,
  CLegalEntity2WithId,
  CPageBillingRecord,
  SupportErrandDto,
} from 'src/data-contracts/backend/data-contracts';
import * as yup from 'yup';
import { ExternalCustomerIdentity, InternalCustomerIdentity, invoiceSettings } from './invoiceSettings';
import { SupportErrand } from './support-errand-service';

export const attestationLabels = [
  { label: 'Kostnadstyp', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Timmar', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Belopp', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Chef', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Registrerades', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Uppdaterad', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Ärende', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
  { label: 'Attesterad', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: 'Status', screenReaderOnly: false, sortable: true, shownForStatus: All.ALL },
  { label: '', screenReaderOnly: false, sortable: false, shownForStatus: All.ALL },
];
export interface CustomerIdentity {
  orgId: string;
  treeLevel: number;
  customerId: string;
  customerName: string;
}

export const billingrecordStatusToLabel = (status: string) => {
  switch (status) {
    case 'NEW':
      return 'Ny';
    case 'APPROVED':
      return 'Godkänd';
    case 'REJECTED':
      return 'Avslagen';
    case 'INVOICED':
      return 'Fakturerad';
    default:
      return status;
  }
};

export const billingFormSchema = yup.object({
  id: yup.string(),
  type: yup.string().required('Fyll i faktureringstyp'),
  invoice: yup.object({
    description: yup.string().required('Fyll i faktureringstyp'),
    customerId: yup.string().required('Fyll i kundidentitet'),
    customerReference: yup.string().required('Fyll i referensnummer'),
    invoiceRows: yup.array().of(
      yup.object({
        // visible: yup.boolean().default(true),
        quantity: yup
          .number()
          .typeError('Ange i format 1,23')
          .test('isnumber', 'Ange i format 1,23', (q) => {
            return /^\d*\.?\d{0,2}$/g.test(q.toString());
          })
          .test('positivt', 'Måste vara 0 eller större', (q) => q > 0)
          .required('Fyll i antal timmar'),
        costPerUnit: yup.string().required('Fyll i timpris'),
        totalAmount: yup.string().nullable(),
        accountInformation: yup.array().of(
          yup.object({
            activity: yup
              .mixed<string>()
              .required('Välj aktivitet')
              .oneOf(
                invoiceSettings.activities.map((a) => a.value),
                'Välj aktivitet'
              ),
          })
        ),
      })
    ),
  }),
  totalAmount: yup.string().nullable(),
  registeredBy: yup.string(),
  approvedBy: yup.string(),
  status: yup.string(),
});

export const emptyBillingRecord: CBillingRecord = {
  category: 'SALARY_AND_PENSION',
  type: CBillingRecordTypeEnum.INTERNAL,
  status: CBillingRecordStatusEnum.NEW,
  recipient: {
    partyId: '',
    organizationName: '',
    addressDetails: {
      street: '',
      careOf: '',
      postalCode: '',
      city: '',
    },
  },
  invoice: {
    referenceId: 'N/A',
    customerId: '',
    description: invoiceSettings.invoiceTypes[0].invoiceType,
    invoiceRows: [
      {
        descriptions: ['(Beskrivning saknas)'],
        detailedDescriptions: [],
        totalAmount: 0,
        costPerUnit: invoiceSettings.invoiceTypes[0].internal.invoiceRows[0].costPerUnit,
        quantity: 0,
        accountInformation: [
          {
            costCenter: invoiceSettings.invoiceTypes[0].internal.accountInformation.costCenter,
            activity: invoiceSettings.activities[0].value,
          },
        ],
      },
    ],
  },
};

export const getInvoiceRows = (
  errandNumber: string,
  description: string,
  type: string,
  identity: string,
  quantity: number,
  costCenter: string,
  activity: string
) => {
  console.log('Getting invoice rows for: ', description, type, identity, quantity);
  const invoiceType = invoiceSettings.invoiceTypes.find((t) => t.invoiceType === description);
  if (!invoiceType) {
    console.error('Could not find invoice type for description: ', description);
    return [];
  }
  const { invoiceRows, accountInformation } = type === 'INTERNAL' ? invoiceType?.internal : invoiceType?.external;
  // console.log('Invoice rows: ', invoiceRows);
  // console.log('Account information: ', accountInformation);
  if (!invoiceRows || !accountInformation) {
    console.error('Could not find invoice rows for description: ', description);
    return [];
  }
  const counterpart =
    type === 'INTERNAL'
      ? invoiceSettings.customers.internal.find((c) => c.customerId === parseInt(identity, 10))?.counterpart
      : invoiceSettings.customers.external.find((c) => c.name === identity)?.counterpart;
  const formRows: CInvoiceRow[] = invoiceRows.map((invoiceRow, index) => {
    const totalAmount = isNaN(quantity) ? 0 : twoDecimals(invoiceRow.costPerUnit * quantity);
    const _accRows = invoiceRow.accountInformationRows.map((accountInformationRow) => {
      const project = accountInformationRow.project || accountInformation.project || undefined;
      let amount = 0;
      if (accountInformationRow.amountFromParent) {
        amount = totalAmount;
        console.log("Amount is from parent, using parent's total amount: ", amount);
      } else {
        amount = isNaN(quantity) ? 0 : twoDecimals(quantity * accountInformationRow.amount);
        console.log('Amount is not from parent, calculating amount: ', amount);
      }
      return {
        costCenter,
        ...(accountInformation.subaccount && { subaccount: accountInformation.subaccount }),
        ...(accountInformation.department && { department: accountInformation.department }),
        ...(accountInformation.accuralKey && { accuralKey: accountInformation.accuralKey }),
        ...(accountInformation.article && { article: accountInformation.article }),
        activity: activity || accountInformation.activity,
        amount,
        project,
        counterpart,
      };
    });
    console.log('Generated rows: ', _accRows);
    return {
      descriptions: [invoiceRow.description.replace('<errandNumber>', errandNumber)],
      detailedDescriptions: [],
      totalAmount,
      costPerUnit: invoiceRow.costPerUnit,
      quantity: isNaN(quantity) ? 0 : quantity,
      accountInformation: _accRows,
      // TODO ADD REAL vatCode
      ...(type === 'EXTERNAL' && { vatCode: '25' }),
    };
  });
  return formRows;
};

const satisfyApi = (data: CBillingRecord) => {
  console.log('Satisfying API: ', data);
  const processed: Partial<CBillingRecord> = {};
  processed.recipient = data.type === 'EXTERNAL' ? data.recipient : undefined;
  processed.invoice = { ...data.invoice };
  delete processed.invoice.totalAmount;
  processed.invoice.invoiceRows = data.invoice.invoiceRows.map((row) => {
    delete row.totalAmount;
    row.detailedDescriptions = row.detailedDescriptions.filter((d) => d !== '');
    row.quantity = twoDecimals(parseFloat(row.quantity.toString()));
    row.costPerUnit = twoDecimals(parseFloat(row.costPerUnit.toString()));
    return row;
  });
  processed.category = invoiceSettings.category;
  processed.type = data.type;
  processed.status = data.status;
  processed.extraParameters = data.extraParameters;
  return processed as CBillingRecord;
};

export const approveBillingRecord: (municipalityId: string, record: CBillingRecord, user: User) => Promise<boolean> = (
  municipalityId,
  record,
  user
) => setBillingRecordStatus(municipalityId, record, CBillingRecordStatusEnum.APPROVED, user);

export const rejectBillingRecord: (municipalityId: string, record: CBillingRecord, user: User) => Promise<boolean> = (
  municipalityId,
  record,
  user
) => setBillingRecordStatus(municipalityId, record, CBillingRecordStatusEnum.REJECTED, user);

export const setBillingRecordStatus: (
  municipalityId: string,
  record: CBillingRecord,
  status: CBillingRecordStatusEnum,
  user: User
) => Promise<boolean> = (municipalityId, record, status, user) => {
  const url = `billing/${municipalityId}/billingrecords/${record.id}/status`;
  let data: CBillingRecord = {
    ...record,
    ...(status === CBillingRecordStatusEnum.APPROVED && { approvedBy: `${user.firstName} ${user.lastName}` }),
    status,
  };
  data = satisfyApi(data);
  return apiService
    .put<CBillingRecord, CBillingRecord>(url, data)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when updating billing record status');
      throw e;
    });
};

export const saveBillingRecord: (
  errand: SupportErrand,
  municipalityId: string,
  record: CBillingRecord
) => Promise<boolean> = (errand, municipalityId, record) => {
  console.log('Saving billing record: ', record);
  const url = `billing/${municipalityId}/billingrecords${record.id ? `/${record.id}` : ''}`;
  const action = record.id ? apiService.put : apiService.post;
  let data = satisfyApi(record);
  console.log('Saving data:', data);
  // return Promise.resolve(true);
  return action<CBillingRecord, CBillingRecord>(url, data)
    .then((res) => {
      return errand ? saveBillingRecordReferenceToErrand(errand, municipalityId, res.data.id) : true;
    })
    .catch((e) => {
      console.error('Something went wrong when updating invoice');
      throw e;
    });
};

const saveBillingRecordReferenceToErrand: (
  errand: SupportErrand,
  municipalityId: string,
  billingRecordId: string
) => Promise<boolean> = (errand, municipalityId, billingRecordId) => {
  const url = `supporterrands/${municipalityId}/${errand.id}`;
  const tags: CExternalTag[] = errand.externalTags || [];
  const existingTag = tags.find((t) => t.key === 'billingRecordId');
  if (existingTag) {
    existingTag.value = billingRecordId;
  } else {
    tags.push({ key: 'billingRecordId', value: billingRecordId });
  }

  return apiService
    .patch<boolean, Partial<SupportErrandDto>>(url, { externalTags: tags })
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when updating errand with billing record id');
      throw e;
    });
};

const parseInvoiceAdministrationInfo: (orgTree: string) => {
  administrationCode: string;
  administrationName: string;
  is2849: boolean;
} = (orgTree) => {
  return {
    administrationCode: orgTree.split('¤')[0].split('|')[1].toString(),
    administrationName: orgTree.split('¤')[0].split('|')[2].toString(),
    is2849:
      orgTree.split('¤')[1].split('|')[1] === '28' &&
      orgTree.split('¤').some((x) => x.split('|')[1].toString() === '2849'),
  };
};

export const getEmployeeData: (username: string, domain?: string) => Promise<PortalPersonData> = async (
  username: string,
  domain?: string
) => {
  if (!domain) {
    domain = 'PERSONAL';
  }
  return apiService
    .get<ApiResponse<PortalPersonData>>(`portalpersondata/${domain}/${username}`)
    .then((res) => res.data.data)
    .catch((e) => {
      console.error('Something went wrong when fetching AD-user');
      throw e;
    });
};

export const getEmployeeOrganizationId: (
  username: string,
  domain?: string
) => Promise<{ companyId: number; organizationId: string; referenceNumber?: string }> = async (username, domain) => {
  const employeeData = await getEmployeeData(username, domain);
  console.log('Employee data: ', employeeData);
  const orgData = parseInvoiceAdministrationInfo(employeeData.orgTree);
  console.log('Org data: ', orgData);
  return {
    companyId: employeeData.companyId,
    organizationId: orgData.is2849 ? '2849' : orgData.administrationCode,
    referenceNumber: employeeData.referenceNumber,
  };
};

export const getEmployeeCustomerIdentity: (
  username: string,
  domain?: string
) => Promise<
  | {
      type: 'INTERNAL';
      identity: InternalCustomerIdentity | undefined;
      referenceNumber: string;
    }
  | {
      type: 'EXTERNAL';
      identity: ExternalCustomerIdentity | undefined;
      referenceNumber: string;
    }
> = async (username, domain) => {
  console.log('Looking up customer identity for user: ', username);
  const employeeOrgData = await getEmployeeOrganizationId(username, domain);
  console.log('Employee org data: ', employeeOrgData);
  const isInternal = employeeOrgData.companyId === 1;
  if (isInternal) {
    const identity = invoiceSettings.customers.internal.find((c) => c.orgId[0] === employeeOrgData.organizationId);
    const referenceNumber = employeeOrgData?.referenceNumber ?? '';
    console.log('Internal customer identity: ', identity);
    return {
      type: 'INTERNAL',
      identity,
      referenceNumber,
    };
  } else {
    const identity = invoiceSettings.customers.external.find((c) => c.companyId === employeeOrgData.companyId);
    const referenceNumber = identity?.customerReference ?? '';
    console.log('External customer identity: ', identity);
    return {
      type: 'EXTERNAL',
      identity,
      referenceNumber,
    };
  }
};

export const getOrganization: (orgNr: string) => Promise<{
  partyId: string;
  address: {
    city: string;
    street: string;
    careOf: string;
    postalCode: string;
  };
}> = async (orgNr) => {
  return apiService
    .post<ApiResponse<CLegalEntity2WithId>, { orgNr: string }>(`organization/`, { orgNr })
    .then((res) => {
      const org = res.data.data;
      return {
        partyId: org.partyId,
        address: {
          city: org?.address?.city || '',
          street: org?.postAddress?.address1 || org?.address?.addressArea || '',
          careOf: org?.postAddress?.coAdress || '',
          postalCode: org?.address?.postalCode || '',
        },
      };
    })
    .catch((e) => {
      console.error('Something went wrong when fetching organization');
      return undefined;
    });
};

export const getBillingRecord: (recordId: string, municipalityId: string) => Promise<CBillingRecord> = (
  recordId,
  municipalityId
) => {
  let url = `billing/${municipalityId}/billingrecords/${recordId}`;
  return apiService
    .get<CBillingRecord>(url)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching billing records');
      throw e;
    });
};

export const getBillingRecords: (
  municipalityId: string,
  page?: number,
  size?: number,
  filter?: { [key: string]: string | boolean | number },
  sort?: { [key: string]: 'asc' | 'desc' }
) => Promise<CPageBillingRecord> = (municipalityId, page = 0, size = 10, filter = {}, sort = { modified: 'desc' }) => {
  let url = `billing/${municipalityId}/billingrecords?page=${page}&size=${size}`;
  const filterQuery = Object.keys(filter)
    .map((key) => key + '=' + filter[key])
    .join('&');
  const sortQuery = `${Object.keys(sort)
    .map((key) => `sort=${key}%2C${sort[key]}`)
    .join('&')}`;
  url = filterQuery ? `${url}&${filterQuery}` : url;
  url = sortQuery ? `${url}&${sortQuery}` : url;
  return apiService
    .get<CPageBillingRecord>(url)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching billing records');
      throw e;
    });
};

export const useBillingRecords = (
  municipalityId: string,
  page?: number,
  size?: number,
  filter?: { [key: string]: string | boolean | number },
  sort?: { [key: string]: 'asc' | 'desc' }
): CPageBillingRecord => {
  const toastMessage = useSnackbar();
  const { setIsLoading, setBillingRecords, billingRecords } = useAppContext();
  const fetchBillingRecords = useCallback(
    async (page: number = 0) => {
      // setIsLoading(true);
      return getBillingRecords(municipalityId, page, size, filter, sort)
        .then((res) => {
          setBillingRecords({ ...res });
        })
        .catch((err) => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Fakturor kunde inte hämtas',
            status: 'error',
          });
        });
    },
    [setBillingRecords, billingRecords, size, filter, sort, toastMessage]
  );

  useEffect(() => {
    if (size && size > 0) {
      console.log('size changed: ', size);
      fetchBillingRecords().then(() => setIsLoading(false));
    }
  }, [filter, size, sort]);

  useEffect(() => {
    if (page && page !== -1) {
      console.log('page changed: ', page);
      fetchBillingRecords(page).then(() => setIsLoading(false));
    }
    //eslint-disable-next-line
  }, [page]);

  return billingRecords;
};
