import { IAF_SUPPORT_APPLICATION_PROFILE, VOF_SUPPORT_APPLICATION_PROFILE } from '@/avvikelse/application-profile';
import { getSupportApplicationProfile } from '@/config/support-application-profile';

export const supportProfileFixture = (application: string | undefined) => {
  const id = application?.trim().toUpperCase();
  if (id === 'IAF') return IAF_SUPPORT_APPLICATION_PROFILE;
  if (id === 'VOF') return VOF_SUPPORT_APPLICATION_PROFILE;
  return getSupportApplicationProfile(application);
};
