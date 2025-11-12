import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu, SearchField } from '@sk-web-gui/react';
import { getLabelTypeFromDisplayName } from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { SupportManagementFilter } from '../supportmanagement-filtering.component';

export interface LabelSubTypeFilter {
  labelSubType: string[];
}

export const LabelSubTypeValues = {
  labelSubType: [],
};

export const SupportManagementFilterLabelSubType: React.FC = () => {
  const { watch, setValue } = useFormContext<SupportManagementFilter>();
  const labelCategories = watch('labelCategory');
  const labelTypes = watch('labelType');
  const labelSubTypes = watch('labelSubType');
  const { register } = useFormContext<LabelSubTypeFilter>();
  const [query, setQuery] = useState<string>('');
  const [allStringSubTypes, setAllStringSubTypes] = useState<string[]>();
  const { supportMetadata }: { supportMetadata: SupportMetadata } = useAppContext();

  useEffect(() => {
    const _subTypes: Label[] = [];
    if (labelTypes.length > 0) {
      labelTypes?.forEach((typeDisplayName) => {
        const types = getLabelTypeFromDisplayName(typeDisplayName, supportMetadata);
        types?.forEach((t) => {
          const _s = t?.labels;
          if (_s?.length > 0) {
            _subTypes.push(..._s);
          }
        });
      });
    } else if (labelCategories.length > 0) {
      labelCategories?.forEach((category) => {
        const types = supportMetadata?.labels.labelStructure.find((c) => c.resourcePath === category)?.labels;
        if (types) {
          types.forEach((type) => {
            if (type.labels?.length > 0) {
              _subTypes.push(...type.labels);
            }
          });
        }
      });
    } else {
      supportMetadata?.labels?.labelStructure?.forEach((category) => {
        category.labels.forEach((type) => {
          if (type.labels?.length > 0) {
            _subTypes.push(...type.labels);
          }
        });
      });
    }
    // We need a list of displayNames, not objects and not names since the
    // labelSubType filter works with the displayName and not the names of the types
    //
    // See comment in ongoing-support-errands.component.tsx for more information
    setAllStringSubTypes(Array.from(new Set(_subTypes.map((l) => l.displayName))));
  }, [supportMetadata, labelCategories, labelTypes]);

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<LucideIcon name="chevron-down" />}
        data-cy="Ärendetyp-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Ärendetyp
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
          {allStringSubTypes
            ?.filter((s) => s?.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => a.localeCompare(b))
            .map((s, idx) => (
              <PopupMenu.Item key={`${s}-${idx}`}>
                <Checkbox
                  labelPosition="left"
                  {...register('labelSubType')}
                  value={s}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue('labelSubType', [...labelSubTypes, ...allStringSubTypes.filter((t) => t === s)]);
                    } else {
                      setValue(
                        'labelSubType',
                        labelSubTypes.filter((t) => t !== s)
                      );
                    }
                  }}
                  data-cy={`Ärendetyp-filter-${s}`}
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
