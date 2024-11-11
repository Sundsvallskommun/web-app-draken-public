import {
  CasePhaseFilter,
  CasePhaseValues,
  CasedataFilterPhase,
} from '@casedata/components/casedata-filtering/components/casedata-filter-phase.component';
import { isPT } from '@common/services/application-service';
import { Admin } from '@common/services/user-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Checkbox, cx } from '@sk-web-gui/react';
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
}> = ({ ownerFilterHandler = () => false, ownerFilter, administrators = [] }) => {
  const [show, setShow] = useState<boolean>(false);
  const { selectedErrandStatuses, sidebarLabel } = useAppContext();
  return (
    <>
      <div className="flex flex-col w-full gap-24">
        <div className="w-full flex items-start md:items-center justify-between flex-col md:flex-row gap-12">
          <h1 className="p-0 m-0">{sidebarLabel || 'Ärenden'}</h1>

          {/* <div className="w-full md:max-w-[48rem]">
            <CasedataFilterQuery />
          </div> */}
          <Button
            className="w-full md:w-auto"
            onClick={() => setShow(!show)}
            data-cy="Show-filters-button"
            color="vattjom"
            variant={show ? 'tertiary' : 'primary'}
            inverted={show ? false : true}
            leftIcon={<LucideIcon name="list-filter" size="1.8rem" />}
          >
            {show ? 'Dölj filter' : 'Filter'}
          </Button>
        </div>

        <div className={cx(show ? 'visible' : 'hidden')}>
          <div className="w-full flex flex-col md:flex-row justify-start items-center p-10 gap-4 bg-background-200 rounded-groups flex-wrap">
            {!isPT() ? (
              <div className="relative max-md:w-full">
                <CasedataFilterPropertyDesignation />
              </div>
            ) : (
              <div className="relative max-md:w-full">
                <CasedataFilterStatus />
              </div>
            )}
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
            {!isPT() ? (
              <div className="relative max-md:w-full">
                <CasedataFilterStatus />
              </div>
            ) : (
              <div className="relative max-md:w-full">
                <CasedataFilterPhase />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-start gap-16">
          <Checkbox data-cy="myErrands-filter" checked={ownerFilter} onChange={() => ownerFilterHandler(!ownerFilter)}>
            Mina ärenden
          </Checkbox>
          <CasedataFilterTags administrators={administrators} />
        </div>
      </div>
    </>
  );
};

export default CaseDataFiltering;
