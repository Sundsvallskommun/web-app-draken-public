import { useAppContext } from '@contexts/app.context';
import { Checkbox, LucideIcon as Icon, PopupMenu, SearchField } from '@sk-web-gui/react';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { SupportManagementFilter } from '../supportmanagement-filtering.component';
import { Category } from '@common/data-contracts/supportmanagement/data-contracts';

export interface CategoryFilter {
  category: string[];
}

export const CategoryValues = {
  category: [],
};

export const SupportManagementFilterCategory: React.FC = () => {
  const { register, watch } = useFormContext<SupportManagementFilter>();
  const categories = watch('category');
  const types = watch('type');
  const [query, setQuery] = useState<string>('');
  const [allCategories, setAllCategories] = useState<Category[]>();
  const { supportMetadata }: { supportMetadata: SupportMetadata } = useAppContext();

  useEffect(() => {
    setAllCategories(supportMetadata?.categories);
  }, [supportMetadata]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<Icon name="chevron-down" />}
        data-cy="Verksamhet-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Verksamhet
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
            ?.filter((s: Category) => s.displayName.toLowerCase().includes(query.toLowerCase()))
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
