import type { RequestHandler } from 'express';

import type { DeploymentIdentity } from '@/config/dragon-deployment';

/** A release compatibility check, in addition to the existing session and upstream authorization. */
export const dragonDeploymentMiddleware =
  (expected: DeploymentIdentity): RequestHandler =>
  (req, res, next) => {
    // Preflight and the content-free upstream probe do not access case data.
    if (req.method === 'OPTIONS' || (req.method === 'GET' && req.path === '/health/up')) return next();
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
