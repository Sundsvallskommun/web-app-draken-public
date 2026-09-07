// Swagger must stay reachable without a session - it was public before the default-deny
// guard, and locking it would be a regression.
//
// The interesting case is not the /api-docs HTML but the assets beneath it: Swagger UI is
// served by `swaggerUi.serve`, which is [swaggerInitFn, express.static(...)], so the page
// pulls swagger-ui.css and swagger-ui-bundle.js from the same mount. An exact-match
// allow-list would return the HTML shell and 401 every asset, leaving a blank page rather
// than an honest error - which is exactly the failure this test is here to catch.
//
// Nothing is imported statically from '@/config' or '@/app': config reads SWAGGER_ENABLED
// into a module-level const at import time, and static imports are hoisted above the
// assignment below. Everything that touches config is therefore imported dynamically.

import session from 'express-session';
import type { OpenAPIObject, ParameterObject, ReferenceObject } from 'openapi3-ts';
import request from 'supertest';

import type { DeploymentIdentity } from '@/config/dragon-deployment';

vi.mock('@/services/api.service', () => {
  const stub = vi.fn(async () => ({ data: {} }));
  return {
    default: class {
      get = stub;
      post = stub;
      patch = stub;
      put = stub;
      delete = stub;
    },
  };
});

describe('default-deny auth (swagger)', () => {
  let server: import('express').Application;
  const prefix = process.env.BASE_URL_PREFIX ?? '';
  const deployment: DeploymentIdentity = { dragon: 'KC', revision: 'a'.repeat(40), deployment: 'b'.repeat(64) };

  beforeAll(async () => {
    process.env.SWAGGER_ENABLED = 'true';

    const { default: App } = await import('@/app');
    const { application } = await import('@/dragons/kc/application');

    server = new App(application.controllers, new session.MemoryStore(), deployment).getServer();
  });

  it('mounts swagger at all (guards the rest of this suite from passing vacuously)', async () => {
    const response = await request(server).get(`${prefix}/api-docs/`);

    expect(response.status).toBe(200);
  });

  it.each([
    ['the UI entry point', '/api-docs/'],
    ['the generated init script', '/api-docs/swagger-ui-init.js'],
    ['a static stylesheet', '/api-docs/swagger-ui.css'],
    ['a static bundle', '/api-docs/swagger-ui-bundle.js'],
    ['the raw spec', '/swagger.json'],
  ])('serves %s without a session', async (_label, path) => {
    const response = await request(server).get(`${prefix}${path}`);

    expect(response.status).toBe(200);
  });

  it('publishes a headerless JSON spec that supplies release headers for Try it requests', async () => {
    const response = await request(server).get(`${prefix}/swagger.json`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/u);
    const spec: OpenAPIObject = response.body;
    expect(spec.openapi).toMatch(/^3\./u);
    expect(Object.keys(spec.paths).length).toBeGreaterThan(1);
    for (const [path, definition] of Object.entries(spec.paths)) {
      if (path === `${prefix}/health/up`) continue;
      const parameters = (definition.parameters ?? []).filter(
        (parameter: ParameterObject | ReferenceObject): parameter is ParameterObject => !('$ref' in parameter) && parameter.in === 'header',
      );
      expect(parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'X-Draken-Dragon', required: true, schema: { type: 'string', default: deployment.dragon } }),
          expect.objectContaining({ name: 'X-Draken-Revision', required: true, schema: { type: 'string', default: deployment.revision } }),
          expect.objectContaining({ name: 'X-Draken-Deployment', required: true, schema: { type: 'string', default: deployment.deployment } }),
        ]),
      );
    }

    const parameters = spec.paths[`${prefix}/`].parameters ?? [];
    const headers: Record<string, string> = {};
    for (const parameter of parameters) {
      if ('$ref' in parameter || parameter.in !== 'header' || !parameter.schema || '$ref' in parameter.schema) continue;
      if (typeof parameter.schema.default === 'string') headers[parameter.name] = parameter.schema.default;
    }
    // Reading documentation does not grant an exception to the documented API routes.
    expect((await request(server).get(`${prefix}/`)).status).toBe(409);
    expect((await request(server).get(`${prefix}/`).set(headers)).status).toBe(200);
    expect((await request(server).get(`${prefix}/definitely-not-a-route`).set(headers)).status).toBe(401);
  });

  it('does not open sibling paths that merely share a prefix', async () => {
    // '/api-docs' is prefix-matched, so the match must stop at a segment boundary.
    const response = await request(server).get(`${prefix}/api-docsomething`);

    expect(response.status).toBe(401);
  });
});
