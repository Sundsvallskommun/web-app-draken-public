import { Admin } from '@common/services/user-service';
import { useAppContext } from '@contexts/app.context';
import { Button, Checkbox, cx } from '@sk-web-gui/react';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { useState } from 'react';
import {
  CaseAdminsFilter,
  CaseAdminsValues,
  SupportManagementFilterAdmins,
} from './components/supportmanagement-filter-admins.component';
import {
  CategoryFilter,
  CategoryValues,
  SupportManagementFilterCategory,
} from './components/supportmanagement-filter-category.component';
import {
  SupportManagementDatesFilter,
  SupportManagementDatesValues,
  SupportManagementFilterDates,
} from './components/supportmanagement-filter-dates.component';
import {
  SupportManagementFilterPriority,
  SupportManagementPriorityFilter,
  SupportManagementPriorityValues,
} from './components/supportmanagement-filter-priority.component';
import {
  SupportManagementQueryFilter,
  SupportManagementQueryValues,
} from './components/supportmanagement-filter-query.component';

import { isLOP } from '@common/services/application-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  ChannelFilter,
  ChannelValues,
  SupportManagementFilterChannel,
} from './components/supportmanagement-filter-channel.component';
import {
  LabelCategoryFilter,
  LabelCategoryValues,
  SupportManagementFilterLabelCategory,
} from './components/supportmanagement-filter-labelCategory.component';
import {
  LabelSubTypeFilter,
  LabelSubTypeValues,
  SupportManagementFilterLabelSubType,
} from './components/supportmanagement-filter-labelSubType.component';
import {
  LabelTypeFilter,
  LabelTypeValues,
  SupportManagementFilterLabelType,
} from './components/supportmanagement-filter-labelType.component';
import {
  SupportManagementStatusFilter,
  SupportManagementStatusValues,
} from './components/supportmanagement-filter-sidebarstatus-selector.component';
import { SupportManagementFilterTags } from './components/supportmanagement-filter-tags.component';
import {
  SupportManagementFilterType,
  TypeFilter,
  TypeValues,
} from './components/supportmanagement-filter-type.component';

export type SupportManagementFilter = CategoryFilter &
  LabelCategoryFilter &
  TypeFilter &
  LabelTypeFilter &
  LabelSubTypeFilter &
  ChannelFilter &
  SupportManagementPriorityFilter &
  SupportManagementDatesFilter &
  CaseAdminsFilter &
  SupportManagementStatusFilter &
  SupportManagementQueryFilter;
export const SupportManagementValues = {
  ...CategoryValues,
  ...LabelCategoryValues,
  ...TypeValues,
  ...LabelTypeValues,
  ...LabelSubTypeValues,
  ...ChannelValues,
  ...SupportManagementPriorityValues,
  ...SupportManagementDatesValues,
  ...CaseAdminsValues,
  ...SupportManagementStatusValues,
  ...SupportManagementQueryValues,
};

const SupportManagementFiltering: React.FC<{
  ownerFilterHandler: (b: boolean) => void;
  ownerFilter?: boolean;
  administrators?: (SupportAdmin | Admin)[];
}> = ({ ownerFilterHandler = () => false, ownerFilter, administrators = [] }) => {
  const [show, setShow] = useState<boolean>(false);
  const { selectedSupportErrandStatuses: selectedSupportErrandStatuses, sidebarButtons } = useAppContext();

  return (
    <>
      <div className="flex flex-col w-full gap-24">
        <div className="w-full flex items-start md:items-center justify-between flex-col md:flex-row gap-12">
          <h1 className="p-0 m-0">
            {sidebarButtons && selectedSupportErrandStatuses
              ? sidebarButtons?.find((s) => selectedSupportErrandStatuses.includes(s.key))?.label
              : 'Ärenden'}
          </h1>

          <div className="w-full md:max-w-[48rem]">
            {/*
            * TODO needs better API support
            <SupportManagementFilterQuery />
            */}
          </div>
          <Button
            className="w-full md:w-auto"
            onClick={() => setShow(!show)}
            data-cy="show-filters-button"
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
            {isLOP() ? (
              <>
                <div className="relative max-md:w-full">
                  <SupportManagementFilterLabelCategory />
                </div>
                <div className="relative max-md:w-full">
                  <SupportManagementFilterLabelType />
                </div>
                <div className="relative max-md:w-full">
                  <SupportManagementFilterLabelSubType />
                </div>
              </>
            ) : (
              <>
                <div className="relative max-md:w-full">
                  <SupportManagementFilterCategory />
                </div>
                <div className="relative max-md:w-full">
                  <SupportManagementFilterType />
                </div>
              </>
            )}
            <div className="relative max-md:w-full">
              <SupportManagementFilterPriority />
            </div>
            <div className="relative max-md:w-full">
              <SupportManagementFilterDates />
            </div>
            <div className="relative max-md:w-full">
              <SupportManagementFilterAdmins administrators={administrators} />
            </div>
            <div className="relative max-md:w-full">
              <SupportManagementFilterChannel />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-start gap-16">
          <Checkbox checked={ownerFilter} onChange={() => ownerFilterHandler(!ownerFilter)}>
            Mina ärenden
          </Checkbox>
          <SupportManagementFilterTags administrators={administrators} />
        </div>
      </div>
    </>
  );
};

export default SupportManagementFiltering;
