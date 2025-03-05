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

import { isIK, isLOP } from '@common/services/application-service';
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
  const [show, setShow] = useState<boolean>(true);

  return (
    <div className="w-fit flex flex-col md:flex-row justify-start items-center p-10 gap-4 flex-wrap">
      {isLOP() || isIK() ? (
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
  );
};

export default SupportManagementFiltering;
