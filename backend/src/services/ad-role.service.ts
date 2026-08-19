import { ADMIN_GROUP, DEVELOPER_GROUP, SUPERADMIN_GROUP } from '@/config';
import { InternalRole } from '@/interfaces/users.interface';

import { isMEX, isPT } from './application.service';

export type RoleADMapping = {
  [key: string]: InternalRole;
};

const mapping: RoleADMapping = {};

if (isPT() || isMEX()) {
  mapping[DEVELOPER_GROUP!.toLocaleLowerCase()] = 'draken_casedata_developer';
  mapping[ADMIN_GROUP!.toLocaleLowerCase()] = 'draken_casedata_admin';
}

if (!isPT() && !isMEX()) {
  mapping[DEVELOPER_GROUP!.toLocaleLowerCase()] = 'draken_developer';
  mapping[ADMIN_GROUP!.toLocaleLowerCase()] = 'draken_admin';
  mapping[SUPERADMIN_GROUP!.toLocaleLowerCase()] = 'draken_superadmin';
}

export const roleADMapping: RoleADMapping = mapping;
