/**
 * Directory groups whose members can be selected as handlers. This list does not grant application
 * permissions; ADMIN_GROUP continues to own its existing role and supplies the default directory group.
 */
export const resolveAssignableHandlerGroups = (
  configuredGroups = process.env.ASSIGNABLE_HANDLER_GROUPS,
  adminGroup = process.env.ADMIN_GROUP,
): readonly string[] => {
  if (!configuredGroups?.trim()) {
    if (!adminGroup?.trim()) throw new Error('ADMIN_GROUP must be set when ASSIGNABLE_HANDLER_GROUPS is unset');
    return Object.freeze([adminGroup.trim()]);
  }

  const groups = configuredGroups.split(',').map(group => group.trim());
  if (groups.some(group => group.length === 0)) {
    throw new Error('ASSIGNABLE_HANDLER_GROUPS must be a comma-separated list of non-empty AD group names');
  }

  const uniqueGroups = new Map<string, string>();
  for (const group of groups) {
    if (!uniqueGroups.has(group.toLowerCase())) uniqueGroups.set(group.toLowerCase(), group);
  }
  return Object.freeze([...uniqueGroups.values()]);
};
