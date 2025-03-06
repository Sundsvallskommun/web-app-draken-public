import { Button, Checkbox, Link, Logo } from '@sk-web-gui/react';
import NextLink from 'next/link';
import { SupportManagementFilterQuery } from '../supportmanagement-filtering/components/supportmanagement-filter-query.component';
import { SupportManagementFilterTags } from '../supportmanagement-filtering/components/supportmanagement-filter-tags.component';
import SupportManagementFiltering, {
  SupportManagementFilter,
  SupportManagementValues,
} from '../supportmanagement-filtering/supportmanagement-filtering.component';
import { FormProvider, useForm } from 'react-hook-form';
import { getApplicationEnvironment, getApplicationName } from '@common/services/application-service';
import { TableForm } from './ongoing-support-errands.component';
import store from '@supportmanagement/services/storage-service';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { getSupportAdmins } from '@supportmanagement/services/support-admin-service';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getMe } from '@common/services/user-service';
import { attestationEnabled } from '@common/services/feature-flag-service';
import { getBillingRecords } from '@supportmanagement/services/support-billing-service';
import {
  getLabelSubTypeFromName,
  getLabelTypeFromName,
  getStatusLabel,
  Status,
  useSupportErrands,
} from '@supportmanagement/services/support-errand-service';
import { useAppContext } from '@contexts/app.context';
import { useRouter } from 'next/router';

const OngoingSupportManagementHeader: React.FC = () => {
  const applicationName = getApplicationName();
  const applicationEnvironment = getApplicationEnvironment();
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
    supportAdmins,
    municipalityId,
    selectedSupportErrandStatuses,
    setSelectedSupportErrandStatuses,
    setSidebarLabel,
    setBillingRecords,
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
        const filterStatuses = filter?.status?.split(',') || SupportManagementValues.status;
        setSelectedSupportErrandStatuses(filterStatuses);
        const selectedStatusLabel = getStatusLabel(filterStatuses.map((s) => Status[s]));
        setSidebarLabel(selectedStatusLabel);
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
    <div className="bg-background-content w-full z-sticky px-24 py-22 shadow-md flex flex-row gap-16 justify-between">
      <div className="sm:w-[32rem] sm:min-w-[32rem]">
        <NextLink
          href="/"
          className="no-underline"
          aria-label={`Draken - ${
            applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')
          }. Gå till startsidan.`}
        >
          <Logo
            variant="service"
            title={'Draken'}
            subtitle={applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')}
          />
        </NextLink>
      </div>

      <div className="max-w-[1600px] w-full">
        <FormProvider {...filterForm}>
          <div className="flex items-center">
            <SupportManagementFilterQuery />{' '}
            <SupportManagementFiltering
              ownerFilterHandler={(e) => {
                return ownerFilteringHandler(e);
              }}
              ownerFilter={ownerFilter}
              administrators={supportAdmins}
            />
          </div>

          <div className="flex flex-col md:flex-row justify-start gap-16">
            <SupportManagementFilterTags administrators={supportAdmins} />
          </div>
        </FormProvider>
      </div>
      <Link
        href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}
        target="_blank"
        data-cy="register-new-errand-button"
      >
        <Button size="sm" color={'vattjom'} variant="primary">
          Nytt ärende
        </Button>
      </Link>
    </div>
  );
};

export default OngoingSupportManagementHeader;
