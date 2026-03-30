import { Category } from '@common/data-contracts/supportmanagement/data-contracts';
import { useAppContext } from '@contexts/app.context';
import { Checkbox, PopupMenu, SearchField } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { SupportManagementFilter } from '../supportmanagement-filtering.component';
export interface CategoryFilter {
  category: string[];
}

export const CategoryValues: CategoryFilter = {
  category: [],
};

export const SupportManagementFilterCategory: React.FC = () => {
  const { register } = useFormContext<SupportManagementFilter>();
  const [query, setQuery] = useState<string>('');
  const [allCategories, setAllCategories] = useState<Category[]>();
  const { supportMetadata } = useAppContext();
  const { t } = useTranslation();
  useEffect(() => {
    setAllCategories(supportMetadata?.categories);
  }, [supportMetadata]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<ChevronDown />}
        data-cy="Verksamhet-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        {t(`common:overview.orderType.${process.env.NEXT_PUBLIC_APPLICATION}`, t('common:overview.orderType.default'))}
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full max-h-[70vh] overflow-y-auto">
        <SearchField
          size="md"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onReset={() => setQuery('')}
          placeholder="Skriv för att söka"
        />
        <PopupMenu.Items autoFocus={false}>
          {allCategories
            ?.filter((s: Category) => s.displayName?.toLowerCase().includes(query.toLowerCase()))
            .map((s: Category, idx) => (
              <PopupMenu.Item key={`${s.name}-${idx}`}>
                <Checkbox
                  labelPosition="left"
                  value={s.name}
                  {...register('category')}
                  data-cy={`Verksamhet-filter-${s.name}`}
                >
                  {s.displayName}
                </Checkbox>
              </PopupMenu.Item>
            ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
