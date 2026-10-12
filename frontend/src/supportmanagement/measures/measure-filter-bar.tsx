import { Button, FormControl, FormLabel, Input, Select } from '@sk-web-gui/react';
import { useId } from 'react';

import { emptyMeasureFilters, isMeasureFilterActive, type MeasureFilters } from './measure-filters';
import { type MeasureSort, measureSortOptions } from './measure-sort';

const statusOptions: { value: MeasureFilters['status']; label: string }[] = [
  { value: '', label: 'Alla' },
  { value: 'planned', label: 'Planerade' },
  { value: 'executed', label: 'Genomförda' },
];
const decisionOptions: { value: MeasureFilters['decision']; label: string }[] = [
  { value: '', label: 'Alla' },
  { value: 'proposal', label: 'Förslag' },
  { value: 'accepted', label: 'Godkända' },
  { value: 'rejected', label: 'Avslagna' },
  { value: 'rework', label: 'Delvis godkända' },
];

export function MeasureFilterBar({
  filters,
  onChange,
  sort,
  onSortChange,
  roles,
  types,
  shown,
  total,
}: {
  filters: MeasureFilters;
  onChange: (filters: MeasureFilters) => void;
  /** The order is not a filter: clearing the filters leaves it as chosen. */
  sort: MeasureSort;
  onSortChange: (sort: MeasureSort) => void;
  roles: readonly { value: string; label: string }[];
  types: readonly { value: string; label: string }[];
  shown: number;
  total: number;
}) {
  const id = useId();
  const active = isMeasureFilterActive(filters);
  const set = <K extends keyof MeasureFilters>(key: K, value: MeasureFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const select = <K extends 'status' | 'decision' | 'role' | 'type'>(
    key: K,
    label: string,
    options: readonly { value: string; label: string }[]
  ) => (
    <FormControl id={`${id}-${key}`} size="sm" className="w-full">
      <FormLabel>{label}</FormLabel>
      <Select
        id={`${id}-${key}`}
        size="sm"
        value={filters[key]}
        onChange={(event) => set(key, event.target.value as MeasureFilters[K])}
        className="w-full"
      >
        {options.map((option) => (
          <Select.Option key={option.value} value={option.value}>
            {option.label}
          </Select.Option>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <div
      role="group"
      aria-label="Filtrera och sortera åtgärder"
      className="flex flex-col gap-12"
      data-cy="measure-filters"
    >
      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5">
        {select('status', 'Status', statusOptions)}
        {select('decision', 'Beslut', decisionOptions)}
        {select('role', 'Registrerad i rollen', [{ value: '', label: 'Alla' }, ...roles])}
        {select('type', 'Åtgärdstyp', [{ value: '', label: 'Alla' }, ...types])}
        <FormControl id={`${id}-text`} size="sm" className="w-full">
          <FormLabel>Sök</FormLabel>
          <Input
            id={`${id}-text`}
            size="sm"
            type="search"
            value={filters.text}
            placeholder="Typ, beskrivning, mål, ansvarig, beslutskommentar"
            onChange={(event) => set('text', event.target.value)}
            className="w-full"
          />
        </FormControl>
      </div>
      <div className="flex flex-wrap items-end gap-12">
        <p role="status" className="text-small" data-cy="measure-filter-summary">
          {active ? `Visar ${shown} av ${total} åtgärder.` : `${total} åtgärder.`}
        </p>
        {active && (
          <Button type="button" size="sm" variant="tertiary" onClick={() => onChange(emptyMeasureFilters)}>
            Rensa filter
          </Button>
        )}
        <FormControl id={`${id}-sort`} size="sm" className="w-full sm:w-auto sm:min-w-[20rem] sm:ml-auto">
          <FormLabel>Sortera efter</FormLabel>
          <Select
            id={`${id}-sort`}
            size="sm"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as MeasureSort)}
            className="w-full"
            data-cy="measure-sort"
          >
            {measureSortOptions.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        </FormControl>
      </div>
    </div>
  );
}
