import { Category } from '@common/data-contracts/supportmanagement/data-contracts';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu, SearchField } from '@sk-web-gui/react';
import { SupportMetadata, SupportType } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { SupportManagementFilter } from '../supportmanagement-filtering.component';

export interface TypeFilter {
  type: string[];
}

export const TypeValues = {
  type: [],
};

export const SupportManagementFilterType: React.FC = () => {
  const { watch, setValue, reset } = useFormContext<SupportManagementFilter>();
  const categories = watch('category');
  const types = watch('type');
  const { register } = useFormContext<TypeFilter>();
  const [query, setQuery] = useState<string>('');
  const [allCategories, setAllCategories] = useState<Category[]>();
  const [allTypes, setAllTypes] = useState<SupportType[]>();
  const { supportMetadata }: { supportMetadata: SupportMetadata } = useAppContext();
  useEffect(() => {
    setAllCategories(supportMetadata?.categories);
    const _types: SupportType[] = [];
    if (categories.length > 0) {
      categories?.forEach((category) => {
        const categoryTypes = supportMetadata?.categories.find((c) => c.name === category)?.types;
        types.filter((type) => {
          if (!categoryTypes.find((ct) => ct.name === type)) {
            const newTypes = types.filter((_t) => _t !== type);
            setValue('type', newTypes);
          }
        });
        if (categoryTypes) {
          _types.push(...categoryTypes);
        }
      });
    } else {
      supportMetadata?.categories?.forEach((category) => {
        _types.push(...category.types);
      });
    }
    setAllTypes(_types);
  }, [supportMetadata, categories, types]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="Ärendekategori-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Ärende
      </PopupMenu.Button>
      <PopupMenu.Panel className="max-md:w-full max-h-[70vh] h-auto overflow-y-auto">
        <SearchField
          size="md"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onReset={() => setQuery('')}
          placeholder="Skriv för att söka"
        />
        <PopupMenu.Items autoFocus={false}>
          {allTypes
            ?.filter((s: SupportType) => s.displayName.toLowerCase().includes(query.toLowerCase()))
            .map((s: SupportType, idx) => (
              <PopupMenu.Item key={`${s.name}-${idx}`}>
                <Checkbox
                  labelPosition="left"
                  value={s.name}
                  {...register('type')}
                  data-cy={`Ärendekategori-filter-${s.name}`}
                >
                  {s.displayName}
                </Checkbox>
              </PopupMenu.Item>
            ))
            ?.slice(0, categories.length > 0 ? undefined : 115)}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
