import { resolve } from 'node:path';

import type { DeploymentIdentity } from '../../../scripts/dragon-deployment.cjs';
import { deploymentIdentity, readBuild, readRelease, runtimeEnvironment } from '../../../scripts/dragon-deployment.cjs';
import type { DragonId } from './dragon-build';

export type { DeploymentIdentity } from '../../../scripts/dragon-deployment.cjs';

/** The launcher applies the reviewed configuration before configuration modules are imported. */
export const loadDragonDeployment = (dragon: DragonId): DeploymentIdentity => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return { dragon, revision: 'development', deployment: 'development' };
  }
  if (!process.env.DRAKEN_DEPLOYMENT_FILE) throw new Error('Production requires DRAKEN_DEPLOYMENT_FILE.');
  const build = readBuild(resolve(__dirname, '..', 'dragon-build.json'));
  if (build.id !== dragon) throw new Error('Entrypoint does not match immutable build metadata.');
  const release = readRelease(process.env.DRAKEN_DEPLOYMENT_FILE);
  const expected = runtimeEnvironment('backend', build, release, process.env, process.env.DRAKEN_SECRET_DIRECTORY || '/run/draken-secrets');
  if (Object.entries(expected).some(([key, value]) => process.env[key] !== value)) {
    throw new Error('Start the backend through the dragon launcher so reviewed configuration is applied before imports.');
  }
  return Object.freeze(deploymentIdentity(release));
};
