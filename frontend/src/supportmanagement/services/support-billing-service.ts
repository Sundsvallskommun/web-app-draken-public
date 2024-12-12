import { PortalPersonData } from '@common/data-contracts/employee/data-contracts';
import { ApiResponse, apiService } from '@common/services/api-service';
import { useAppContext } from '@contexts/app.context';
import { useSnackbar } from '@sk-web-gui/react';
import { useCallback, useEffect } from 'react';
import {
  CBillingRecord,
  CBillingRecordStatusEnum,
  CBillingRecordTypeEnum,
  CExternalTag,
  CPageBillingRecord,
  SupportErrandDto,
} from 'src/data-contracts/backend/data-contracts';
import { SupportErrand } from './support-errand-service';
import { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { twoDecimals } from '@common/services/helper-service';
import * as yup from 'yup';
import { User } from '@common/interfaces/user';
import { All } from '@casedata/interfaces/priority';

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

export const customerIdentities: CustomerIdentity[] = [
  { orgId: '28', treeLevel: 2, customerId: '10', customerName: 'Kommunstyrelsekontoret' },
  { orgId: '2849', treeLevel: 3, customerId: '15', customerName: 'Servicecenter' },
  { orgId: '58', treeLevel: 2, customerId: '16', customerName: 'Drakfastigheter' },
  { orgId: '31', treeLevel: 2, customerId: '20', customerName: 'Individ- och Arbetsmarknadsförvaltningen	' },
  { orgId: '26', treeLevel: 2, customerId: '30', customerName: 'Stadsbyggnadskontoret' },
  { orgId: '27', treeLevel: 2, customerId: '32', customerName: 'Lantmäterikontoret' },
  { orgId: '30', treeLevel: 2, customerId: '40', customerName: 'Kultur och fritid' },
  { orgId: '24', treeLevel: 2, customerId: '60', customerName: 'Barn och Utbildning' },
  { orgId: '23', treeLevel: 2, customerId: '70', customerName: 'Vård och Omsorgsförvaltningen' },
  { orgId: '25', treeLevel: 2, customerId: '80', customerName: 'Miljökontoret' },
  { orgId: '29', treeLevel: 2, customerId: '90', customerName: 'Överförmyndarkontoret' },
];

export const invoiceActivities = [
  { id: 0, value: '5756', displayName: '5756 - Lön och pension' },
  { id: 1, value: '5757', displayName: '5757 - Heroma' },
];

export const invoiceTypes = [
  { id: 0, key: 'DIREKTINSATTNING', displayName: 'Extra utbetalning - Direktinsättning' },
  { id: 1, key: 'SYSTEMET', displayName: 'Extra utbetalning - Systemet' },
  { id: 2, key: 'LONEUNDERLAG', displayName: 'Manuell hantering - Löneunderlag' },
  { id: 3, key: 'EXTRA', displayName: 'Extra beställning' },
];

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
    customerId: yup.string().required('Fyll i kundidentitet'),
    customerReference: yup.string().required('Fyll i referensnummer'),
    invoiceRows: yup.array().of(
      yup.object({
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
        accountInformation: yup.object({
          activity: yup
            .mixed<string>()
            .required('Välj aktivitet')
            .oneOf(
              invoiceActivities.map((a) => a.value),
              'Välj aktivitet'
            ),
        }),
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
  invoice: {
    referenceId: 'foobar',
    customerId: '',
    description: invoiceTypes[0].displayName,
    invoiceRows: [
      {
        accountInformation: {
          activity: '',
          costCenter: 'foobar',
          subaccount: 'foobar',
          department: 'foobar',
          counterpart: 'foobar',
        },
        descriptions: [''],
        detailedDescriptions: [''],
        quantity: 1,
        costPerUnit: 300,
        totalAmount: 300,
      },
    ],
    totalAmount: 0,
  },
};

const satisfyApi = (data: CBillingRecord) => {
  delete data.id;
  delete data.created;
  delete data.modified;
  delete data.approved;
  data.invoice.totalAmount = null;
  data.invoice.invoiceRows.forEach((row) => {
    row.totalAmount = null;
    row.accountInformation = data.invoice.invoiceRows?.[0]?.accountInformation;
    row.detailedDescriptions = row.detailedDescriptions.filter((d) => d !== '');
    // Convert strings to numbers
    row.quantity = twoDecimals(parseFloat(row.quantity.toString()));
    row.costPerUnit = twoDecimals(parseFloat(row.costPerUnit.toString()));
  });
  data.category = 'SALARY_AND_PENSION';
  return data;
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
  const url = `billing/${municipalityId}/billingrecords${record.id ? `/${record.id}` : ''}`;
  const action = record.id ? apiService.put : apiService.post;
  let data = satisfyApi(record);
  console.log('Saving data:', data);
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
    is2849: orgTree.split('¤').some((x) => x.split('|')[1].toString() === '2849'),
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

export const getEmployeeOrganizationId: (username: string, domain?: string) => Promise<string> = async (
  username,
  domain
) => {
  const employeeData = await getEmployeeData(username, domain);
  const orgData = parseInvoiceAdministrationInfo(employeeData.orgTree);
  return orgData.is2849 ? '2849' : orgData.administrationCode;
};

export const getEmployeeCustomerIdentity: (
  username: string,
  domain?: string
) => Promise<CustomerIdentity | undefined> = async (username, domain) => {
  const orgId = await getEmployeeOrganizationId(username, domain);
  const customerIdentity = customerIdentities.find((c) => c.orgId === orgId);
  return customerIdentity;
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

// export const useAttestationFilter = (
//   user: User,
//   ownerFilter,
//   setOwnerFilter,
//   resetFilter,
//   triggerFilter,
//   statusFilter,
//   invoiceTypeFilter,
//   startdate,
//   enddate,
//   setAttestationFilterObject
// ) => {
//   useCallback(() => {
//     const filterdata = store.get('attestationFilter');

//     if (filterdata) {
//       let filter;
//       let storedFilters;
//       try {
//         console.log('trying');
//         filter = JSON.parse(filterdata);
//         storedFilters = {
//           invoiceType: filter?.invoiceType?.split(',') || AttestationValues.invoiceType,
//           status: filter?.status !== '' ? filter?.status?.split(',') || AttestationValues.status : [],
//           startdate: filter?.start || AttestationValues.startdate,
//           enddate: filter?.end || AttestationValues.enddate,
//         };
//       } catch (error) {
//         console.log('catching');
//         store.set('attestationFilter', JSON.stringify({}));
//         storedFilters = {
//           invoiceType: AttestationValues.invoiceType,
//           status: AttestationValues.status,
//           startdate: AttestationValues.startdate,
//           enddate: AttestationValues.enddate,
//         };
//       }
//       if (filter?.stakeholders === user.username) {
//         setOwnerFilter(true);
//       }

//       resetFilter(storedFilters);
//       triggerFilter();
//     }
//   }, [resetFilter, triggerFilter, user.username]);

//   useDebounceEffect(
//     () => {
//       const fObj = {};
//       // const extraFilterObj = {};
//       if (statusFilter && statusFilter.length > 0) {
//         fObj['status'] = statusFilter.join(',');
//       }
//       if (invoiceTypeFilter && invoiceTypeFilter.length > 0) {
//         fObj['invoiceType'] = invoiceTypeFilter.join(',');
//       }
//       if (ownerFilter) {
//         fObj['stakeholders'] = user.username;
//       }
//       if (startdate) {
//         const date = startdate.trim();
//         fObj['start'] = date;
//       }
//       if (enddate) {
//         const date = enddate.trim();
//         fObj['end'] = date;
//       }
//       setAttestationFilterObject(fObj);
//       // setExtraFilter(extraFilterObj);
//       store.set('attestationFilter', JSON.stringify(fObj));
//     },
//     200,
//     [ownerFilter, statusFilter, invoiceTypeFilter, startdate, enddate]
//   );
// };
