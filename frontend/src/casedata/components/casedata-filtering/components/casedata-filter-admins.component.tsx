import { Admin } from '@common/services/user-service';
import { compareByDisplayName, displayNameMatchesQuery } from '@common/utils/ad-display-name';
import { Checkbox, PopupMenu, SearchField } from '@sk-web-gui/react';
import { ChevronDown } from 'lucide-react';
import { FC, useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface CaseAdminsFilter {
  admins: string[];
}

export const CaseAdminsValues: CaseAdminsFilter = {
  admins: [],
};

interface CasedataFilterAdminsProps {
  administrators?: Admin[];
}

export const CasedataFilterAdmins: FC<CasedataFilterAdminsProps> = ({ administrators }) => {
  const { register } = useFormContext<CaseAdminsFilter>();
  const [query, setQuery] = useState<string>('');

  return (
    administrators && (
      <PopupMenu>
        <PopupMenu.Button
          rightIcon={<ChevronDown />}
          data-cy="Handläggare-filter"
          variant="tertiary"
          showBackground={false}
          size="sm"
          className="max-md:w-full"
        >
          Handläggare
        </PopupMenu.Button>
        <PopupMenu.Panel className="max-md:w-full max-h-[70vh] overflow-hidden overflow-y-scroll">
          <SearchField
            size="md"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onReset={() => setQuery('')}
            placeholder="Skriv för att söka"
          />
          <PopupMenu.Items autoFocus={false}>
            {administrators
              .sort(compareByDisplayName)
              .filter((admin) => displayNameMatchesQuery(admin, query))
              .map((admin, idx) => (
                <PopupMenu.Item key={`adminitem-${idx}`}>
                  <Checkbox
                    data-cy={`admin-${admin.id}`}
                    labelPosition="left"
                    value={admin.adAccount?.toString() || admin.id.toString()}
                    {...register('admins')}
                  >
                    {admin.displayName}
                  </Checkbox>
                </PopupMenu.Item>
              ))}
          </PopupMenu.Items>
        </PopupMenu.Panel>
      </PopupMenu>
    )
  );
};
