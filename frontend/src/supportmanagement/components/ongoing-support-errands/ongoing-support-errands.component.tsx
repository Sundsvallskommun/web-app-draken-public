import { ErrandsData } from '@casedata/interfaces/errand';
import { useAppContext } from '@common/contexts/app.context';
import { isMEX, isPT } from '@common/services/application-service';
import { getMe } from '@common/services/user-service';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { Disclosure } from '@headlessui/react';
import { Button, Link } from '@sk-web-gui/react';
import store from '@supportmanagement/services/storage-service';
import { getSupportAdmins } from '@supportmanagement/services/support-admin-service';
import {
  getLabelSubTypeFromName,
  getLabelTypeFromName,
  getStatusLabel,
  Status,
  useSupportErrands,
} from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { SupportManagementFilterQuery } from '../supportmanagement-filtering/components/supportmanagement-filter-query.component';
import SupportManagementFiltering, {
  SupportManagementFilter,
  SupportManagementValues,
} from '../supportmanagement-filtering/supportmanagement-filtering.component';
import { SupportErrandsTable } from './components/supporterrands-table.component';
import { getBillingRecords } from '@supportmanagement/services/support-billing-service';
import { attestationEnabled } from '@common/services/feature-flag-service';

export interface TableForm {
  sortOrder: 'asc' | 'desc';
  sortColumn: string;
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

export const OngoingSupportErrands: React.FC<{ ongoing: ErrandsData }> = (props) => {
  const filterForm = useForm<SupportManagementFilter>({ defaultValues: SupportManagementValues });
  const { watch: watchFilter, reset: resetFilter, trigger: triggerFilter, getValues, setValue } = filterForm;

  const sortData = store.get('sort');
  let sort: { sortColumn: string; sortOrder: 'asc' | 'desc'; pageSize: number };

  if (sortData) {
    sort = JSON.parse(sortData);
  }

  const tableForm = useForm<TableForm>({
    defaultValues: {
      sortColumn: sort?.sortColumn || 'touched',
      sortOrder: sort?.sortOrder || 'desc',
      pageSize: sort?.pageSize || 12,
    },
  });
  const { watch: watchTable, setValue: setTableValue } = tableForm;
  const { sortOrder, sortColumn, pageSize, page } = watchTable();

  const {
    supportMetadata,
    setSupportErrand,
    setSupportAdmins,
    setAvatar,
    supportAdmins,
    municipalityId,
    selectedSupportErrandStatuses,
    setSelectedSupportErrandStatuses,
    setSidebarLabel,
    setBillingRecords,
    sidebarLabel,
    solvedSupportErrands,
  } = useAppContext();

  const startdate = watchFilter('startdate');
  const enddate = watchFilter('enddate');
  const queryFilter = watchFilter('query');
  const [ownerFilter, setOwnerFilter] = useState(false);
  const administratorFilter = watchFilter('admins');
  const priorityFilter = watchFilter('priority');
  const statusFilter = watchFilter('status');
  const categoryFilter = watchFilter('category');
  const labelCategoryFilter = watchFilter('labelCategory');
  const typeFilter = watchFilter('type');
  const labelTypeFilter = watchFilter('labelType');
  const labelSubTypeFilter = watchFilter('labelSubType');
  const channelFilter = watchFilter('channel');
  const sortObject = useMemo(() => ({ [sortColumn]: sortOrder }), [sortColumn, sortOrder]);
  const [filterObject, setFilterObject] = useState<{ [key: string]: string | boolean }>();
  const [extraFilter, setExtraFilter] = useState<{ [key: string]: string }>();

  const errands = useSupportErrands(municipalityId, page, pageSize, filterObject, sortObject, extraFilter);

  const initialFocus = useRef(null);

  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  const router = useRouter();
  const { user, setUser } = useAppContext();

  useEffect(() => {
    const sortData = store.get('sort');
    if (attestationEnabled(user)) {
      getBillingRecords(municipalityId, 0, pageSize, {}, { modified: 'desc' }).then(setBillingRecords);
    }

    if (sortData) {
      try {
        let sort = JSON.parse(sortData);
        setTableValue('size', sort.size);
        setTableValue('sortOrder', sort.sortOrder);
        setTableValue('sortColumn', sort.sortColumn);
        setTableValue('pageSize', sort.pageSize);
      } catch (error) {
        store.set('sort', JSON.stringify({}));
      }
    }
  }, []);

  useEffect(() => {
    setTableValue('page', 0);
    //eslint-disable-next-line
  }, [filterObject, sortColumn, sortOrder, pageSize]);

  useEffect(() => {
    if (errands) {
      setSupportErrand(undefined);
      setTableValue('page', errands.page);
      setTableValue('size', errands.size);
      setTableValue('totalPages', errands.totalPages);
      setTableValue('totalElements', errands.totalElements);
    }
    //eslint-disable-next-line
  }, [errands]);

  useDebounceEffect(
    () => {
      store.set('sort', JSON.stringify(watchTable()));
    },
    200,
    [watchTable, sortObject, pageSize]
  );

  const ownerFilteringHandler = async (e) => {
    setOwnerFilter(e);
  };

  return (
    <div className="w-full">
      <main className="px-24 md:px-40 pb-40 w-full">
        <div className="container mx-auto p-0 w-full">
          <Disclosure as="div" defaultOpen={false} className="mt-32 flex flex-col gap-16">
            <h1 className="p-0 m-0">
              {sidebarLabel || 'Ärenden'}
              {sidebarLabel === 'Avslutade ärenden' ? ' : ' + solvedSupportErrands.totalElements : null}
            </h1>
            <Disclosure.Panel static>
              <FormProvider {...tableForm}>
                <SupportErrandsTable />
              </FormProvider>
            </Disclosure.Panel>
          </Disclosure>
        </div>
      </main>
    </div>
  );
};
