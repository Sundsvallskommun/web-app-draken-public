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
  // 'close' also fires when the client aborts or a proxy times out before a response is
  // written; those requests would otherwise leave no HTTP-level record to correlate with.
  let recorded = false;
  const record = () => {
    if (recorded) return;
    recorded = true;
    if (diagnostics.routeTemplate().endsWith('/health/up')) return;
    logHttpRequest(diagnostics, res.writableFinished ? res.statusCode : 'no-response');
  };
  res.once('finish', record);
  res.once('close', record);
  withRequestDiagnostics(diagnostics, next);
};

export default requestDiagnosticsMiddleware;
