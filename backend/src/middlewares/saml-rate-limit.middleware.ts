import { isIP } from 'node:net';

import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';

import { logApplicationWarning } from '@/services/request-diagnostics';

/** Validate before the limiter: its invalid-IP diagnostic interpolates proxy data. */
export const createSamlRateLimit = (): RequestHandler => {
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    // These two diagnostics are replaced below by safe records. Keep the other
    // setup checks, MemoryStore and default IPv6 subnet-aware key generation.
    validate: { ip: false, forwardedHeader: false },
  });
  return (req, res, next) => {
    if (!req.ip || isIP(req.ip) === 0) {
      logApplicationWarning('SAML request rejected because the client address is invalid');
      res.status(400).json({ message: 'Invalid client address' });
      return;
    }
    if (req.headers.forwarded && req.ip === req.socket.remoteAddress) {
      logApplicationWarning('SAML Forwarded header is ignored; verify the proxy configuration');
    }
    limiter(req, res, next);
  };
};
