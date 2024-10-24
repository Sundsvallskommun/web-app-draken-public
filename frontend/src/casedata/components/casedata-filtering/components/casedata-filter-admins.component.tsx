import { Admin } from '@common/services/user-service';
import { Checkbox, LucideIcon as Icon, PopupMenu, SearchField } from '@sk-web-gui/react';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface CaseAdminsFilter {
  admins: string[];
}

export const CaseAdminsValues = {
  admins: [],
};

interface CasedataFilterAdminsProps {
  administrators?: (SupportAdmin | Admin)[];
}

export const CasedataFilterAdmins: React.FC<CasedataFilterAdminsProps> = ({ administrators }) => {
  const { register } = useFormContext<CaseAdminsFilter>();
  const [query, setQuery] = useState<string>('');

  return (
    administrators && (
      <PopupMenu>
        <PopupMenu.Button
          rightIcon={<Icon name="chevron-down" />}
          data-cy="Handläggare-filter"
          variant="tertiary"
          showBackground={false}
          size="sm"
          className="max-md:w-full"
        >
          Handläggare
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
            {administrators
              .sort((a, b) => (a.lastName > b.lastName ? 1 : -1))
              .filter(
                (admin) =>
                  admin.firstName.toLowerCase().includes(query.toLowerCase()) ||
                  admin.lastName.toLowerCase().includes(query.toLowerCase())
              )
              .map((admin, idx) => (
                <PopupMenu.Item key={`adminitem-${idx}`}>
                  <Checkbox
                    data-cy={`admin-${admin.id}`}
                    labelPosition="left"
                    value={admin.adAccount?.toString() || admin.id.toString()}
                    {...register('admins')}
                  >
                    {admin.lastName} {admin.firstName}
                  </Checkbox>
                </PopupMenu.Item>
              ))}
          </PopupMenu.Items>
        </PopupMenu.Panel>
      </PopupMenu>
    )
  );
};