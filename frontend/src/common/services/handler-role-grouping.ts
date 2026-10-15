import { Admin, HandlerRole } from '@common/services/user-service';

export interface HandlerRoleGroup {
  key: string;
  label: string;
  administrators: Admin[];
}

const byLastName = (first: Admin, second: Admin): number => (first.lastName > second.lastName ? 1 : -1);

/** The handler list in the order it is shown, when there are no roles to group it by. */
export const sortHandlers = (administrators: Admin[]): Admin[] => [...administrators].sort(byLastName);

/**
 * Splits the handler list into one group per configured role, in the deployment's configured order.
 *
 * Returns an empty array when the deployment configured no roles, which is the signal to render one
 * flat list - the behaviour every application without roles has always had. A handler holding two
 * roles appears under both, because the reason to group is to answer "who can take this next", and
 * that person can take it in either capacity.
 */
export const groupHandlersByRole = (administrators: Admin[], roles: HandlerRole[]): HandlerRoleGroup[] => {
  if (roles.length === 0) return [];

  return roles
    .map((role) => ({
      key: role.key,
      label: role.label,
      administrators: sortHandlers(
        administrators.filter((administrator) => administrator.roleKeys?.includes(role.key))
      ),
    }))
    .filter((group) => group.administrators.length > 0);
};
