import { useDebounceEffect } from '@common/utils/useDebounceEffect';
import { useAppContext } from '@contexts/app.context';
import { useMediaQuery } from '@mui/material';
import { SearchField, useGui } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface CaseQueryFilter {
  query: string;
}

export const CaseQueryValues = {
  query: '',
};

export const CasedataFilterQuery: React.FC = () => {
  const { watch, setValue } = useFormContext<CaseQueryFilter>();
  const value = watch('query');
  const [query, setQuery] = useState<string>(value);
  const gui = useGui();

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
      size="md"
      data-cy="query-filter"
      onChange={(e) => {
        setQuery(e.target.value);
      }}
      showSearchButton={value !== query}
      className={`flex-grow ${query === '' ? 'max-w-[336px]' : 'max-w-[360px]'}`}
      onSearch={() => setValue('query', query)}
      onReset={() => {
        setQuery('');
        setValue('query', '');
      }}
      placeholder="Sök"
      title="Sök"
    />
  );
};
