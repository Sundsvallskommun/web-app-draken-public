import { ErrandsData } from '@casedata/interfaces/errand';
import { useBillingStore, useCasedataStore, useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { attestationEnabled } from '@common/services/feature-flag-service';
import { useUserQuery } from '@common/services/use-user-query';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import store from '@supportmanagement/services/storage-service';
import { getBillingRecords } from '@supportmanagement/services/support-billing-service';
import {
  getLabelSubTypeFromName,
  getLabelTypeFromName,
  getStatusLabel,
  Status,
  useSupportErrands,
} from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
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
  const { watch: watchFilter, reset: resetFilter, trigger: triggerFilter, getValues } = filterForm;

  const sortData = store.get('sort');
  let sort: { sortColumn: string; sortOrder: 'asc' | 'desc'; pageSize: number } | undefined;

  if (sortData) {
    sort = JSON.parse(sortData);
  }

  const tableForm = useForm<TableForm>({
    defaultValues: {
      sortColumn: sort?.sortColumn || 'touched',
      sortOrder: sort?.sortOrder || 'desc',
      pageSize: sort?.pageSize || 12,
      page: 0,
    },
  });
  const { watch: watchTable, setValue: setTableValue } = tableForm;
  const { sortOrder, sortColumn, pageSize, page } = watchTable();

  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const administrators = useUserStore((s) => s.administrators);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const setSelectedSupportErrandStatuses = useSupportStore((s) => s.setSelectedSupportErrandStatuses);
  const setSidebarLabel = useCasedataStore((s) => s.setSidebarLabel);
  const sidebarLabel = useCasedataStore((s) => s.sidebarLabel);
  const solvedSupportErrands = useSupportStore((s) => s.solvedSupportErrands);
  const setBillingRecords = useBillingStore((s) => s.setBillingRecords);

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

  const initialFocus = useRef<HTMLButtonElement>(null);

  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);
  const { data: userData } = useUserQuery();

  useEffect(() => {
    if (userData) {
      setUser(userData);
    }
  }, [userData]);

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
            (Array.from(
              new Set(
                filter?.labelType
                  ?.split(',')
                  .map((n: string) => getLabelTypeFromName(n, supportMetadata!))
                  .map((t: { displayName?: string } | undefined) => t?.displayName)
              )
            ) as string[]) || SupportManagementValues.labelType,
          labelSubType:
            (Array.from(
              new Set(
                filter?.labelSubType
                  ?.split(',')
                  .map((n: string) => getLabelSubTypeFromName(n, supportMetadata!))
                  .map((t: { displayName?: string } | undefined) => t?.displayName)
              )
            ) as string[]) || SupportManagementValues.labelSubType,
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
        const filterStatuses = filter?.status?.split(',') || SupportManagementValues.status;
        const selectedStatusLabel = getStatusLabel(
          filterStatuses.map((s: string) => (Status as Record<string, string>)[s])
        );
        setSidebarLabel(selectedStatusLabel ?? '');
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
      resetFilter(storedFilters);
      triggerFilter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFilter, triggerFilter, user.username, supportMetadata]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSupportErrand(undefined as unknown as any);
    //eslint-disable-next-line
  }, [router]);

  useEffect(() => {
    if (errands) {
      setSupportErrand(undefined as unknown as any);
      setTableValue('page', errands.page!);
      setTableValue('size', errands.size!);
      setTableValue('totalPages', errands.totalPages!);
      setTableValue('totalElements', errands.totalElements!);
    }
    //eslint-disable-next-line
  }, [errands]);

  useDebounceEffect(
    () => {
      const fObj: Record<string, string | boolean> = {};
      const extraFilterObj: Record<string, string> = {};
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
        const allTypesFlattened = supportMetadata?.labels?.labelStructure?.map((l) => l.labels).flat() ?? [];
        const matchedTypes = allTypesFlattened.filter((l) => l && labelTypeFilter.includes(l.displayName!));
        const matchedTypeNames = matchedTypes.map((t) => t!.resourcePath);
        fObj['labelType'] = matchedTypeNames.join(',');
      }
      if (labelSubTypeFilter && labelSubTypeFilter.length > 0) {
        // The labelSubType filter is a list of displayNames, but the API expects names
        // so we need to convert the displayNames to names before sending the filter
        //
        // This is because the names are unique, but the displayNames are not
        // and we want to be able to filter on multiple types with the same displayName
        const allTypesFlattened = supportMetadata?.labels?.labelStructure?.map((l) => l.labels).flat() ?? [];
        const allSubTypesFlattened =
          allTypesFlattened
            .filter((l) => l && (l.labels?.length ?? 0) > 0)
            .map((l) => l!.labels)
            .flat() ?? [];
        const matchedSubTypes = (allSubTypesFlattened ?? []).filter(
          (l) => l && labelSubTypeFilter.includes(l.displayName!)
        );
        const matchedSubTypeNames = matchedSubTypes.map((t) => t!.resourcePath);
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
      setSelectedSupportErrandStatuses(statusFilter);
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

  const ownerFilteringHandler = async (e: boolean) => {
    setOwnerFilter(e);
  };

  const numberOfFilters =
    getValues().category.length +
    getValues().channel.length +
    getValues().admins.length +
    getValues().labelCategory.length +
    getValues().labelSubType.length +
    getValues().labelType.length +
    (getValues().enddate !== '' ? 1 : 0) +
    (getValues().startdate !== '' ? 1 : 0) +
    getValues().priority.length +
    (ownerFilter ? 1 : 0);

  return (
    <div className="w-full">
      <div className="box-border py-10 px-40 w-full flex justify-center shadow-lg min-h-[8rem] max-small-device-max:px-24">
        <div className="w-full container px-0">
          <FormProvider {...filterForm}>
            <SupportManagementFiltering
              numberOfFilters={numberOfFilters}
              ownerFilterHandler={ownerFilteringHandler}
              ownerFilter={ownerFilter}
              administrators={administrators}
            />
          </FormProvider>
        </div>
      </div>

      <main className="pl-40 pb-40 w-full">
        <div className="container mx-auto p-0 w-full">
          <div className="mt-32 flex flex-col gap-16">
            <div>
              <h1 className="p-0 m-0">
                {sidebarLabel || 'Ärenden'}
                {sidebarLabel === 'Avslutade ärenden' ? ' : ' + (solvedSupportErrands ?? '') : null}
              </h1>
            </div>
            <div>
              <FormProvider {...tableForm}>
                <SupportErrandsTable />
              </FormProvider>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
