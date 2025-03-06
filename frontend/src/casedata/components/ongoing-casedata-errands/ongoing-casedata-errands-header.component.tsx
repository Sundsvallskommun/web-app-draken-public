import { FormProvider, useForm } from 'react-hook-form';
import { CasedataFilterQuery } from '../casedata-filtering/components/casedata-filter-query.component';
import CaseDataFiltering, { CaseDataFilter, CaseDataValues } from '../casedata-filtering/casedata-filtering.component';
import { Button, Checkbox, Link, Logo } from '@sk-web-gui/react';
import NextLink from 'next/link';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { getApplicationEnvironment, getApplicationName } from '@common/services/application-service';
import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import store from '@supportmanagement/services/storage-service';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAdminUsers, getMe } from '@common/services/user-service';
import { CasedataFilterTags } from '../casedata-filtering/components/casedata-filter-tags.component';
import { getStatusLabel, useErrands } from '@casedata/services/casedata-errand-service';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { useRouter } from 'next/router';
import { TableForm } from './ongoing-casedata-errands.component';

const OngoingCaseDataHeader: React.FC = () => {
  const applicationName = getApplicationName();
  const applicationEnvironment = getApplicationEnvironment();

  const filterForm = useForm<CaseDataFilter>({ defaultValues: CaseDataValues });
  const { watch: watchFilter, reset: resetFilter, trigger: triggerFilter, setValue } = filterForm;
  const tableForm = useForm<TableForm>({ defaultValues: { sortColumn: 'updated', sortOrder: 'desc', pageSize: 12 } });
  const { watch: watchTable, setValue: setTableValue } = tableForm;
  const { sortOrder, sortColumn, pageSize, page } = watchTable();

  const {
    municipalityId,
    setErrand,
    setAdministrators,
    administrators,
    selectedErrandStatuses,
    setSelectedErrandStatuses,
    setSidebarLabel,
  }: AppContextInterface = useAppContext();
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

  useEffect(() => {
    setValue('status', selectedErrandStatuses);
  }, [selectedErrandStatuses]);

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
        const filterStatuses = filter?.status?.split(',') || CaseDataValues.status;
        setSelectedErrandStatuses(filterStatuses);
        const selectedStatusLabel = getStatusLabel(filterStatuses.map((s) => ErrandStatus[s]));
        setSidebarLabel(selectedStatusLabel);
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

  const ownerFilterHandler = (e) => {
    return setOwnerFilter(e);
  };
  return (
    <div className="bg-background-content w-full z-sticky px-24 py-24 shadow-md flex flex-row gap-16 justify-between">
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

      <div className="max-w-[1600px] w-full mr-52">
        <FormProvider {...filterForm}>
          <div className="flex">
            <CasedataFilterQuery />{' '}
            <CaseDataFiltering
              ownerFilterHandler={(e) => {
                return setOwnerFilter(e);
              }}
              ownerFilter={ownerFilter}
              administrators={administrators}
            />
          </div>

          <div className="flex flex-col md:flex-row justify-start gap-16">
            <Checkbox
              data-cy="myErrands-filter"
              checked={ownerFilter}
              onChange={() => ownerFilterHandler(!ownerFilter)}
            >
              Mina ärenden
            </Checkbox>
            <CasedataFilterTags administrators={administrators} />
          </div>
        </FormProvider>
      </div>
      <Link
        href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}
        target="_blank"
        data-cy="register-new-errand-button"
      >
        <Button color={'primary'} variant={'tertiary'}>
          Nytt ärende
        </Button>
      </Link>
    </div>
  );
};

export default OngoingCaseDataHeader;
