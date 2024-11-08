import { getCaseLabels } from '@casedata/services/casedata-errand-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, PopupMenu, SearchField } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface CaseTypeFilter {
  caseType: string[];
}

export const CaseTypeValues = {
  caseType: [],
};

export const CasedataFilterCaseType: React.FC = () => {
  const { register } = useFormContext<CaseTypeFilter>();
  const [query, setQuery] = useState<string>('');

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
      <PopupMenu.Panel className="max-md:w-full">
        <SearchField
          size="md"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onReset={() => setQuery('')}
          placeholder="Skriv för att söka"
        />
        <PopupMenu.Items autoFocus={false}>
          {Object.entries(getCaseLabels())
            .filter(
              (s: [string, string]) =>
                s[0].toLowerCase().includes(query.toLowerCase()) || s[1].toLowerCase().includes(query.toLowerCase())
            )
            .map((s: [string, string], idx) => (
              <PopupMenu.Item key={`${s[1]}-${idx}`}>
                <Checkbox
                  labelPosition="left"
                  value={s[0]}
                  {...register('caseType')}
                  data-cy={`Ärendetyp-filter-${s[0]}`}
                >
                  {s[1]}
                </Checkbox>
              </PopupMenu.Item>
            ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
