import { type HandlerGroupRole, resolveHeldHandlerRoleKeys } from './handler-group-roles';

/**
 * The handler roles that follow up an approved measure: mark it carried out and say whether it had the effect
 * sought. The unit owns what is done in it, so it is the unit's managers who do it, whoever proposed it.
 */
const MEASURE_FOLLOW_UP_ROLE_KEYS: readonly string[] = Object.freeze(['enhetschef', 'verksamhetschef']);

/**
 * Whether the user follows up measures through their role. Undefined where the deployment configured no
 * handler roles - an empty catalogue is no configuration either, the setting refuses one - and there a measure
 * is followed up by whoever registered it, as it was before the roles.
 */
export const mayFollowUpMeasuresByRole = (
  handlerRoles: readonly HandlerGroupRole[] | undefined,
  userGroups: readonly string[],
): boolean | undefined =>
  handlerRoles?.length ? resolveHeldHandlerRoleKeys(handlerRoles, userGroups).some(key => MEASURE_FOLLOW_UP_ROLE_KEYS.includes(key)) : undefined;
