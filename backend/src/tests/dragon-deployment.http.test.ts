import cors from 'cors';
import express from 'express';
import request from 'supertest';

import type { DeploymentIdentity } from '@/config/dragon-deployment';
import { dragonDeploymentMiddleware } from '@/middlewares/dragon-deployment.middleware';

const expected: DeploymentIdentity = { dragon: 'IAF', revision: 'a'.repeat(40), deployment: 'b'.repeat(64) };
const headers = {
  'X-Draken-Dragon': expected.dragon,
  'X-Draken-Revision': expected.revision,
  'X-Draken-Deployment': expected.deployment,
};

describe('release compatibility before case access', () => {
  it.each(['GET', 'POST', 'PATCH', 'PUT', 'DELETE'])(
    'blocks %s from the wrong dragon, revision or configuration before reading/writing',
    async method => {
      let calls = 0;
      const app = express();
      app.use(cors({ origin: 'https://frontend.example', credentials: true }));
      app.use('/iaf', dragonDeploymentMiddleware(expected));
      app.all('/iaf/errands', (_req, res) => {
        calls += 1;
        res.json({ protected: true });
      });
      const invoke = (values: Record<string, string>) =>
        request(app)[method.toLowerCase() as 'get' | 'post' | 'patch' | 'put' | 'delete']('/iaf/errands').set(values);
      for (const wrong of [
        {},
        { ...headers, 'X-Draken-Dragon': 'VOF' },
        { ...headers, 'X-Draken-Revision': 'c'.repeat(40) },
        { ...headers, 'X-Draken-Deployment': 'd'.repeat(64) },
      ]) {
        const response = await invoke(wrong);
        expect(response.status).toBe(409);
        expect(response.body).toEqual({ code: 'DRAKEN_DEPLOYMENT_MISMATCH', message: 'DRAKEN_DEPLOYMENT_MISMATCH' });
        expect(response.headers['access-control-allow-origin']).toBe('https://frontend.example');
        expect(calls).toBe(0);
      }
      expect((await invoke(headers)).status).toBe(200);
      expect(calls).toBe(1);
    },
  );

  it('leaves preflight and the content-free health probe available without bypassing the guard for writes', async () => {
    const app = express();
    app.use('/iaf', dragonDeploymentMiddleware(expected));
    app.all('/iaf/health/up', (_req, res) => res.json({ status: 'OK' }));
    app.options('/iaf/errands', (_req, res) => res.sendStatus(204));
    expect((await request(app).get('/iaf/health/up')).status).toBe(200);
    expect((await request(app).options('/iaf/errands')).status).toBe(204);
    expect((await request(app).post('/iaf/health/up')).status).toBe(409);
    expect((await request(app).get('/iaf/health/up/extra')).status).toBe(409);
  });
});
