import App from '@/app';
import { resolveSupportManagementApiTarget } from '@/config/api-config';
import { assertDragonBuild, getDragonDomain } from '@/config/dragon-build';
import { loadDragonDeployment } from '@/config/dragon-deployment';
import { configureSupportApplicationProfile } from '@/config/support-application-profile';
import { logApplicationFailure } from '@/services/request-diagnostics';
import { createSessionStore } from '@/utils/session-store';
import validateEnv from '@/utils/validateEnv';

import type { DragonApplication } from './dragon-application';

const composeApplication = (application: DragonApplication) => {
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
  // An investigation profile is only activated by the reviewed deployment flag. Requiring an
  // explicit value keeps a release that forgot the flag from starting silently inactive.
  if (application.supportProfile?.documents.length && !['true', 'false'].includes(process.env.NEXT_PUBLIC_USE_INVESTIGATION ?? '')) {
    throw new Error(`Dragon ${application.id} composes investigation documents; NEXT_PUBLIC_USE_INVESTIGATION must be declared true or false`);
  }
  if (application.supportProfile) configureSupportApplicationProfile(application.supportProfile);
  return deployment;
};

// Each stage records a static failure label before the rejection reaches the process-level
// handler, whose record cannot say which stage failed or why.
export const startServer = async (application: DragonApplication): Promise<void> => {
  let deployment: ReturnType<typeof composeApplication>;
  try {
    deployment = composeApplication(application);
  } catch (error) {
    logApplicationFailure('Dragon application composition was rejected at startup', error);
    throw error;
  }
  await validateEnv();
  let sessionStore: Awaited<ReturnType<typeof createSessionStore>>;
  try {
    sessionStore = await createSessionStore();
  } catch (error) {
    logApplicationFailure('Session store connection failed at startup', error);
    throw error;
  }
  try {
    new App(application.controllers, sessionStore, deployment).listen();
  } catch (error) {
    logApplicationFailure('HTTP server failed to start', error);
    throw error;
  }
};
