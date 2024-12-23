import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { useMediaQuery } from '@mui/material';
import { SearchField, useGui } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface SupportManagementQueryFilter {
  query: string;
}

export const SupportManagementQueryValues = {
  query: '',
};

export const SupportManagementFilterQuery: React.FC = () => {
  const { watch, setValue } = useFormContext<SupportManagementQueryFilter>();
  const value = watch('query');
  const [query, setQuery] = useState<string>(value);
  const gui = useGui();

  const isMobile = useMediaQuery(`screen and (max-width: ${gui.theme.screens.md})`);

  useDebounceEffect(
    () => {
      if (query !== value) {
        setValue('query', query);
      }
    },
    1000,
    [query]
  );

  return (
    <SearchField
      value={query}
      size={isMobile ? 'md' : 'lg'}
      data-cy="query-filter"
      onChange={(e) => {
        setQuery(e.target.value);
      }}
      className="flex-grow"
      onSearch={() => setValue('query', query)}
      onReset={() => {
        setQuery('');
        setValue('query', '');
      }}
      title="Sök på ärendenummer eller ärendeintressent (namn, adress, personnummer, e-post, telefon)..."
      placeholder="Sök på ärendenummer eller ärendeintressent (namn, adress, personnummer, e-post, telefon)..."
    />
  );
};
