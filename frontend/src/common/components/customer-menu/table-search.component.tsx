'use client';

import { SearchField } from '@sk-web-gui/react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TableSearchProps {
  /** Trimmed term; '' on reset. */
  onSearch: (term: string) => void;
  placeholder?: string;
  'data-cy'?: string;
}

export const TableSearch: FC<TableSearchProps> = ({ onSearch, placeholder, 'data-cy': dataCy }) => {
  const { t } = useTranslation();
  const [term, setTerm] = useState('');

  return (
    <SearchField
      value={term}
      size="md"
      data-cy={dataCy}
      showSearchButton
      onChange={(e) => {
        setTerm(e.target.value);
        if (e.target.value === '') {
          onSearch('');
        }
      }}
      className="w-full md:w-1/2"
      onSearch={() => onSearch(term.trim())}
      onReset={() => {
        setTerm('');
        onSearch('');
      }}
      title={t('common:customer.list.search')}
      placeholder={placeholder ?? t('common:customer.list.search')}
    />
  );
};
