'use client';

import './bootstrap';

import { configureApiDeployment } from '@common/services/api-service';

import { BUILT_DRAGON_ID, BUILT_REVISION, DEPLOYMENT_ID } from './app-identity';
import { isProductionBuildPhase } from './build-phase';

if (!isProductionBuildPhase(process.env.NEXT_PHASE)) {
  configureApiDeployment({ dragon: BUILT_DRAGON_ID, revision: BUILT_REVISION, deployment: DEPLOYMENT_ID });
}

/**
 * Renders nothing; the import above is the point. Server components and client components are
 * bundled into separate module graphs, so `layout.tsx` importing `./bootstrap` configures only the
 * server-component graph. Rendering this client component pulls `./bootstrap` into the client
 * graph too - both the SSR pass and the browser - before `AppLayout` and anything under it runs.
 */
export const DragonBootstrap = (): null => null;
