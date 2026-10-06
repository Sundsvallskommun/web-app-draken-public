'use client';

import { Button, SearchField } from '@sk-web-gui/react';
import { X } from 'lucide-react';
import { FC } from 'react';

import { FollowUpMultiSelectFilter } from './follow-up-multi-select-filter.component';
import { FollowUpPeriodFilter } from './follow-up-period-filter.component';
import { FollowUpRiskFilter } from './follow-up-risk-filter.component';
import {
  EMPTY_UNIT_FOLLOW_UP_FILTERS,
  type FollowUpFilterOptions,
  hasActiveFollowUpFilters,
  type UnitFollowUpFilters,
} from './unit-follow-up-filters';
import { FOLLOW_UP_MEASURE_STATUSES, FOLLOW_UP_YES_NO } from './unit-follow-up-rows';
import type { UnitFollowUpPeriod } from './unit-follow-up-service';
import type { UnitFollowUpVocabulary } from './unit-follow-up-vocabulary';

export type UnitFollowUpTab = 'errands' | 'measures';

interface UnitFollowUpFilterBarProps {
  tab: UnitFollowUpTab;
  filters: UnitFollowUpFilters;
  onFiltersChange: (filters: UnitFollowUpFilters) => void;
  options: FollowUpFilterOptions;
  vocabulary: UnitFollowUpVocabulary;
  period: UnitFollowUpPeriod;
  onPeriodChange: (period: UnitFollowUpPeriod) => void;
}

/**
 * The filters above both lists, in the order the follow-up sketch gives them. The measures list adds its
 * own - type, status and effect - after the errand filters, which narrow its errands the same way.
 */
export const UnitFollowUpFilterBar: FC<UnitFollowUpFilterBarProps> = ({
  tab,
  filters,
  onFiltersChange,
  options,
  vocabulary,
  period,
  onPeriodChange,
}) => {
  const set =
    <TKey extends keyof UnitFollowUpFilters>(key: TKey) =>
    (value: UnitFollowUpFilters[TKey]) =>
      onFiltersChange({ ...filters, [key]: value });

  const periodFilter = <FollowUpPeriodFilter period={period} onChange={onPeriodChange} />;

  return (
    <div className="flex flex-wrap items-center gap-12" data-cy="follow-up-filters">
      <FollowUpMultiSelectFilter
        label="Rapporttyp"
        options={options.reportTypes}
        selected={filters.reportTypes}
        onChange={set('reportTypes')}
        data-cy="follow-up-filter-report-type"
      />
      <SearchField
        size="md"
        value={filters.unitQuery}
        placeholder="Sök enhet..."
        aria-label="Sök enhet"
        showSearchButton={false}
        onChange={(event) => set('unitQuery')(event.target.value)}
        onReset={() => set('unitQuery')('')}
        className="max-w-[24rem]"
        data-cy="follow-up-filter-unit"
      />
      {tab === 'errands' && periodFilter}
      <FollowUpMultiSelectFilter
        label="Avvikelsetyp"
        options={options.categories}
        selected={filters.categories}
        onChange={set('categories')}
        data-cy="follow-up-filter-category"
      />
      <FollowUpMultiSelectFilter
        label="Underkategori"
        options={options.subcategories}
        selected={filters.subcategories}
        onChange={set('subcategories')}
        data-cy="follow-up-filter-subcategory"
      />
      <FollowUpMultiSelectFilter
        label="Orsak till avvikelse"
        options={options.causeAreas}
        selected={filters.causeAreas}
        onChange={set('causeAreas')}
        data-cy="follow-up-filter-cause"
      />
      <FollowUpMultiSelectFilter
        label="Lagrum"
        options={options.legalBases}
        selected={filters.legalBases}
        onChange={set('legalBases')}
        data-cy="follow-up-filter-legal-base"
      />
      <FollowUpMultiSelectFilter
        label="IVO-anmälan"
        options={FOLLOW_UP_YES_NO}
        selected={filters.ivoNotification}
        onChange={set('ivoNotification')}
        data-cy="follow-up-filter-ivo"
      />
      <FollowUpMultiSelectFilter
        label="Polisanmälan"
        options={FOLLOW_UP_YES_NO}
        selected={filters.policeReport}
        onChange={set('policeReport')}
        data-cy="follow-up-filter-police"
      />
      <FollowUpMultiSelectFilter
        label="Ärendestatus"
        options={options.statuses}
        selected={filters.statuses}
        onChange={set('statuses')}
        data-cy="follow-up-filter-status"
      />
      <FollowUpRiskFilter
        label="Riskvärde HSL"
        values={vocabulary.riskValuesHsl}
        selected={filters.riskValueHsl}
        onChange={set('riskValueHsl')}
        data-cy="follow-up-filter-risk-hsl"
      />
      <FollowUpRiskFilter
        label="Riskvärde SOL/LSS"
        values={vocabulary.riskValuesSolLss}
        selected={filters.riskValueSolLss}
        onChange={set('riskValueSolLss')}
        data-cy="follow-up-filter-risk-sol-lss"
      />
      {tab === 'measures' && (
        <>
          <FollowUpMultiSelectFilter
            label="Åtgärdstyp"
            options={options.measureTypes}
            selected={filters.measureTypes}
            onChange={set('measureTypes')}
            data-cy="follow-up-filter-measure-type"
          />
          <FollowUpMultiSelectFilter
            label="Status"
            options={FOLLOW_UP_MEASURE_STATUSES}
            selected={filters.measureStatuses}
            onChange={set('measureStatuses')}
            data-cy="follow-up-filter-measure-status"
          />
          <FollowUpMultiSelectFilter
            label="Effekt"
            options={FOLLOW_UP_YES_NO}
            selected={filters.effects}
            onChange={set('effects')}
            data-cy="follow-up-filter-effect"
          />
          {periodFilter}
        </>
      )}
      {hasActiveFollowUpFilters(filters) && (
        <Button
          variant="link"
          size="sm"
          leftIcon={<X size={14} />}
          className="ml-auto"
          onClick={() => onFiltersChange(EMPTY_UNIT_FOLLOW_UP_FILTERS)}
          data-cy="follow-up-filter-clear"
        >
          Rensa alla
        </Button>
      )}
    </div>
  );
};
