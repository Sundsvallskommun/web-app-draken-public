import { groupHandlersByRole, sortHandlers } from '@common/services/handler-role-grouping';
import { Admin, HandlerRole } from '@common/services/user-service';
import { Select } from '@sk-web-gui/react';
import { FC } from 'react';

interface HandlerSelectOptionsProps {
  administrators: Admin[];
  /** Empty for a deployment without roles, which renders the flat list unchanged. */
  roles: HandlerRole[];
}

/**
 * The options inside a handler `Select`.
 *
 * The option's value is its display name, matching how the errand form has always read the handler
 * back out of the select. Grouping is decided by the configured roles rather than by which
 * application is running, so an application without roles gets exactly the list it had before.
 */
export const HandlerSelectOptions: FC<HandlerSelectOptionsProps> = ({ administrators, roles }) => {
  const groups = groupHandlersByRole(administrators, roles);

  if (groups.length === 0) {
    return (
      <>
        {sortHandlers(administrators).map((administrator) => (
          <Select.Option key={administrator.adAccount}>{administrator.displayName}</Select.Option>
        ))}
      </>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <Select.Optgroup key={group.key} label={group.label}>
          {group.administrators.map((administrator) => (
            <Select.Option key={`${group.key}-${administrator.adAccount}`}>{administrator.displayName}</Select.Option>
          ))}
        </Select.Optgroup>
      ))}
    </>
  );
};
