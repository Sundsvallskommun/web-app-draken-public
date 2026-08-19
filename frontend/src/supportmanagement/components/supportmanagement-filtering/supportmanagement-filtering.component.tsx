import { isLOK } from '@common/services/application-service';
import { Admin } from '@common/services/user-service';
import { appConfig } from '@config/appconfig';
import { Alert, Button, Checkbox, cx, Link } from '@sk-web-gui/react';
import { labelFilterSelectionsEqual } from '@supportmanagement/filters/label-filter-persistence';
import type {
  LabelFilterGroupProjection,
  LabelFilterSelection,
} from '@supportmanagement/filters/label-filter-projector';
import { normalizeLabelFilterSelections } from '@supportmanagement/filters/label-filter-selection';
import { ProjectedLabelFilters } from '@supportmanagement/filters/projected-label-filters.component';
import { isSupportRegistrationEnabled } from '@supportmanagement/investigation/investigation-profile';
import { useInvestigationProfileStore } from '@supportmanagement/investigation/investigation-profile-store';
import { ListFilter } from 'lucide-react';
import { FC, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

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
  ChannelFilter,
  ChannelValues,
  SupportManagementFilterChannel,
} from './components/supportmanagement-filter-channel.component';
import {
  SupportManagementDatesFilter,
  SupportManagementDatesValues,
  SupportManagementFilterDates,
} from './components/supportmanagement-filter-dates.component';
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
  SupportManagementFilterPriority,
  SupportManagementPriorityFilter,
  SupportManagementPriorityValues,
} from './components/supportmanagement-filter-priority.component';
import {
  SupportManagementFilterQuery,
  SupportManagementQueryFilter,
  SupportManagementQueryValues,
} from './components/supportmanagement-filter-query.component';
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
  SupportManagementQueryFilter & {
    labelFilter: LabelFilterSelection[];
  };
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
  labelFilter: [] as LabelFilterSelection[],
};

export type SupportManagementLabelFilterState =
  | { readonly status: 'legacy' }
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly projections: readonly LabelFilterGroupProjection[] };

const SupportManagementFiltering: FC<{
  ownerFilterHandler: (b: boolean) => void;
  ownerFilter?: boolean;
  administrators?: Admin[];
  numberOfFilters: number;
  labelFilterState: SupportManagementLabelFilterState;
}> = ({ numberOfFilters, ownerFilterHandler = () => false, ownerFilter, administrators = [], labelFilterState }) => {
  const [show, setShow] = useState<boolean>(true);
  const registrationEnabled = useInvestigationProfileStore((state) => isSupportRegistrationEnabled(state.profile));
  const { setValue, watch } = useFormContext<SupportManagementFilter>();
  const labelFilterSelections = watch('labelFilter');
  const normalizedLabelFilterSelections = useMemo(
    () =>
      labelFilterState.status === 'ready'
        ? normalizeLabelFilterSelections(labelFilterState.projections, labelFilterSelections)
        : [],
    [labelFilterSelections, labelFilterState]
  );

  useEffect(() => {
    if (!labelFilterSelectionsEqual(labelFilterSelections, normalizedLabelFilterSelections)) {
      setValue('labelFilter', [...normalizedLabelFilterSelections]);
    }
  }, [labelFilterSelections, normalizedLabelFilterSelections, setValue]);

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
              leftIcon={<ListFilter size="1.8rem" />}
            >
              {show ? 'Dölj filter' : `Visa filter ${numberOfFilters !== 0 ? `(${numberOfFilters})` : ''}`}
            </Button>
            {registrationEnabled && (
              <Link
                href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}
                target="_blank"
                data-cy="register-new-errand-button"
              >
                <Button color={'vattjom'} variant={'primary'}>
                  Nytt ärende
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className={cx(show ? 'visible' : 'hidden')}>
          <div className="flex gap-16 items-center">
            <div className="flex flex-col md:flex-row justify-start items-center p-10 gap-4 bg-background-200 rounded-groups flex-wrap">
              {appConfig.features.useTwoLevelCategorization ? (
                <>
                  <div className="relative max-md:w-full">
                    <SupportManagementFilterCategory />
                  </div>
                  <div className="relative max-md:w-full">
                    <SupportManagementFilterType />
                  </div>
                </>
              ) : null}

              {labelFilterState.status === 'ready' ? (
                <ProjectedLabelFilters
                  projections={labelFilterState.projections}
                  selections={normalizedLabelFilterSelections}
                  onChange={(selections) =>
                    setValue('labelFilter', [...selections], { shouldDirty: true, shouldTouch: true })
                  }
                />
              ) : labelFilterState.status === 'loading' ? (
                <span className="px-8 text-small">Etikettfilter läses in …</span>
              ) : labelFilterState.status === 'error' ? (
                <Alert type="warning" className="max-w-[50rem]" data-cy="label-filter-warning">
                  <Alert.Icon />
                  <Alert.Content>
                    <Alert.Content.Description>
                      Etikettfiltren kunde inte läsas in. Inga etikettval används i sökningen.
                    </Alert.Content.Description>
                  </Alert.Content>
                </Alert>
              ) : appConfig.features.useThreeLevelCategorization ? (
                <>
                  <div className="relative max-md:w-full">
                    <SupportManagementFilterLabelCategory />
                  </div>
                  <div className="relative max-md:w-full">
                    <SupportManagementFilterLabelType />
                  </div>
                  {!isLOK() ? (
                    <div className="relative max-md:w-full">
                      <SupportManagementFilterLabelSubType />
                    </div>
                  ) : null}
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
            <SupportManagementFilterTags
              administrators={administrators}
              labelFilterProjections={labelFilterState.status === 'ready' ? labelFilterState.projections : undefined}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SupportManagementFiltering;
