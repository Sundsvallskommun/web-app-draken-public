import { Request, RequestHandler } from 'express';

import { createRequestDiagnostics, logHttpRequest, withRequestDiagnostics } from '@/services/request-diagnostics';

const matchedRouteTemplate = (request: Request): string => {
  const route: unknown = request.route;
  if (typeof route !== 'object' || route === null || !('path' in route)) return '<unmatched>';
  return typeof route.path === 'string' ? route.path : '<pattern>';
};

const requestDiagnosticsMiddleware: RequestHandler = (req, res, next) => {
  const diagnostics = createRequestDiagnostics(req.method, () => matchedRouteTemplate(req));
  // Never reuse a client-supplied id, even if it looks like a UUID.
  res.setHeader('X-Request-Id', diagnostics.requestId);
  res.once('finish', () => {
    if (diagnostics.routeTemplate().endsWith('/health/up')) return;
    logHttpRequest(diagnostics, res.statusCode);
  });
  withRequestDiagnostics(diagnostics, next);
};

export default requestDiagnosticsMiddleware;
