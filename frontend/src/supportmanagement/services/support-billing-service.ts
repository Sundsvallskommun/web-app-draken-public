import { PortalPersonData } from '@common/data-contracts/employee/data-contracts';
import { ApiResponse, apiService } from '@common/services/api-service';
import { useAppContext } from '@contexts/app.context';
import { useSnackbar } from '@sk-web-gui/react';
import { useCallback, useEffect } from 'react';
import {
  CBillingRecord,
  CBillingRecordStatusEnum,
  CBillingRecordTypeEnum,
  CPageBillingRecord,
} from 'src/data-contracts/backend/data-contracts';

export interface InvoiceFormModel {
  id: string;
  errandId: string;
  manager: string;
  referenceNumber: string;
  customerId: string;
  activity: string;
  type: string;
  quantity: string;
  costPerUnit: string;
  totalAmount: string;
  // registeredAt: string;
  registeredBy: string;
  // modified: string;
  // approved: string;
  approvedBy: string;
  status: string;
}

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

export const emptyBillingRecord: CBillingRecord = {
  category: 'SALARY_AND_PENSION',
  type: CBillingRecordTypeEnum.INTERNAL,
  status: CBillingRecordStatusEnum.NEW,
  invoice: {
    customerId: '',
    description: invoiceTypes[0].displayName,
    invoiceRows: [
      {
        descriptions: ['Fakturarad'],
        detailedDescriptions: ['foo', 'bar', 'baz'],
        quantity: 1,
        costPerUnit: 300,
        totalAmount: 300,
      },
    ],
    totalAmount: 0,
  },
};

// TODO Endpoint
export const saveInvoice: (errandId: string, municipalityId: string, data: CBillingRecord) => Promise<boolean> = (
  errandId,
  municipalityId,
  data
) => {
  console.log('saveInvoice', data);
  return Promise.resolve(true);
  // return apiService
  //   .patch<boolean, Partial<Invoice>>('', data)
  //   .then((res) => {
  //     return true;
  //   })
  //   .catch((e) => {
  //     console.error('Something went wrong when updating invoice');
  //     throw e;
  //   });
};

export const recordToFormModel: (record?: CBillingRecord) => InvoiceFormModel = (record) => {
  if (!record) {
    return {
      id: '',
      errandId: '',
      manager: '',
      referenceNumber: '',
      customerId: '',
      activity: '',
      type: '',
      quantity: '0',
      costPerUnit: '0',
      totalAmount: '0',
      // registeredAt: '',
      registeredBy: '',
      // modified: '',
      // approved: '',
      approvedBy: '',
      status: '',
    };
  }
  return {
    id: record.id || '',
    errandId: '<ERRAND_ID_OR_REFERENCE>',
    manager: '<ERRAND_MANAGER>',
    referenceNumber: record?.invoice?.customerReference || '',
    customerId: '<CUSTOMER_ID>',
    activity: record?.invoice?.invoiceRows[0]?.accountInformation.activity,
    type: record?.invoice?.description,
    quantity: record?.invoice?.invoiceRows[0]?.quantity.toString() || '0',
    costPerUnit: record?.invoice?.invoiceRows[0]?.costPerUnit.toString() || '0',
    totalAmount: record?.invoice?.totalAmount.toString() || '0',
    // registeredAt: record.created || '',
    registeredBy: 'data.registeredBy',
    // modified: record.modified || '',
    // approved: record.approved || '',
    approvedBy: record.approvedBy || '',
    status: record.status,
  };
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
