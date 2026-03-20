import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { useMetadataStore } from '@stores/index';
import { Checkbox, PopupMenu, SearchField } from '@sk-web-gui/react';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { SupportManagementFilter } from '../supportmanagement-filtering.component';
import { ChevronDown } from 'lucide-react';

export interface LabelTypeFilter {
  labelType: string[];
}

export const LabelTypeValues: LabelTypeFilter = {
  labelType: [],
};

export const SupportManagementFilterLabelType: React.FC = () => {
  const { watch, setValue } = useFormContext<SupportManagementFilter>();
  const labelCategories = watch('labelCategory');
  const labelTypes = watch('labelType');
  const { register } = useFormContext<LabelTypeFilter>();
  const [query, setQuery] = useState<string>('');
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);

  const allStringTypes = useMemo(() => {
    const _types: Label[] = [];
    if (labelCategories.length > 0) {
      labelCategories?.forEach((category) => {
        const categoryTypes = supportMetadata?.labels?.labelStructure?.find((c) => c.resourcePath === category)?.labels;
        if (categoryTypes) {
          _types.push(...categoryTypes);
        }
      });
    } else {
      supportMetadata?.labels?.labelStructure?.forEach((category) => {
        _types.push(...(category.labels ?? []));
      });
    }
    return Array.from(new Set(_types.map((l) => l.displayName).filter((d): d is string => d !== undefined)));
  }, [supportMetadata, labelCategories]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<ChevronDown />}
        data-cy="Ärendekategori-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Ärendekategori
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
          {allStringTypes
            ?.filter((s) => s?.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => a.localeCompare(b))
            .map((s, idx) => (
              <PopupMenu.Item key={`${s}-${idx}`}>
                <Checkbox
                  labelPosition="left"
                  {...register('labelType')}
                  value={s}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue('labelType', [...labelTypes, ...allStringTypes.filter((t) => t === s)]);
                    } else {
                      setValue(
                        'labelType',
                        labelTypes.filter((t) => t !== s)
                      );
                    }
                  }}
                  data-cy={`Ärendekategori-filter-${s}`}
                >
                  {s}
                </Checkbox>
              </PopupMenu.Item>
            ))
            ?.slice(0, labelCategories.length > 0 ? undefined : 115)}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
