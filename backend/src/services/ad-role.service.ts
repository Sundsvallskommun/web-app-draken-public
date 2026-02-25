import { InternalRole } from '@/interfaces/users.interface';
import { isMEX, isPT } from './application.service';

export type RoleADMapping = {
  [key: string]: InternalRole;
};

const mapping: RoleADMapping = {};

if (isPT() || isMEX()) {
  mapping[process.env.DEVELOPER_GROUP.toLocaleLowerCase()] = 'draken_casedata_developer';
  mapping[process.env.ADMIN_GROUP.toLocaleLowerCase()] = 'draken_casedata_admin';
}

if (!isPT() && !isMEX()) {
  mapping[process.env.DEVELOPER_GROUP.toLocaleLowerCase()] = 'draken_developer';
  mapping[process.env.ADMIN_GROUP.toLocaleLowerCase()] = 'draken_admin';
  mapping[process.env.SUPERADMIN_GROUP.toLocaleLowerCase()] = 'draken_superadmin';
}

export const roleADMapping: RoleADMapping = mapping;
