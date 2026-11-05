'use client';

import { getCustomerIdFromErrand } from '@common/services/customer-service';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { TableForm } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { closedStatuses, SupportErrand, useSupportErrands } from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useMemo } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { SupportStakeholdersTable } from './stakeholders-table.component';

// Only closed errands can have an issued permit.
const CLOSED_ERRANDS_FILTER = { status: closedStatuses.join(',') };

/**
 * Entry point of the customer view: lists closed errands, and a click opens the errand's customer.
 * Stands in for a real customer list until there is an API for one.
 */
export const CustomerErrands: FC = () => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const router = useRouter();
  const toastMessage = useSnackbar();
  const tableForm = useForm<TableForm>({
    defaultValues: { sortColumn: 'touched', sortOrder: 'desc', pageSize: 12, page: 0 },
  });
  const { control, setValue } = tableForm;
  const { sortColumn, sortOrder, pageSize, page } = useWatch({ control });
  const sort = useMemo(() => ({ [sortColumn as string]: sortOrder as 'asc' | 'desc' }), [sortColumn, sortOrder]);

  const errands = useSupportErrands(municipalityId, page, pageSize, CLOSED_ERRANDS_FILTER, sort);

  useEffect(() => {
    setValue('page', errands.page ?? 0);
    setValue('totalPages', errands.totalPages ?? 0);
  }, [errands, setValue]);

  const openCustomer = (errand: SupportErrand) => {
    const customerId = getCustomerIdFromErrand(errand);
    if (customerId) {
      router.push(`/kundbild/${customerId}`);
    } else {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: `Ärende ${errand.errandNumber} saknar kund`,
        status: 'error',
      });
    }
  };

  return (
    <FormProvider {...tableForm}>
      {/* <SupportErrandsTable statuses={closedStatuses} rowAction={{ label: 'öppna kund', onClick: openCustomer }} /> */}
      <SupportStakeholdersTable />
    </FormProvider>
  );
};
