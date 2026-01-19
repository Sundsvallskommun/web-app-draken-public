import { InternalRole } from '@/interfaces/users.interface';
import { isMEX, isPT } from './application.service';

export type RoleADMapping = {
  [key: string]: InternalRole;
};

const mapping: RoleADMapping = {};

mapping[process.env.DEVELOPER_GROUP.toLocaleLowerCase()] = 'draken_developer';
mapping[process.env.ADMIN_GROUP.toLocaleLowerCase()] = 'draken_admin';

if (!isPT() && !isMEX()) {
  mapping[process.env.SUPERADMIN_GROUP.toLocaleLowerCase()] = 'draken_superadmin';
}

export const roleADMapping: RoleADMapping = mapping;
