import App from '@/app';
import { resolveSupportManagementApiTarget } from '@/config/api-config';
import { assertDragonBuild } from '@/config/dragon-build';
import { loadDragonDeployment } from '@/config/dragon-deployment';
import { configureSupportApplicationProfile, createSupportApplicationProfile } from '@/config/support-application-profile';
import { createSessionStore } from '@/utils/session-store';
import validateEnv from '@/utils/validateEnv';

import type { DragonApplication } from './dragon-application';

export const startServer = async (application: DragonApplication): Promise<void> => {
  assertDragonBuild(application.id);
  const deployment = loadDragonDeployment(application.id);
  if (application.supportProfile && application.supportProfile.application !== application.id) {
    throw new Error(`Support application profile does not belong to dragon ${application.id}`);
  }
  const requiredTarget = application.supportProfile?.requiredSupportManagementApiTarget;
  if (requiredTarget && requiredTarget !== resolveSupportManagementApiTarget()) {
    throw new Error('The composed application profile requires a different SupportManagement API target');
  }
  configureSupportApplicationProfile(application.supportProfile ?? createSupportApplicationProfile({ application: application.id, documents: [] }));
  validateEnv();
  const sessionStore = await createSessionStore();
  new App(application.controllers, sessionStore, deployment).listen();
};
