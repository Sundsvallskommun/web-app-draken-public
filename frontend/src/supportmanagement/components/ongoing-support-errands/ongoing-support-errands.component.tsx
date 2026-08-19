import { ErrandsData } from '@casedata/interfaces/errand';
import { attestationEnabled } from '@common/services/feature-flag-service';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { useBillingStore, useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { useUiSettingsStore } from '@stores/ui-settings-store';
import {
  parsePersistedLabelFilterSelections,
  serializeLabelFilterSelections,
  SUPPORT_MANAGEMENT_LABEL_FILTER_PARAMETER,
} from '@supportmanagement/filters/label-filter-persistence';
import type { LabelFilterSelection } from '@supportmanagement/filters/label-filter-projector';
import { projectLabelFilterGroups } from '@supportmanagement/filters/label-filter-projector';
import { normalizeLabelFilterSelections } from '@supportmanagement/filters/label-filter-selection';
import { useInvestigationProfileStore } from '@supportmanagement/investigation/investigation-profile-store';
import { getBillingRecords } from '@supportmanagement/services/support-billing-service';
import {
  getLabelSubTypeFromName,
  getLabelTypeFromName,
  getStatusLabel,
  Status,
  useSupportErrands,
} from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/navigation';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import SupportManagementFiltering, {
  type SupportManagementFilter,
  type SupportManagementLabelFilterState,
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

export const OngoingSupportErrands: FC<{ ongoing: ErrandsData }> = (props) => {
  const filterForm = useForm<SupportManagementFilter>({ defaultValues: SupportManagementValues });
  const {
    watch: watchFilter,
    reset: resetFilter,
    trigger: triggerFilter,
    getValues,
    setValue: setFilterValue,
  } = filterForm;

  const storedSort = useUiSettingsStore((s) => s.sort);

  const tableForm = useForm<TableForm>({
    defaultValues: {
      sortColumn: (storedSort?.sortColumn as string) || 'touched',
      sortOrder: (storedSort?.sortOrder as 'asc' | 'desc') || 'desc',
      pageSize: (storedSort?.pageSize as number) || 12,
      page: 0,
    },
  });
  const { watch: watchTable, setValue: setTableValue } = tableForm;
  const { sortOrder, sortColumn, pageSize, page } = watchTable();

  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const labelFilterProfile = useInvestigationProfileStore((state) => state.profile?.labelFilter);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const administrators = useUserStore((s) => s.administrators);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const setSelectedErrandStatuses = useUiSettingsStore((s) => s.setSelectedErrandStatuses);
  const selectedErrandStatuses = useUiSettingsStore((s) => s.selectedErrandStatuses);
  const setSidebarLabel = useUiSettingsStore((s) => s.setSidebarLabel);
  const sidebarLabel = useUiSettingsStore((s) => s.sidebarLabel);
  const solvedSupportErrands = useUiSettingsStore((s) => s.closedErrands);
  const setBillingRecords = useBillingStore((s) => s.setBillingRecords);
  const storedFilter = useUiSettingsStore((s) => s.filter);
  const setStoredFilter = useUiSettingsStore((s) => s.setFilter);
  const setStoredSort = useUiSettingsStore((s) => s.setSort);

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
  const labelFilterSelections = watchFilter('labelFilter');
  const channelFilter = watchFilter('channel');
  const sortObject = useMemo(() => ({ [sortColumn]: sortOrder }), [sortColumn, sortOrder]);

  const labelFilterState = useMemo<SupportManagementLabelFilterState>(() => {
    if (!labelFilterProfile) return { status: 'legacy' };
    if (!supportMetadata) return { status: 'loading' };
    if (!Array.isArray(supportMetadata.labels?.labelStructure)) return { status: 'error' };

    try {
      return {
        status: 'ready',
        projections: projectLabelFilterGroups(labelFilterProfile.groups, supportMetadata.labels.labelStructure),
      };
    } catch {
      return { status: 'error' };
    }
  }, [labelFilterProfile, supportMetadata]);

  const normalizedLabelFilterSelections = useMemo<readonly LabelFilterSelection[]>(
    () =>
      labelFilterState.status === 'ready'
        ? normalizeLabelFilterSelections(labelFilterState.projections, labelFilterSelections)
        : [],
    [labelFilterSelections, labelFilterState]
  );

  const [filterObject, setFilterObject] = useState<{ [key: string]: string | boolean } | undefined>(() => {
    const safeEntries = Object.entries(storedFilter).filter(
      ([key]) =>
        key !== SUPPORT_MANAGEMENT_LABEL_FILTER_PARAMETER &&
        (!labelFilterProfile || !['labelCategory', 'labelType', 'labelSubType'].includes(key))
    );
    return safeEntries.length > 0 ? Object.fromEntries(safeEntries) : undefined;
  });
  const filterInitialized = useRef(false);

  const errands = useSupportErrands(municipalityId, page, pageSize, filterObject, sortObject);

  const initialFocus = useRef<HTMLButtonElement>(null);

  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };

  const router = useRouter();
  const user = useUserStore((s) => s.user);

  useEffect(() => {
    if (!supportMetadata) return;

    if (storedFilter && Object.keys(storedFilter).length > 0) {
      let storedFilters;
      try {
        const projectedLabelSelections =
          labelFilterState.status === 'ready'
            ? normalizeLabelFilterSelections(
                labelFilterState.projections,
                parsePersistedLabelFilterSelections(storedFilter[SUPPORT_MANAGEMENT_LABEL_FILTER_PARAMETER])
              )
            : [];
        storedFilters = {
          category: (storedFilter?.category as string)?.split(',') || SupportManagementValues.category,
          labelCategory:
            labelFilterState.status === 'legacy'
              ? (storedFilter?.labelCategory as string)?.split(',') || SupportManagementValues.labelCategory
              : [],
          type: (storedFilter?.type as string)?.split(',') || SupportManagementValues.type,
          labelType:
            labelFilterState.status === 'legacy'
              ? (Array.from(
                  new Set(
                    (storedFilter?.labelType as string)
                      ?.split(',')
                      .map((n: string) => getLabelTypeFromName(n, supportMetadata))
                      .map((t: { displayName?: string } | undefined) => t?.displayName)
                  )
                ) as string[]) || SupportManagementValues.labelType
              : [],
          labelSubType:
            labelFilterState.status === 'legacy'
              ? (Array.from(
                  new Set(
                    (storedFilter?.labelSubType as string)
                      ?.split(',')
                      .map((n: string) => getLabelSubTypeFromName(n, supportMetadata))
                      .map((t: { displayName?: string } | undefined) => t?.displayName)
                  )
                ) as string[]) || SupportManagementValues.labelSubType
              : [],
          labelFilter: [...projectedLabelSelections],
          priority: (storedFilter?.priority as string)?.split(',') || SupportManagementValues.priority,
          channel: (storedFilter?.channel as string)?.split(',') || SupportManagementValues.channel,
          status:
            storedFilter?.status !== ''
              ? ((storedFilter?.status as string)?.split(',') as Status[]) || SupportManagementValues.status
              : [],
          startdate: (storedFilter?.start as string) || SupportManagementValues.startdate,
          enddate: (storedFilter?.end as string) || SupportManagementValues.enddate,
          admins:
            storedFilter?.stakeholders !== user.username
              ? (storedFilter?.stakeholders as string)?.split(',') || SupportManagementValues.admins
              : [],
        };
        const filterStatuses = (storedFilter?.status as string)?.split(',') || SupportManagementValues.status;
        const selectedStatusLabel = getStatusLabel(
          filterStatuses.map((s: string) => (Status as Record<string, string>)[s]) as Status[]
        );
        setSidebarLabel(selectedStatusLabel ?? '');
      } catch (error) {
        setStoredFilter({});
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
          labelFilter: [],
        };
      }
      if (storedFilter?.stakeholders === user.username) {
        setOwnerFilter(true);
      }
      resetFilter(storedFilters);
      triggerFilter();
    }
    filterInitialized.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFilter, triggerFilter, user.username, supportMetadata, labelFilterState]);

  useEffect(() => {
    const currentStatus = JSON.stringify(getValues('status'));
    const storeStatus = JSON.stringify(selectedErrandStatuses);
    if (currentStatus !== storeStatus) {
      setFilterValue('status', selectedErrandStatuses as Status[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedErrandStatuses]);

  useEffect(() => {
    if (attestationEnabled(user)) {
      getBillingRecords(municipalityId, 0, pageSize, {}, { modified: 'desc' }).then(setBillingRecords);
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
      if (!filterInitialized.current) return;
      const fObj: Record<string, string | boolean> = {};
      if (priorityFilter && priorityFilter.length > 0) {
        fObj['priority'] = priorityFilter.join(',');
      }
      if (categoryFilter && categoryFilter.length > 0) {
        fObj['category'] = categoryFilter.join(',');
      }
      if (labelFilterState.status === 'legacy' && labelCategoryFilter && labelCategoryFilter.length > 0) {
        fObj['labelCategory'] = labelCategoryFilter.join(',');
      }
      if (statusFilter && statusFilter.length > 0) {
        fObj['status'] = statusFilter.join(',');
      }
      if (typeFilter && typeFilter.length > 0) {
        fObj['type'] = typeFilter.join(',');
      }
      if (labelFilterState.status === 'legacy' && labelTypeFilter && labelTypeFilter.length > 0) {
        const allTypesFlattened = supportMetadata?.labels?.labelStructure?.map((l) => l.labels).flat() ?? [];
        const matchedTypes = allTypesFlattened.filter((l) => l && labelTypeFilter.includes(l.displayName!));
        const matchedTypeNames = matchedTypes.map((t) => t!.resourcePath);
        fObj['labelType'] = matchedTypeNames.join(',');
      }
      if (labelFilterState.status === 'legacy' && labelSubTypeFilter && labelSubTypeFilter.length > 0) {
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
        fObj['query'] = queryFilter;
      }
      if (labelFilterState.status === 'ready' && normalizedLabelFilterSelections.length > 0) {
        fObj[SUPPORT_MANAGEMENT_LABEL_FILTER_PARAMETER] = serializeLabelFilterSelections(
          normalizedLabelFilterSelections
        );
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
      if (JSON.stringify(fObj) !== JSON.stringify(filterObject)) {
        setFilterObject(fObj);
      }
      setSelectedErrandStatuses(statusFilter);
      setStoredFilter(fObj);
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
      normalizedLabelFilterSelections,
      labelFilterState.status,
    ]
  );

  useDebounceEffect(
    () => {
      setStoredSort(watchTable() as unknown as Record<string, string | number>);
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
    normalizedLabelFilterSelections.length +
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
              labelFilterState={labelFilterState}
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
