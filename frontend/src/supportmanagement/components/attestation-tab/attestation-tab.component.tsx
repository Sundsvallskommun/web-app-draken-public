import { DetailPanelWrapper } from '@common/components/detail-panel-wrapper/detail-panel-wrapper.component';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { useBillingStore, useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { useUiSettingsStore } from '@stores/ui-settings-store';
import { AttestationInvoiceForm } from '@supportmanagement/components/attestation-tab/attestation-invoice-form.component';
import AttestationsFilteringComponent, {
  AttestationFilter,
  AttestationValues,
} from '@supportmanagement/components/attestation-tab/components/attestation-filtering/attestations-filtering.component';
import {
  AttestationsTable,
  AttestationTableForm,
} from '@supportmanagement/components/attestation-tab/components/attestations-table.component';
import {
  getBillingRecord,
  getBillingRecords,
  useBillingRecords,
} from '@supportmanagement/services/support-billing-service';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { CBillingRecord } from 'src/data-contracts/backend/data-contracts';

export const AttestationTab = () => {
  const filterForm = useForm<AttestationFilter>({ defaultValues: AttestationValues });
  const { watch: watchFilter, reset: resetFilter, trigger: triggerFilter } = filterForm;
  const tableForm = useForm<AttestationTableForm>({
    defaultValues: { sortColumn: 'modified', sortOrder: 'desc', pageSize: 12 },
  });
  const { watch: watchTable, setValue: setTableValue } = tableForm;
  const sortOrder = watchTable('sortOrder');
  const sortColumn = watchTable('sortColumn');
  const pageSize = watchTable('pageSize');
  const page = watchTable('page');

  const [showSelectedRecord, setShowSelectedRecord] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<CBillingRecord | undefined>(undefined);

  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const setBillingRecords = useBillingStore((s) => s.setBillingRecords);
  const administrators = useUserStore((s) => s.administrators);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const storedAttestationFilter = useUiSettingsStore((s) => s.attestationFilter);
  const setStoredAttestationFilter = useUiSettingsStore((s) => s.setAttestationFilter);

  const startdate = watchFilter('startdate');
  const enddate = watchFilter('enddate');
  const [ownerFilter, setOwnerFilter] = useState(false);
  const statusFilter = watchFilter('status');
  const invoiceTypeFilter = watchFilter('invoiceType');
  const sortObject = useMemo(() => ({ [sortColumn]: sortOrder }), [sortColumn, sortOrder]);
  const [attestationFilterObject, setAttestationFilterObject] = useState<{ [key: string]: string | boolean }>();
  const billingRecords = useBillingRecords(municipalityId, page, pageSize, attestationFilterObject, sortObject);
  const initialFocus = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    getBillingRecords(municipalityId, page, pageSize, attestationFilterObject, sortObject).then(setBillingRecords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId, page, pageSize, attestationFilterObject, sortObject]);

  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };
  const router = useRouter();
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (storedAttestationFilter && Object.keys(storedAttestationFilter).length > 0) {
      let storedFilters;
      try {
        storedFilters = {
          invoiceType: (storedAttestationFilter?.invoiceType as string)?.split(',') || AttestationValues.invoiceType,
          status:
            storedAttestationFilter?.status !== ''
              ? (storedAttestationFilter?.status as string)?.split(',') || AttestationValues.status
              : [],
          startdate: (storedAttestationFilter?.start as string) || AttestationValues.startdate,
          enddate: (storedAttestationFilter?.end as string) || AttestationValues.enddate,
        };
      } catch (error) {
        setStoredAttestationFilter({});
        storedFilters = {
          invoiceType: AttestationValues.invoiceType,
          status: AttestationValues.status,
          startdate: AttestationValues.startdate,
          enddate: AttestationValues.enddate,
        };
      }
      if (storedAttestationFilter?.stakeholders === user.username) {
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
    setSupportErrand(undefined as unknown as any);
    getBillingRecords(municipalityId);
    //eslint-disable-next-line
  }, [router]);

  useEffect(() => {
    if (billingRecords) {
      setSupportErrand(undefined as unknown as any);
      setTableValue('size', billingRecords.size!);
      setTableValue('totalPages', billingRecords.totalPages!);
      setTableValue('totalElements', billingRecords.totalElements!);
    }
    //eslint-disable-next-line
  }, [billingRecords]);

  useDebounceEffect(
    () => {
      const fObj: Record<string, string | boolean> = {};
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
      setStoredAttestationFilter(fObj);
    },
    200,
    [ownerFilter, statusFilter, invoiceTypeFilter, startdate, enddate]
  );

  const ownerFilteringHandler = async (e: boolean) => {
    setOwnerFilter(e);
  };

  return (
    <div className="w-full h-screen relative flex flex-col overflow-hidden">
      <div className="box-border px-40 w-full flex justify-center shadow-lg min-h-[8rem] max-small-device-max:px-24 flex-shrink-0">
        <div className="container px-0 flex flex-wrap gap-16 items-center">
          <FormProvider {...filterForm}>
            <AttestationsFilteringComponent
              ownerFilterHandler={ownerFilteringHandler}
              ownerFilter={ownerFilter}
              administrators={administrators}
            />
          </FormProvider>
        </div>
      </div>

      <main className="px-24 md:px-40 pb-40 w-full flex-1 overflow-auto">
        <div className="container mx-auto p-0 w-full">
          <div className="mt-32 flex flex-col gap-16">
            <div>
              <h1 className="p-0 m-0">Godkänn fakturaunderlag</h1>
            </div>
            <div>
              <FormProvider {...tableForm}>
                <AttestationsTable
                  setSelectedRecord={setSelectedRecord}
                  setShowSelectedRecord={setShowSelectedRecord}
                />
              </FormProvider>
            </div>
          </div>
        </div>
      </main>

      {selectedRecord && (
        <DetailPanelWrapper
          show={showSelectedRecord}
          label="Attestering av fakturapost"
          closeAriaLabel="Stäng fakturapost"
          closeHandler={() => {
            setSelectedRecord(undefined);
            setShowSelectedRecord(false);
          }}
          icon="glasses"
          dataCy="invoice"
        >
          <AttestationInvoiceForm
            selectedrecord={selectedRecord}
            update={(recordId: string) => {
              getBillingRecord(recordId, municipalityId).then(setSelectedRecord);
            }}
          />
        </DetailPanelWrapper>
      )}
    </div>
  );
};
