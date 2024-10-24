import { useErrands } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { getAdminUsers, getMe } from '@common/services/user-service';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { Disclosure } from '@headlessui/react';
import store from '@supportmanagement/services/storage-service';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import CaseDataFiltering, { CaseDataFilter, CaseDataValues } from '../casedata-filtering/casedata-filtering.component';
import { ErrandsTable } from './components/errands-table.component';

export interface TableForm {
  sortOrder: 'asc' | 'desc';
  sortColumn: string;
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

export const OngoingCaseDataErrands: React.FC = () => {
  const filterForm = useForm<CaseDataFilter>({ defaultValues: CaseDataValues });
  const { watch: watchFilter, reset: resetFilter, trigger: triggerFilter } = filterForm;
  const tableForm = useForm<TableForm>({ defaultValues: { sortColumn: 'updated', sortOrder: 'desc', pageSize: 12 } });
  const { watch: watchTable, setValue: setTableValue } = tableForm;
  const { sortOrder, sortColumn, pageSize, page } = watchTable();

  const { municipalityId, setErrand, setAdministrators, administrators } = useAppContext();
  const startdate = watchFilter('startdate');
  const enddate = watchFilter('enddate');
  const queryFilter = watchFilter('query');
  const [ownerFilter, setOwnerFilter] = useState(false);
  const administratorFilter = watchFilter('admins');
  const priorityFilter = watchFilter('priority');
  const caseTypeFilter = watchFilter('caseType');
  const statusFilter = watchFilter('status');
  const propertyDesignation = watchFilter('propertyDesignation');
  const phaseFilter = watchFilter('phase');
  const sortObject = useMemo(() => ({ [sortColumn]: sortOrder }), [sortColumn, sortOrder]);
  const [filterObject, setFilterObject] = useState<{ [key: string]: string | boolean }>();
  const [extraFilter, setExtraFilter] = useState<{ [key: string]: string }>();

  const errands = useErrands(municipalityId, page, pageSize, filterObject, sortObject, extraFilter);
  const initialFocus = useRef(null);

  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  const router = useRouter();
  const { user, setUser } = useAppContext();

  useEffect(() => {
    const filterdata = store.get('filter');

    if (filterdata) {
      let filter;
      let storedFilters;
      try {
        filter = JSON.parse(filterdata);
        storedFilters = {
          caseType: filter?.caseType?.split(',') || CaseDataValues.caseType,
          priority: filter?.priority?.split(',') || CaseDataValues.priority,
          status: filter?.status !== '' ? filter?.status?.split(',') || CaseDataValues.status : CaseDataValues.status,
          startdate: filter?.start || CaseDataValues.startdate,
          enddate: filter?.end || CaseDataValues.enddate,
          admins:
            filter?.stakeholders !== user.username ? filter?.stakeholders?.split(',') || CaseDataValues.admins : [],
          phase: filter?.phase !== '' ? filter?.phase?.split(',') || CaseDataValues.phase : CaseDataValues.phase,
        };
      } catch (error) {
        store.set('filter', JSON.stringify({}));
        storedFilters = {
          caseType: CaseDataValues.caseType,
          priority: CaseDataValues.priority,
          status: CaseDataValues.status,
          startdate: CaseDataValues.startdate,
          enddate: CaseDataValues.enddate,
          admins: [],
          phase: CaseDataValues.phase,
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
    const sortData = store.get('sort');

    if (sortData) {
      try {
        let sort = JSON.parse(sortData);
        setTableValue('size', sort.size);
        setTableValue('pageSize', sort.pageSize);
        setTableValue('sortOrder', sort.sortOrder);
        setTableValue('sortColumn', sort.sortColumn);
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
    // NOTE: If we set focus on the next button
    //       the browser will automatically scroll
    //       down to the button.
    setInitialFocus();
    getMe().then((user) => {
      setUser(user);
    });
    setErrand(undefined);
    //eslint-disable-next-line
  }, [router]);

  useEffect(() => {
    if (errands) {
      setErrand(undefined);
      setTableValue('page', errands.page);
      setTableValue('size', errands.size);
      setTableValue('totalPages', errands.totalPages);
      setTableValue('totalElements', errands.totalElements);
    }
    //eslint-disable-next-line
  }, [errands]);

  useEffect(() => {
    getAdminUsers().then((data) => {
      setAdministrators(data);
    });
    //eslint-disable-next-line
  }, []);

  useDebounceEffect(
    () => {
      const fObj = {};
      const extraFilterObj = {};
      if (priorityFilter && priorityFilter.length > 0) {
        fObj['priority'] = priorityFilter.join(',');
      }
      if (caseTypeFilter && caseTypeFilter.length > 0) {
        fObj['caseType'] = caseTypeFilter.join(',');
      }
      if (statusFilter && statusFilter.length > 0) {
        fObj['status'] = statusFilter.join(',');
      }
      if (queryFilter) {
        fObj['query'] = queryFilter.replace(/\+/g, '').replace(/ /g, '+');
      }
      if (administratorFilter && administratorFilter.length > 0) {
        fObj['stakeholders'] = administratorFilter.join(',');
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
      if (propertyDesignation) {
        extraFilterObj['propertyDesignation'] = propertyDesignation;
      }
      if (phaseFilter && phaseFilter.length > 0) {
        fObj['phase'] = phaseFilter;
      }
      setFilterObject(fObj);
      setExtraFilter(extraFilterObj);
      store.set('filter', JSON.stringify(fObj));
    },
    200,
    [
      queryFilter,
      ownerFilter,
      priorityFilter,
      caseTypeFilter,
      statusFilter,
      administratorFilter,
      startdate,
      enddate,
      propertyDesignation,
      phaseFilter,
    ]
  );

  useDebounceEffect(
    () => {
      store.set('sort', JSON.stringify(watchTable()));
    },
    200,
    [watchTable, sortObject, pageSize]
  );

  return (
    <main className="px-24 md:px-40 pb-40">
      <div className="container mx-auto p-0 max-w-content ">
        <Disclosure as="div" defaultOpen={false} className="mt-32 flex flex-col gap-16">
          <div>
            <FormProvider {...filterForm}>
              <CaseDataFiltering
                ownerFilterHandler={(e) => {
                  return setOwnerFilter(e);
                }}
                ownerFilter={ownerFilter}
                administrators={administrators}
              />
            </FormProvider>
          </div>

          <Disclosure.Panel static>
            <FormProvider {...tableForm}>
              <ErrandsTable />
            </FormProvider>
          </Disclosure.Panel>
        </Disclosure>
      </div>
    </main>
  );
};