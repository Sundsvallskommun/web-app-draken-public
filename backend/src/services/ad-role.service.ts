import { InternalRole } from '@/interfaces/users.interface';
import { isIK, isKC, isLOP, isMEX, isPT } from './application.service';

// export type RoleADMapping = {
//   [key in ADRole]: InternalRole;
// };

export type RoleADMapping = {
  [key: string]: InternalRole;
};

const mapping: RoleADMapping = {};

if (isMEX()) {
  mapping[process.env.ADMIN_GROUP.toLocaleLowerCase()] = 'draken_mex_admin';
  mapping[process.env.DEVELOPER_GROUP.toLocaleLowerCase()] = 'draken_mex_developer';
} else if (isPT()) {
  mapping[process.env.ADMIN_GROUP.toLocaleLowerCase()] = 'draken_pt_admin';
  mapping[process.env.DEVELOPER_GROUP.toLocaleLowerCase()] = 'draken_pt_developer';
} else if (isKC()) {
  mapping[process.env.ADMIN_GROUP.toLocaleLowerCase()] = 'draken_ks_admin';
  mapping[process.env.DEVELOPER_GROUP.toLocaleLowerCase()] = 'draken_ks_developer';
} else if (isIK()) {
  mapping[process.env.ADMIN_GROUP.toLocaleLowerCase()] = 'draken_lop_admin';
  mapping[process.env.DEVELOPER_GROUP.toLocaleLowerCase()] = 'draken_lop_developer';
} else if (isLOP()) {
  mapping[process.env.ADMIN_GROUP.toLocaleLowerCase()] = 'draken_lop_admin';
  mapping[process.env.SUPERADMIN_GROUP.toLocaleLowerCase()] = 'draken_lop_superadmin';
  mapping[process.env.DEVELOPER_GROUP.toLocaleLowerCase()] = 'draken_lop_developer';
}

export const roleADMapping: RoleADMapping = mapping;
