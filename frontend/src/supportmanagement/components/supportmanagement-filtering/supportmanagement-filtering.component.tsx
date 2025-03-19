import { Admin } from '@common/services/user-service';
import { Button, Checkbox, cx, Link } from '@sk-web-gui/react';
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
  SupportManagementFilterQuery,
  SupportManagementQueryFilter,
  SupportManagementQueryValues,
} from './components/supportmanagement-filter-query.component';

import { isKA, usesThreeLevelCategorization, usesTwoLevelCategorization } from '@common/services/application-service';
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
  numberOfFilters: number;
}> = ({ numberOfFilters, ownerFilterHandler = () => false, ownerFilter, administrators = [] }) => {
  const [show, setShow] = useState<boolean>(true);

  return (
    <>
      <div className="flex flex-col w-full gap-16 py-19">
        <div className="w-full flex flex-wrap items-start md:items-center justify-between md:flex-row gap-16">
          <SupportManagementFilterQuery />
          <div className="flex gap-16">
            <Button
              onClick={() => setShow(!show)}
              data-cy="show-filters-button"
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
            <div className="flex flex-col md:flex-row justify-start items-center p-10 gap-4 bg-background-200 rounded-groups flex-wrap">
              {usesTwoLevelCategorization() ? (
                <>
                  <div className="relative max-md:w-full">
                    <SupportManagementFilterCategory />
                  </div>
                  <div className="relative max-md:w-full">
                    <SupportManagementFilterType />
                  </div>
                </>
              ) : null}

              {usesThreeLevelCategorization() || isKA() ? (
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
              ) : null}

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
            <div className="min-w-fit">
              <Checkbox checked={ownerFilter} onChange={() => ownerFilterHandler(!ownerFilter)}>
                Mina ärenden
              </Checkbox>
            </div>
          </div>
          <div className="mt-16">
            <SupportManagementFilterTags administrators={administrators} />
          </div>
        </div>
      </div>
    </>
  );
};

export default SupportManagementFiltering;
