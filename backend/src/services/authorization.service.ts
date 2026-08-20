import { AUTHORIZED_GROUPS } from '@config';
import { InternalRole, Permissions } from '@interfaces/users.interface';

import { logger } from '@/utils/logger';

import { roleADMapping } from './ad-role.service';
import { isContactSundsvall } from './application.service';

export function authorizeGroups(groups: string) {
  logger.debug(`authorizing groups ${groups}`);
  logger.debug(`against ${AUTHORIZED_GROUPS}`);
  const authorizedGroupsList = AUTHORIZED_GROUPS!.split(',');
  const groupsList = groups.split(',').map((g: string) => g.toLowerCase());
  return authorizedGroupsList.some(authorizedGroup => groupsList.includes(authorizedGroup.toLowerCase()));
}

export const defaultPermissions: () => Permissions = () => ({
  canEditCasedata: false,
  canEditSupportManagement: false,
  canViewAttestations: false,
  canEditAttestations: false,
  canViewOtherNamespaces: false,
});

enum RoleOrderEnum {
  'draken_developer',
  'draken_admin',
  'draken_superadmin',
  'draken_casedata_developer',
  'draken_casedata_admin',
}

const roles = new Map<InternalRole, Partial<Permissions>>([
  [
    'draken_developer',
    {
      canEditSupportManagement: true,
      canViewAttestations: true,
    },
  ],
  [
    'draken_admin',
    {
      canEditSupportManagement: true,
    },
  ],
  [
    'draken_superadmin',
    {
      canEditSupportManagement: true,
      canViewAttestations: true,
      canEditAttestations: true,
    },
  ],
  [
    'draken_casedata_developer',
    {
      canEditCasedata: true,
    },
  ],
  [
    'draken_casedata_admin',
    {
      canEditCasedata: true,
    },
  ],
]);

/**
 *
 * @param groups Array of groups/roles
 * @param internalGroups Whether to use internal groups or external group-mappings
 * @returns collected permissions for all matching role groups
 */
export const getPermissions = (groups: InternalRole[] | string[], internalGroups = false): Permissions => {
  const permissions: Permissions = defaultPermissions();
  groups.forEach(group => {
    const groupLower = group.toLowerCase();
    const role = internalGroups ? (groupLower as InternalRole) : (roleADMapping[groupLower] as InternalRole);
    if (roles.has(role)) {
      const groupPermissions = roles.get(role)!;
      (Object.keys(groupPermissions) as Array<keyof Permissions>).forEach(permission => {
        if (groupPermissions[permission] === true) {
          permissions[permission] = true as Permissions[typeof permission];
        }
      });
    }
  });
  return permissions;
};

/**
 * The permissions stored on the session user at login: the union of the permissions from the user's
 * AD groups, plus cross-namespace casestatus access, which only the Kontakt Sundsvall drake grants.
 * Endpoints check the permission, never the environment, so access can never leak from a
 * namespace/env misconfiguration.
 * @param groups Array of AD groups from the SAML assertion
 * @returns permissions to carry in the session
 */
export const getLoginPermissions = (groups: string[]): Permissions => ({
  ...getPermissions(groups),
  canViewOtherNamespaces: isContactSundsvall(),
});

/**
 * Ensures to return only the role with most permissions
 * @param groups List of AD roles
 * @returns role with most permissions
 */
export const getRole = (groups: string[]) => {
  if (groups.length == 1) return roleADMapping[groups[0]]; // meta_read

  const roles: InternalRole[] = [];
  groups.forEach(group => {
    const groupLower = group.toLowerCase();
    const role = roleADMapping[groupLower];
    if (role) {
      roles.push(role);
    }
  });

  return roles.sort((a, b) => RoleOrderEnum[a] - RoleOrderEnum[b])[0];
};
