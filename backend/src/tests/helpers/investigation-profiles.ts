import { IAF_SUPPORT_INVESTIGATION_PROFILE, VOF_SUPPORT_INVESTIGATION_PROFILE } from '@/avvikelse/investigation-profile';
import { getSupportInvestigationProfile } from '@/config/support-investigation-profile';

export const investigationProfileFixture = (application: string | undefined) => {
  const id = application?.trim().toUpperCase();
  if (id === 'IAF') return IAF_SUPPORT_INVESTIGATION_PROFILE;
  if (id === 'VOF') return VOF_SUPPORT_INVESTIGATION_PROFILE;
  return getSupportInvestigationProfile(application);
};
