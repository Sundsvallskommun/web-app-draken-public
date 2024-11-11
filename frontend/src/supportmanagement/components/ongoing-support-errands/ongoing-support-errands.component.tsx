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
  getLabelTypeFromDisplayName,
  getLabelTypeFromName,
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

  useEffect(() => {
    setValue('status', selectedSupportErrandStatuses);
  }, [selectedSupportErrandStatuses]);

  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  const router = useRouter();
  const { user, setUser } = useAppContext();

  useEffect(() => {
    const filterdata = store.get('filter');

    if (filterdata && supportMetadata) {
      let filter;
      let storedFilters;
      try {
        filter = JSON.parse(filterdata);
        storedFilters = {
          category: filter?.category?.split(',') || SupportManagementValues.category,
          labelCategory: filter?.labelCategory?.split(',') || SupportManagementValues.labelCategory,
          type: filter?.type?.split(',') || SupportManagementValues.type,
          labelType:
            Array.from(
              new Set(
                filter?.labelType
                  ?.split(',')
                  .map((n) => getLabelTypeFromName(n, supportMetadata))
                  .map((t) => t?.displayName)
              )
            ) || SupportManagementValues.labelType,
          labelSubType:
            Array.from(
              new Set(
                filter?.labelSubType
                  ?.split(',')
                  .map((n) => getLabelSubTypeFromName(n, supportMetadata))
                  .map((t) => t?.displayName)
              )
            ) || SupportManagementValues.labelSubType,
          priority: filter?.priority?.split(',') || SupportManagementValues.priority,
          channel: filter?.channel?.split(',') || SupportManagementValues.channel,
          status: filter?.status !== '' ? filter?.status?.split(',') || SupportManagementValues.status : [],
          startdate: filter?.start || SupportManagementValues.startdate,
          enddate: filter?.end || SupportManagementValues.enddate,
          admins:
            filter?.stakeholders !== user.username
              ? filter?.stakeholders?.split(',') || SupportManagementValues.admins
              : [],
        };
      } catch (error) {
        store.set('filter', JSON.stringify({}));
        storedFilters = {
          category: SupportManagementValues.category,
          labelCategory: SupportManagementValues.labelCategory,
          type: SupportManagementValues.type,
          labelType: SupportManagementValues.labelType,
          labelSubType: SupportManagementValues.labelSubType,
          priority: SupportManagementValues.priority,
          channel: SupportManagementValues.channel,
          status: SupportManagementValues.status,
          startdate: SupportManagementValues.startdate,
          enddate: SupportManagementValues.enddate,
          admins: [],
        };
      }
      if (filter?.stakeholders === user.username) {
        setOwnerFilter(true);
      }
      if (storedFilters.status) {
        setSelectedSupportErrandStatuses(storedFilters.status || [Status.ONGOING]);
      }
      resetFilter(storedFilters);
      triggerFilter();
    }
  }, [resetFilter, triggerFilter, user.username, supportMetadata]);

  useEffect(() => {
    const sortData = store.get('sort');

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
    // NOTE: If we set focus on the next button
    //       the browser will automatically scroll
    //       down to the button.
    setInitialFocus();
    getMe().then((user) => {
      setUser(user);
    });
    setSupportErrand(undefined);
    //eslint-disable-next-line
  }, [router]);

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

  useEffect(() => {
    // getAdminUsers().then((data) => {
    //   setAdministrators(data);
    // });
    getSupportAdmins().then(setSupportAdmins);
    //eslint-disable-next-line
  }, []);

  useDebounceEffect(
    () => {
      const fObj = {};
      const extraFilterObj = {};
      if (priorityFilter && priorityFilter.length > 0) {
        fObj['priority'] = priorityFilter.join(',');
      }
      if (categoryFilter && categoryFilter.length > 0) {
        fObj['category'] = categoryFilter.join(',');
      }
      if (labelCategoryFilter && labelCategoryFilter.length > 0) {
        fObj['labelCategory'] = labelCategoryFilter.join(',');
      }
      if (statusFilter && statusFilter.length > 0) {
        fObj['status'] = statusFilter.join(',');
      }
      if (typeFilter && typeFilter.length > 0) {
        fObj['type'] = typeFilter.join(',');
      }
      if (labelTypeFilter && labelTypeFilter.length > 0) {
        // The labelType filter is a list of displayNames, but the API expects names
        // so we need to convert the displayNames to names before sending the filter
        //
        // This is because the names are unique, but the displayNames are not
        // and we want to be able to filter on multiple types with the same displayName
        const allTypesFlattened = supportMetadata?.labels?.labelStructure?.map((l) => l.labels).flat();
        const matchedTypes = allTypesFlattened.filter((l) => labelTypeFilter.includes(l.displayName));
        const matchedTypeNames = matchedTypes.map((t) => t.name);
        fObj['labelType'] = matchedTypeNames.join(',');
      }
      if (labelSubTypeFilter && labelSubTypeFilter.length > 0) {
        // The labelSubType filter is a list of displayNames, but the API expects names
        // so we need to convert the displayNames to names before sending the filter
        //
        // This is because the names are unique, but the displayNames are not
        // and we want to be able to filter on multiple types with the same displayName
        const allTypesFlattened = supportMetadata?.labels?.labelStructure?.map((l) => l.labels).flat();
        const allSubTypesFlattened = allTypesFlattened
          ?.filter((l) => l.labels?.length > 0)
          .map((l) => l.labels)
          .flat();
        const matchedSubTypes = allSubTypesFlattened.filter((l) => labelSubTypeFilter.includes(l.displayName));
        const matchedSubTypeNames = matchedSubTypes.map((t) => t.name);
        fObj['labelSubType'] = matchedSubTypeNames.join(',');
      }
      if (channelFilter && channelFilter.length > 0) {
        fObj['channel'] = channelFilter.join(',');
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
      setFilterObject(fObj);
      setExtraFilter(extraFilterObj);
      store.set('filter', JSON.stringify(fObj));
    },
    200,
    [
      queryFilter,
      ownerFilter,
      priorityFilter,
      categoryFilter,
      labelCategoryFilter,
      statusFilter,
      typeFilter,
      labelTypeFilter,
      labelSubTypeFilter,
      channelFilter,
      administratorFilter,
      startdate,
      enddate,
    ]
  );

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
      <div className="box-border py-10 px-40 w-full flex justify-center shadow-lg min-h-[8rem] max-small-device-max:px-24">
        <div className="container px-0 flex flex-wrap gap-16 items-center">
          <FormProvider {...filterForm}>
            <SupportManagementFilterQuery />
          </FormProvider>
          <Link
            href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}
            target="_blank"
            data-cy="register-new-errand-button"
          >
            <Button
              color={isMEX() || isPT() ? 'primary' : 'vattjom'}
              variant={isMEX() || isPT() ? 'tertiary' : 'primary'}
            >
              Nytt ärende
            </Button>
          </Link>
        </div>
      </div>

      <main className="px-24 md:px-40 pb-40 w-full">
        <div className="container mx-auto p-0 w-full">
          <Disclosure as="div" defaultOpen={false} className="mt-32 flex flex-col gap-16">
            <div>
              <FormProvider {...filterForm}>
                <SupportManagementFiltering
                  ownerFilterHandler={ownerFilteringHandler}
                  ownerFilter={ownerFilter}
                  administrators={supportAdmins}
                />
              </FormProvider>
            </div>

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
