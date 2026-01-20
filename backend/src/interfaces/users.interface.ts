export interface User {
  id: number;
  personId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
  groups: string;
  permissions: Permissions;
}
export interface Permissions {
  canEditCasedata: boolean;
  canEditSupportManagement: boolean;
  canViewAttestations: boolean;
  canEditAttestations: boolean;
}

/** Internal roles */
export type InternalRole = 'draken_developer' | 'draken_admin' | 'draken_superadmin' | 'draken_casedata_developer' | 'draken_casedata_admin';

export type InternalRoleMap = Map<InternalRole, Partial<Permissions>>;
