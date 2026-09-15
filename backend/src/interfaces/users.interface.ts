export interface User {
  id: number;
  personId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
  groups: string[];
  permissions: Permissions;
  /**
   * OIDC POC: the user's access token (RS256 JWT from the IdP), kept server-side in the
   * session and forwarded downstream as `x-jwt-assertion` so a microservice can verify it
   * against the IdP. Absent for SAML logins. The IdP issues no refresh tokens — after
   * accessTokenExpiresAt (epoch seconds) downstream calls 401 until re-login (docs/OIDC.md).
   */
  accessToken?: string;
  accessTokenExpiresAt?: number;
}
export interface Permissions {
  canEditCasedata: boolean;
  canEditSupportManagement: boolean;
  canViewAttestations: boolean;
  canEditAttestations: boolean;
  canViewOtherNamespaces: boolean;
}

/** Internal roles */
export type InternalRole = 'draken_developer' | 'draken_admin' | 'draken_superadmin' | 'draken_casedata_developer' | 'draken_casedata_admin';

export type InternalRoleMap = Map<InternalRole, Partial<Permissions>>;
