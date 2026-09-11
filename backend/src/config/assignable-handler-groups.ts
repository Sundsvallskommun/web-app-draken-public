import { resolveHandlerGroupRoles } from './handler-group-roles';

/**
 * Directory groups whose members can be selected as handlers. This list does not grant application
 * permissions; ADMIN_GROUP continues to own its existing role and supplies the default directory group.
 *
 * `HANDLER_GROUP_ROLES` is the richer spelling of the same thing: it names the groups *and* the role
 * each one stands for. When it is configured it wins, so a deployment never has to keep two lists of
 * the same AD groups in sync.
 */
export const resolveAssignableHandlerGroups = (
  configuredGroups = process.env.ASSIGNABLE_HANDLER_GROUPS,
  adminGroup = process.env.ADMIN_GROUP,
  roles = resolveHandlerGroupRoles(),
): readonly string[] => {
  if (roles) return dedupeGroups(roles.map(role => role.group));

  if (!configuredGroups?.trim()) {
    if (!adminGroup?.trim()) throw new Error('ADMIN_GROUP must be set when ASSIGNABLE_HANDLER_GROUPS is unset');
    return Object.freeze([adminGroup.trim()]);
  }

  const groups = configuredGroups.split(',').map(group => group.trim());
  if (groups.some(group => group.length === 0)) {
    throw new Error('ASSIGNABLE_HANDLER_GROUPS must be a comma-separated list of non-empty AD group names');
  }

  return dedupeGroups(groups);
};

const dedupeGroups = (groups: readonly string[]): readonly string[] => {
  const uniqueGroups = new Map<string, string>();
  for (const group of groups) {
    if (!uniqueGroups.has(group.toLowerCase())) uniqueGroups.set(group.toLowerCase(), group);
  }
  return Object.freeze([...uniqueGroups.values()]);
};
