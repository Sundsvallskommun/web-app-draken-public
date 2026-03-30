import {
  CaseChannelFilter,
  CaseChannelValues,
  CasedataFilterChannel,
} from '@casedata/components/casedata-filtering/components/casedata-filter-channel.component';
import {
  CasedataFilterPhase,
  CasePhaseFilter,
  CasePhaseValues,
} from '@casedata/components/casedata-filtering/components/casedata-filter-phase.component';
import { isPT } from '@common/services/application-service';
import { Admin } from '@common/services/user-service';
import { appConfig } from '@config/appconfig';
import { useAppContext } from '@contexts/app.context';
import { Button, Checkbox, cx, Link } from '@sk-web-gui/react';
import { ListFilter } from 'lucide-react';
import { FC, useState } from 'react';

import {
  CaseAdminsFilter,
  CaseAdminsValues,
  CasedataFilterAdmins,
} from './components/casedata-filter-admins.component';
import {
  CasedataFilterCaseType,
  CaseTypeFilter,
  CaseTypeValues,
} from './components/casedata-filter-casetype.component';
import { CasedataFilterDates, CaseDatesFilter, CaseDatesValues } from './components/casedata-filter-dates.component';
import {
  CasedataFilterPriority,
  CasePriorityFilter,
  CasePriorityValues,
} from './components/casedata-filter-priority.component';
import {
  CasedataFilterPropertyDesignation,
  CasePropertyDesignationFilter,
  CasePropertyDesignationValues,
} from './components/casedata-filter-propertyDesignation';
import { CasedataFilterQuery, CaseQueryFilter, CaseQueryValues } from './components/casedata-filter-query.component';
import {
  CasedataStakeholderType,
  CaseStakeholderTypeFilter,
  CaseStakeholderTypeValues,
} from './components/casedata-filter-stakeholder-type.component';
import {
  CasedataFilterStatus,
  CaseStatusFilter,
  CaseStatusValues,
} from './components/casedata-filter-status.component';
import { CasedataFilterTags } from './components/casedata-filter-tags.component';

export type CaseDataFilter = CaseTypeFilter &
  CaseStatusFilter &
  CasePriorityFilter &
  CaseDatesFilter &
  CaseAdminsFilter &
  CaseQueryFilter &
  CasePropertyDesignationFilter &
  CasePhaseFilter &
  CaseChannelFilter &
  CaseStakeholderTypeFilter;
export const CaseDataValues = {
  ...CaseTypeValues,
  ...CaseStatusValues,
  ...CasePriorityValues,
  ...CaseDatesValues,
  ...CaseAdminsValues,
  ...CaseQueryValues,
  ...CasePropertyDesignationValues,
  ...CasePhaseValues,
  ...CaseChannelValues,
  ...CaseStakeholderTypeValues,
};

const CaseDataFiltering: FC<{
  ownerFilterHandler: (b: boolean) => void;
  ownerFilter?: boolean;
  administrators?: Admin[];
  numberOfFilters: number;
}> = ({ numberOfFilters, ownerFilterHandler = () => false, ownerFilter, administrators = [] }) => {
  const [show, setShow] = useState<boolean>(true);
  const { selectedErrandStatuses } = useAppContext();

  return (
    <>
      <div className="flex flex-col w-full gap-16 py-19">
        <div className="w-full flex flex-wrap items-start md:items-center justify-between md:flex-row gap-16">
          <CasedataFilterQuery />
          <div className="flex gap-16">
            <Button
              onClick={() => setShow(!show)}
              data-cy="Show-filters-button"
              color="vattjom"
              variant={show ? 'tertiary' : 'primary'}
              inverted={show ? false : true}
              leftIcon={<ListFilter size="1.8rem" />}
            >
              {show ? 'Dölj filter' : `Visa filter ${numberOfFilters !== 0 ? `(${numberOfFilters})` : ''}`}
            </Button>
            <Link
              href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}
              target="_blank"
              data-cy="register-new-errand-button"
            >
              <Button color={'vattjom'} variant={'primary'}>
                Nytt ärende
              </Button>
            </Link>
          </div>
        </div>

        <div className={cx(show ? 'visible' : 'hidden')}>
          <div className="flex gap-16 items-center">
            <div className="w-full flex flex-col md:flex-row justify-start items-center p-10 gap-4 bg-background-200 rounded-groups flex-wrap">
              {!isPT() ? (
                <div className="relative max-md:w-full">
                  <CasedataFilterPropertyDesignation />
                </div>
              ) : ['ArendeAvslutat', 'ArendeInkommit', 'Tilldelat'].every(
                  (s) => !selectedErrandStatuses.includes(s)
                ) ? (
                <div className="relative max-md:w-full">
                  <CasedataFilterStatus />
                </div>
              ) : null}
              <div className="relative max-md:w-full">
                <CasedataFilterCaseType />
              </div>
              <div className="relative max-md:w-full">
                <CasedataFilterPriority />
              </div>
              <div className="relative max-md:w-full">
                <CasedataFilterDates />
              </div>
              <div className="relative max-md:w-full">
                <CasedataFilterAdmins administrators={administrators} />
              </div>
              {!isPT() &&
              ['ArendeAvslutat', 'ArendeInkommit', 'Tilldelat'].every((s) => !selectedErrandStatuses.includes(s)) ? (
                <div className="relative max-md:w-full">
                  <CasedataFilterStatus />
                </div>
              ) : (
                <div className="relative max-md:w-full">
                  <CasedataFilterPhase />
                </div>
              )}
              <div className="relative max-md:w-full">
                <CasedataFilterChannel />
              </div>
              {appConfig.features.useOrganizationStakeholders && (
                <div className="relative max-md:w-full">
                  <CasedataStakeholderType />
                </div>
              )}
            </div>
            <div className="min-w-fit">
              <Checkbox
                data-cy="myErrands-filter"
                checked={ownerFilter}
                onChange={() => ownerFilterHandler(!ownerFilter)}
              >
                Mina ärenden
              </Checkbox>
            </div>
          </div>
          <div className="mt-16">
            <CasedataFilterTags administrators={administrators} />
          </div>
        </div>
      </div>
    </>
  );
};

export default CaseDataFiltering;
