import { SearchField } from '@sk-web-gui/react';
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

  return (
    <SearchField
      value={query}
      size="md"
      data-cy="query-filter"
      onChange={(e) => {
        setQuery(e.target.value);
      }}
      className="flex-grow max-w-full"
      onSearch={() => setValue('query', query)}
      onReset={() => {
        setQuery('');
        setValue('query', '');
      }}
      title="Sök"
      placeholder="Sök"
    />
  );
};
