import { Permissions } from '@interfaces/users.interface';
import { authorizeGroups, getLoginPermissions, getRole } from '@services/authorization.service';

/**
 * Login failures carry a machine-readable name that the callback forwards to the frontend as
 * ?failMessage=<name>, so every name here must have a matching entry in the frontend's
 * locales/sv/login.json — the OIDC counterpart of SAML_MISSING_ATTRIBUTES/SAML_MISSING_GROUP.
 */
export class OidcLoginError extends Error {
  public constructor(name: 'OIDC_MISSING_ATTRIBUTES' | 'OIDC_MISSING_GROUP', message: string) {
    super(message);
    this.name = name;
  }
}

/**
 * The session user built from an OIDC login — the same shape the SAML verify callback produces,
 * minus the SAML SLO fields (nameID/nameIDFormat/sessionIndex), which have no OIDC equivalent.
 * authMethod discriminates the two at logout; SAML users simply lack the field.
 */
export interface OidcSessionUser {
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  groups: string[];
  role: ReturnType<typeof getRole>;
  permissions: Permissions;
  authMethod: 'oidc';
  // Set by the callback, not by the claims mapping: the access token comes from the token
  // response, not from the ID token's claims. See users.interface.ts for the semantics.
  accessToken?: string;
  accessTokenExpiresAt?: number;
}

const stringClaim = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);

/**
 * Maps ID-token claims to the session user, mirroring the SAML verify callback: the same five
 * attributes are required, the same authorization chain runs, and the result feeds the same
 * req.login()/session machinery — everything downstream is unaware of which protocol logged in.
 *
 * OIDC delivers groups as a JSON array where SAML delivered a CSV string; authorizeGroups keeps
 * its CSV contract, so the array is joined before the check and lowercased after, exactly like
 * the SAML flow does.
 */
export function mapOidcClaimsToSessionUser(claims: Record<string, unknown>): OidcSessionUser {
  const givenName = stringClaim(claims.given_name);
  const familyName = stringClaim(claims.family_name);
  const email = stringClaim(claims.email);
  const username = stringClaim(claims.preferred_username);
  const groups = Array.isArray(claims.groups) ? claims.groups.filter((group): group is string => typeof group === 'string' && group.length > 0) : [];

  if (!givenName || !familyName || !email || !username || groups.length === 0) {
    throw new OidcLoginError(
      'OIDC_MISSING_ATTRIBUTES',
      'Could not extract necessary claims (given_name, family_name, email, preferred_username, groups) from the ID token',
    );
  }

  if (!authorizeGroups(groups.join(','))) {
    throw new OidcLoginError('OIDC_MISSING_GROUP', 'User is not a member of any authorized group');
  }

  const appGroups = groups.map(group => group.toLowerCase());

  return {
    name: `${givenName} ${familyName}`,
    firstName: givenName,
    lastName: familyName,
    username,
    email,
    groups: appGroups,
    role: getRole(appGroups),
    // Permissions are resolved once here, at login, and carried in the session — same as SAML.
    permissions: getLoginPermissions(appGroups),
    authMethod: 'oidc',
  };
}
