'use client';

import { getCustomerIdFromErrand } from '@common/services/customer-service';
import { useSnackbar } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { TableForm } from '@supportmanagement/components/ongoing-support-errands/ongoing-support-errands.component';
import { closedStatuses, SupportErrand, useSupportErrands } from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { SupportStakeholdersTable } from './stakeholders-table.component';
import { TableSearch } from './table-search.component';

// Only closed errands can have an issued permit.
const CLOSED_ERRANDS_FILTER = { status: closedStatuses.join(','), hasCustomer: true };

/**
 * Entry point of the customer view: lists closed errands, and a click opens the errand's customer.
 * Stands in for a real customer list until there is an API for one.
 */
export const CustomerErrands: FC = () => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const router = useRouter();
  const toastMessage = useSnackbar();
  const tableForm = useForm<TableForm>({
    defaultValues: { sortColumn: 'touched', sortOrder: 'desc', pageSize: 12, page: 0 },
  });
  const { control, setValue } = tableForm;
  const { sortColumn, sortOrder, pageSize, page } = useWatch({ control });
  const sort = useMemo(() => ({ [sortColumn as string]: sortOrder as 'asc' | 'desc' }), [sortColumn, sortOrder]);
  const [term, setTerm] = useState('');
  const errandFilter = useMemo(
    () => (term ? { ...CLOSED_ERRANDS_FILTER, query: encodeURIComponent(term) } : CLOSED_ERRANDS_FILTER),
    [term]
  );

  const errands = useSupportErrands(municipalityId, page, pageSize, errandFilter, sort);

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
        message: t('common:customer.list.customers.errandWithoutCustomer', { errandNumber: errand.errandNumber }),
        status: 'error',
      });
    }
  };

  return (
    <FormProvider {...tableForm}>
      {/* <SupportErrandsTable statuses={closedStatuses} rowAction={{ label: 'öppna kund', onClick: openCustomer }} /> */}
      <div className="flex flex-col gap-16">
        <TableSearch
          data-cy="customer-search"
          placeholder={t('common:customer.list.customers.search')}
          onSearch={setTerm}
        />
        <SupportStakeholdersTable />
      </div>
    </FormProvider>
  );
};
