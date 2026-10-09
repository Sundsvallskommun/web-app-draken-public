import { HandlerGroupRole, resolveHeldHandlerRoleKeys } from '@/config/handler-group-roles';
import { SupportInvestigationHandlerParameter } from '@/config/support-investigation-profile';
import { User } from '@/interfaces/users.interface';

/**
 * The errand parameters that also make an errand the user's own, for Mina ärenden: those naming a handler role
 * the user holds. Only the user's own errands are widened. Asking for somebody else's, or a deployment that
 * configures no such parameter or no handler roles, answers nothing, and the filter stays as it always was.
 */
export const ownHandlerParameterKeys = (
  stakeholders: string | undefined,
  user: Pick<User, 'username' | 'groups'>,
  handlerParameters: readonly SupportInvestigationHandlerParameter[] | undefined,
  handlerRoles: readonly HandlerGroupRole[] | undefined,
): string[] | undefined => {
  if (!stakeholders || !handlerParameters?.length || !handlerRoles) return undefined;
  if (stakeholders.trim().toLowerCase() !== user.username?.trim().toLowerCase()) return undefined;
  const heldRoleKeys = resolveHeldHandlerRoleKeys(handlerRoles, user.groups ?? []);
  const keys = handlerParameters.filter(({ roleKey }) => heldRoleKeys.includes(roleKey)).map(({ key }) => key);
  return keys.length > 0 ? keys : undefined;
};
