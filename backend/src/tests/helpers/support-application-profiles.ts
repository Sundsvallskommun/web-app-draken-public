import type { DragonId } from '@/config/dragon-build';
import { getSupportApplicationProfile } from '@/config/support-application-profile';

import { APPLICATIONS } from './dragon-applications';

export const supportProfileFixture = (application: string | undefined) => {
  const id = application?.trim().toUpperCase();
  if (id && Object.hasOwn(APPLICATIONS, id)) return APPLICATIONS[id as DragonId].supportProfile ?? getSupportApplicationProfile(id);
  return getSupportApplicationProfile(application);
};
