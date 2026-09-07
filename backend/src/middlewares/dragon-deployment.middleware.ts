import type { RequestHandler } from 'express';

import type { DeploymentIdentity } from '@/config/dragon-deployment';

/** A release compatibility check, in addition to the existing session and upstream authorization. */
export const dragonDeploymentMiddleware =
  (expected: DeploymentIdentity): RequestHandler =>
  (req, res, next) => {
    // Documentation is fetched by browsers and contract generators before they know the
    // release headers. Its GET resources carry no case data; Try it requests still use
    // the normal API routes and must present the headers documented in the spec.
    const publicResource = req.path === '/health/up' || req.path === '/swagger.json' || req.path === '/api-docs' || req.path.startsWith('/api-docs/');
    if (req.method === 'OPTIONS' || (req.method === 'GET' && publicResource)) return next();
    if (
      req.get('X-Draken-Dragon') !== expected.dragon ||
      req.get('X-Draken-Revision') !== expected.revision ||
      req.get('X-Draken-Deployment') !== expected.deployment
    ) {
      res.status(409).json({ code: 'DRAKEN_DEPLOYMENT_MISMATCH', message: 'DRAKEN_DEPLOYMENT_MISMATCH' });
      return;
    }
    next();
  };
