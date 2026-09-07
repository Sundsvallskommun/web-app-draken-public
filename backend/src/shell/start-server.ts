import App from '@/app';
import { resolveSupportManagementApiTarget } from '@/config/api-config';
import { assertDragonBuild, getDragonDomain } from '@/config/dragon-build';
import { loadDragonDeployment } from '@/config/dragon-deployment';
import { configureSupportApplicationProfile } from '@/config/support-application-profile';
import { createSessionStore } from '@/utils/session-store';
import validateEnv from '@/utils/validateEnv';

import type { DragonApplication } from './dragon-application';

export const startServer = async (application: DragonApplication): Promise<void> => {
  assertDragonBuild(application.id);
  const deployment = loadDragonDeployment(application.id);
  if (getDragonDomain(application.id) === 'supportmanagement' && !application.supportProfile) {
    throw new Error(`SupportManagement dragon ${application.id} requires an explicit application profile with registration policy`);
  }
  if (getDragonDomain(application.id) === 'casedata' && application.supportProfile) {
    throw new Error(`CaseData dragon ${application.id} must not configure a SupportManagement application profile`);
  }
  if (application.supportProfile && application.supportProfile.application !== application.id) {
    throw new Error(`Support application profile does not belong to dragon ${application.id}`);
  }
  const requiredTarget = application.supportProfile?.requiredSupportManagementApiTarget;
  if (requiredTarget && requiredTarget !== resolveSupportManagementApiTarget()) {
    throw new Error('The composed application profile requires a different SupportManagement API target');
  }
  if (application.supportProfile) configureSupportApplicationProfile(application.supportProfile);
  validateEnv();
  const sessionStore = await createSessionStore();
  new App(application.controllers, sessionStore, deployment).listen();
};
