import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Checkbox, LucideIcon as Icon, PopupMenu, SearchField } from '@sk-web-gui/react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface CaseStatusFilter {
  status: string[];
}

export const CaseStatusValues = {
  status: [],
};

export const CasedataFilterStatus: React.FC = () => {
  const { register } = useFormContext<CaseStatusFilter>();
  const [query, setQuery] = useState<string>('');

  return (
    <PopupMenu>
      <PopupMenu.Button
        rightIcon={<Icon name="chevron-down" />}
        data-cy="Status-filter"
        variant="tertiary"
        showBackground={false}
        size="sm"
        className="max-md:w-full"
      >
        Status
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
          {Object.entries(ErrandStatus)
            .filter(
              (s: [string, string]) =>
                s[0].toLowerCase().includes(query.toLowerCase()) || s[1].toLowerCase().includes(query.toLowerCase())
            )
            .map((s: [string, string], idx) => (
              <PopupMenu.Item key={`${s[1]}-${idx}`}>
                <Checkbox labelPosition="left" value={s[0]} {...register('status')} data-cy={`Status-filter-${s[0]}`}>
                  {s[1]}
                </Checkbox>
              </PopupMenu.Item>
            ))}
        </PopupMenu.Items>
      </PopupMenu.Panel>
    </PopupMenu>
  );
};
