import { appConfig } from '@config/appconfig';
import { configureApplication, dragon } from '@dragon';

import { APP_IDENTITY, BUILT_DRAGON_ID } from './app-identity';
import { isProductionBuildPhase } from './build-phase';
import { composeDragon, validateDragonDeployment } from './compose-dragon';

/**
 * Side-effect module: importing it composes the dragon for the importing module graph.
 *
 * It runs once per graph because that is how ES modules work - a module body is evaluated the
 * first time it is imported and never again, however many importers it has. The guard is
 * deliberately not a `globalThis` flag: the server-component and SSR graphs share one Node
 * process but hold separate copies of the policy singleton, and a process-wide flag would leave
 * the second graph unconfigured. `src/app/layout.tsx` imports this in every graph; see
 * `README.md` here for why there are three.
 */
if (!isProductionBuildPhase(process.env.NEXT_PHASE)) {
  validateDragonDeployment(APP_IDENTITY, BUILT_DRAGON_ID, appConfig);
  // Skipped only while `next build` evaluates the modules with placeholder values; see build-phase.ts.
  composeDragon({ identity: APP_IDENTITY, dragon, features: appConfig.features });
  configureApplication();
}
