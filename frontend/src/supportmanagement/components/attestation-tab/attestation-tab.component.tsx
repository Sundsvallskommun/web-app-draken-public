import { getMe } from '@common/services/user-service';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { useAppContext } from '@contexts/app.context';
import { Disclosure, DisclosurePanel } from '@headlessui/react';
import { AttestationInvoiceForm } from '@supportmanagement/components/attestation-tab/attestation-invoice-form.component';
import { AttestationInvoiceWrapperComponent } from '@supportmanagement/components/attestation-tab/attestation-invoice-wrapper.component';
import AttestationsFilteringComponent, {
  AttestationFilter,
  AttestationValues,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/attestations-filtering.component';
import {
  AttestationsTable,
  AttestationTableForm,
} from '@supportmanagement/components/attestation-tab/components/attestations-table.component';
import store from '@supportmanagement/services/storage-service';
import { getSupportAdmins } from '@supportmanagement/services/support-admin-service';
import {
  getBillingRecord,
  getBillingRecords,
  useBillingRecords,
} from '@supportmanagement/services/support-billing-service';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

export const AttestationTab = () => {
  const filterForm = useForm<AttestationFilter>({ defaultValues: AttestationValues });
  const { watch: watchFilter, reset: resetFilter, trigger: triggerFilter, getValues, setValue } = filterForm;
  const tableForm = useForm<AttestationTableForm>({
    defaultValues: { sortColumn: 'modified', sortOrder: 'desc', pageSize: 12 },
  });
  const { watch: watchTable, setValue: setTableValue } = tableForm;
  const sortOrder = watchTable('sortOrder');
  const sortColumn = watchTable('sortColumn');
  const pageSize = watchTable('pageSize');
  const page = watchTable('page');

  const [showSelectedRecord, setShowSelectedRecord] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState(undefined);

  const { setSupportErrand, setSupportAdmins, setBillingRecords, supportAdmins, municipalityId } = useAppContext();

  const startdate = watchFilter('startdate');
  const enddate = watchFilter('enddate');
  const [ownerFilter, setOwnerFilter] = useState(false);
  const statusFilter = watchFilter('status');
  const invoiceTypeFilter = watchFilter('invoiceType');
  const sortObject = useMemo(() => ({ [sortColumn]: sortOrder }), [sortColumn, sortOrder]);
  const [attestationFilterObject, setAttestationFilterObject] = useState<{ [key: string]: string | boolean }>();
  const [extraFilter, setExtraFilter] = useState<{ [key: string]: string }>();
  const billingRecords = useBillingRecords(municipalityId, page, pageSize, attestationFilterObject, sortObject);
  const initialFocus = useRef(null);

  useEffect(() => {
    getBillingRecords(municipalityId, page, pageSize, attestationFilterObject, sortObject).then(setBillingRecords);
  }, [municipalityId, page, pageSize, attestationFilterObject, sortObject]);

  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };
  const router = useRouter();
  const { user, setUser } = useAppContext();

  useEffect(() => {
    const filterdata = store.get('attestationFilter');

    if (filterdata) {
      let filter;
      let storedFilters;
      try {
        filter = JSON.parse(filterdata);
        storedFilters = {
          invoiceType: filter?.invoiceType?.split(',') || AttestationValues.invoiceType,
          status: filter?.status !== '' ? filter?.status?.split(',') || AttestationValues.status : [],
          startdate: filter?.start || AttestationValues.startdate,
          enddate: filter?.end || AttestationValues.enddate,
        };
      } catch (error) {
        store.set('attestationFilter', JSON.stringify({}));
        storedFilters = {
          invoiceType: AttestationValues.invoiceType,
          status: AttestationValues.status,
          startdate: AttestationValues.startdate,
          enddate: AttestationValues.enddate,
        };
      }
      if (filter?.stakeholders === user.username) {
        setOwnerFilter(true);
      }

      resetFilter(storedFilters);
      triggerFilter();
    }
  }, [resetFilter, triggerFilter, user.username]);

  useEffect(() => {
    setTableValue('page', 0);
    //eslint-disable-next-line
  }, [attestationFilterObject, sortColumn, sortOrder, pageSize]);

  useEffect(() => {
    // NOTE: If we set focus on the next button
    //       the browser will automatically scroll
    //       down to the button.
    setInitialFocus();
    getMe()
      .then((user) => {
        setUser(user);
      })
      .catch((e) => {});
    setSupportErrand(undefined);
    getBillingRecords(municipalityId);
    //eslint-disable-next-line
  }, [router]);

  useEffect(() => {
    if (billingRecords) {
      setSupportErrand(undefined);
      setTableValue('size', billingRecords.size);
      setTableValue('totalPages', billingRecords.totalPages);
      setTableValue('totalElements', billingRecords.totalElements);
    }
    //eslint-disable-next-line
  }, [billingRecords]);

  useEffect(() => {
    getSupportAdmins().then(setSupportAdmins);
  }, []);

  useDebounceEffect(
    () => {
      const fObj = {};
      if (statusFilter && statusFilter.length > 0) {
        fObj['status'] = statusFilter.join(',');
      }
      if (invoiceTypeFilter && invoiceTypeFilter.length > 0) {
        fObj['invoiceType'] = invoiceTypeFilter.join(',');
      }
      if (ownerFilter) {
        fObj['stakeholders'] = user.username;
      }
      if (startdate) {
        const date = startdate.trim();
        fObj['start'] = date;
      }
      if (enddate) {
        const date = enddate.trim();
        fObj['end'] = date;
      }
      setAttestationFilterObject(fObj);
      store.set('attestationFilter', JSON.stringify(fObj));
    },
    200,
    [ownerFilter, statusFilter, invoiceTypeFilter, startdate, enddate]
  );

  const ownerFilteringHandler = async (e) => {
    setOwnerFilter(e);
  };

  return (
    <div className="w-full">
      <div className="box-border px-40 w-full flex justify-center shadow-lg min-h-[8rem] max-small-device-max:px-24">
        <div className="container px-0 flex flex-wrap gap-16 items-center">
          <FormProvider {...filterForm}>
            <AttestationsFilteringComponent
              ownerFilterHandler={ownerFilteringHandler}
              ownerFilter={ownerFilter}
              administrators={supportAdmins}
            />
          </FormProvider>
        </div>
      </div>

      <main className="px-24 md:px-40 pb-40 w-full">
        <div className="container mx-auto p-0 w-full">
          <Disclosure as="div" defaultOpen={false} className="mt-32 flex flex-col gap-16">
            <div>
              <h1 className="p-0 m-0">Godkänn fakturaunderlag</h1>
            </div>
            <DisclosurePanel static>
              <FormProvider {...tableForm}>
                <AttestationsTable
                  setSelectedRecord={setSelectedRecord}
                  setShowSelectedRecord={setShowSelectedRecord}
                />
              </FormProvider>
            </DisclosurePanel>
          </Disclosure>
        </div>
      </main>

      {selectedRecord && (
        <AttestationInvoiceWrapperComponent
          show={showSelectedRecord}
          label={'Attestering av fakturapost'}
          closeHandler={() => {
            setSelectedRecord(undefined);
            setShowSelectedRecord(false);
          }}
        >
          <AttestationInvoiceForm
            selectedrecord={selectedRecord}
            update={(recordId: string) => {
              getBillingRecord(recordId, municipalityId).then(setSelectedRecord);
            }}
          />
        </AttestationInvoiceWrapperComponent>
      )}
    </div>
  );
};
