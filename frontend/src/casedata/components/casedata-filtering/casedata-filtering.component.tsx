import {
  CasePhaseFilter,
  CasePhaseValues,
  CasedataFilterPhase,
} from '@casedata/components/casedata-filtering/components/casedata-filter-phase.component';
import { isPT } from '@common/services/application-service';
import { Admin } from '@common/services/user-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Checkbox, cx, Link } from '@sk-web-gui/react';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { useState } from 'react';
import {
  CaseAdminsFilter,
  CaseAdminsValues,
  CasedataFilterAdmins,
} from './components/casedata-filter-admins.component';
import {
  CaseTypeFilter,
  CaseTypeValues,
  CasedataFilterCaseType,
} from './components/casedata-filter-casetype.component';
import { CaseDatesFilter, CaseDatesValues, CasedataFilterDates } from './components/casedata-filter-dates.component';
import {
  CasePriorityFilter,
  CasePriorityValues,
  CasedataFilterPriority,
} from './components/casedata-filter-priority.component';
import {
  CasePropertyDesignationFilter,
  CasePropertyDesignationValues,
  CasedataFilterPropertyDesignation,
} from './components/casedata-filter-propertyDesignation';
import { CaseQueryFilter, CaseQueryValues, CasedataFilterQuery } from './components/casedata-filter-query.component';
import {
  CaseStatusFilter,
  CaseStatusValues,
  CasedataFilterStatus,
} from './components/casedata-filter-status.component';
import { CasedataFilterTags } from './components/casedata-filter-tags.component';
import { useAppContext } from '@contexts/app.context';

export type CaseDataFilter = CaseTypeFilter &
  CaseStatusFilter &
  CasePriorityFilter &
  CaseDatesFilter &
  CaseAdminsFilter &
  CaseQueryFilter &
  CasePropertyDesignationFilter &
  CasePhaseFilter;
export const CaseDataValues = {
  ...CaseTypeValues,
  ...CaseStatusValues,
  ...CasePriorityValues,
  ...CaseDatesValues,
  ...CaseAdminsValues,
  ...CaseQueryValues,
  ...CasePropertyDesignationValues,
  ...CasePhaseValues,
};

const CaseDataFiltering: React.FC<{
  ownerFilterHandler: (b: boolean) => void;
  ownerFilter?: boolean;
  administrators?: (SupportAdmin | Admin)[];
  numberOfFilters: number;
}> = ({ numberOfFilters, ownerFilterHandler = () => false, ownerFilter, administrators = [] }) => {
  const [show, setShow] = useState<boolean>(false);
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
              leftIcon={<LucideIcon name="list-filter" size="1.8rem" />}
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
