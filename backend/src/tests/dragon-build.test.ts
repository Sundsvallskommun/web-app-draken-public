import express from 'express';
import { useExpressServer } from 'routing-controllers';
import request from 'supertest';

import { assertDragonBuild } from '@/config/dragon-build';
import { configureSupportApplicationProfile, getSupportApplicationProfile } from '@/config/support-application-profile';
import { SupportApplicationPolicyService } from '@/services/support-application-policy.service';
import { startServer } from '@/shell/start-server';

import dragons from '../../../dragons.json';
import { APPLICATIONS } from './helpers/dragon-applications';
import { mockUser } from './helpers/http';
import { collectRegisteredRoutes } from './helpers/routes';

describe('individual dragon deployment boundaries', () => {
  it.each(Object.keys(dragons))('IAF refuses another runtime identity: %s', identity => {
    if (identity === 'IAF') expect(() => assertDragonBuild('IAF', identity)).not.toThrow();
    else expect(() => assertDragonBuild('IAF', identity)).toThrow('built for IAF');
  });

  it.each(['', 'iaf', 'UNKNOWN'])('refuses unknown identity %s', identity => {
    expect(() => assertDragonBuild('IAF', identity)).toThrow('Unknown dragon');
  });

  it.each(Object.entries(APPLICATIONS))('%s exposes only its composed API, even to an authenticated caller', async (id, { controllers }) => {
    const definition = dragons[id as keyof typeof dragons];
    const support = definition.domain === 'supportmanagement';
    const routes = collectRegisteredRoutes(controllers);
    expect(routes.some(route => route.path.startsWith('/supporterrands/'))).toBe(support);
    expect(routes.some(route => route.path.startsWith('/casedata/'))).toBe(!support);
    expect(routes.some(route => route.path.includes('/json-parameters/'))).toBe(['IAF', 'VOF'].includes(id));
    expect(new Set(controllers).size).toBe(controllers.length);

    const app = express();
    app.use((req, _res, next) => {
      Object.assign(req, { user: mockUser(), isAuthenticated: () => true });
      next();
    });
    useExpressServer(app, { controllers });
    expect((await request(app).get(support ? '/casedata/2281/errands/1' : '/supporterrands/2281/1')).status).toBe(404);
    if (support) expect((await request(app).get('/contracts')).status).toBe(404);
  });
});

describe('dragon-owned investigation composition', () => {
  it.each(Object.entries(APPLICATIONS))('%s selects its profile explicitly', (id, application) => {
    expect(Boolean(application.supportProfile)).toBe(['IAF', 'VOF'].includes(id));
    if (!application.supportProfile) return;
    configureSupportApplicationProfile(application.supportProfile);
    const profile = getSupportApplicationProfile(id);
    expect(profile.application).toBe(id);
    expect(profile.documents).toHaveLength(3);
    expect(new SupportApplicationPolicyService(undefined, profile).classificationPolicy).toBeDefined();
    expect(getSupportApplicationProfile(id === 'IAF' ? 'VOF' : 'IAF').documents).toEqual([]);
  });
});

it('rejects a mismatched investigation profile before startup', async () => {
  vi.stubEnv('APPLICATION', 'IAF');
  try {
    await expect(startServer({ ...APPLICATIONS.IAF, supportProfile: APPLICATIONS.VOF.supportProfile })).rejects.toThrow(
      'does not belong to dragon IAF',
    );
  } finally {
    vi.unstubAllEnvs();
  }
});

it('validates application-owned API requirements before opening a server', async () => {
  vi.stubEnv('APPLICATION', 'IAF');
  vi.stubEnv('SUPPORTMANAGEMENT_API_TARGET', 'stable');
  try {
    await expect(startServer(APPLICATIONS.IAF)).rejects.toThrow('requires a different SupportManagement API target');
  } finally {
    vi.unstubAllEnvs();
  }
});
