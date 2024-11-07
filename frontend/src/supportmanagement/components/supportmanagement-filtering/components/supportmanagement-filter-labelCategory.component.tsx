import { Category, Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu, SearchField } from '@sk-web-gui/react';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { SupportManagementFilter } from '../supportmanagement-filtering.component';

export interface LabelCategoryFilter {
  labelCategory: string[];
}

export const LabelCategoryValues = {
  labelCategory: [],
};

export const SupportManagementFilterLabelCategory: React.FC = () => {
  const { register, watch } = useFormContext<SupportManagementFilter>();
  const [query, setQuery] = useState<string>('');
  const [allLabelCategories, setAllLabelCategories] = useState<Label[]>();
  const { supportMetadata }: { supportMetadata: SupportMetadata } = useAppContext();

  useEffect(() => {
    setAllLabelCategories(supportMetadata?.labels?.labelStructure);
  }, [supportMetadata]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
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
          {allLabelCategories
            ?.filter((s: Category) => s.displayName.toLowerCase().includes(query.toLowerCase()))
            .map((s: Category, idx) => (
              <PopupMenu.Item key={`${s.name}-${idx}`}>
                <Checkbox
                  labelPosition="left"
                  value={s.name}
                  {...register('labelCategory')}
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
