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
export type InternalRole =
  | 'draken_lop_superadmin'
  | 'draken_pt_admin'
  | 'draken_mex_admin'
  | 'draken_ks_admin'
  | 'draken_ka_admin'
  | 'draken_lop_admin'
  | 'draken_pt_developer'
  | 'draken_mex_developer'
  | 'draken_ks_developer'
  | 'draken_ka_developer'
  | 'draken_lop_developer';
export enum InternalRoleEnum {
  'draken_pt_admin',
  'draken_mex_admin',
  'draken_ks_admin',
  'draken_ka_admin',
  'draken_lop_admin',
  'draken_lop_superadmin',
  'draken_pt_developer',
  'draken_mex_developer',
  'draken_ks_developer',
  'draken_ka_developer',
  'draken_lop_developer',
}

export type InternalRoleMap = Map<InternalRole, Partial<Permissions>>;
