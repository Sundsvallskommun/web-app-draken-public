import App from '@/app';
import { assertDragonBuild } from '@/config/dragon-build';
import { configureSupportInvestigationProfile, createSupportInvestigationProfile } from '@/config/support-investigation-profile';
import { createSessionStore } from '@/utils/session-store';
import validateEnv from '@/utils/validateEnv';

import type { DragonApplication } from './dragon-application';

export const startServer = async (application: DragonApplication): Promise<void> => {
  assertDragonBuild(application.id);
  if (application.investigationProfile && application.investigationProfile.application !== application.id) {
    throw new Error(`Investigation profile does not belong to dragon ${application.id}`);
  }
  configureSupportInvestigationProfile(
    application.investigationProfile ?? createSupportInvestigationProfile({ application: application.id, documents: [] }),
  );
  validateEnv();
  const sessionStore = await createSessionStore();
  new App(application.controllers, sessionStore).listen();
};
