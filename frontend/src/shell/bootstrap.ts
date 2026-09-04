import { appConfig } from '@config/appconfig';

import { APP_IDENTITY } from './app-identity';
import { isProductionBuildPhase } from './build-phase';
import { composeDragon } from './compose-dragon';
import { DRAGON_REGISTRY } from './dragon-registry';

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
  // Skipped only while `next build` evaluates the modules with placeholder values; see build-phase.ts.
  composeDragon({ identity: APP_IDENTITY, registry: DRAGON_REGISTRY, features: appConfig.features });
}
