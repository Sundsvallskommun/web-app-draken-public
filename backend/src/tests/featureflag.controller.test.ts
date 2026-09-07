import express from 'express';
import { useExpressServer } from 'routing-controllers';
import request from 'supertest';

import { FeatureFlagController } from '@/controllers/featureflag.controller';
import errorMiddleware from '@/middlewares/error.middleware';
import { FeatureFlagConfigurationError, featureFlagService } from '@/services/feature-flag.service';

import { mockUser } from './helpers/http';

afterEach(() => vi.restoreAllMocks());

it('returns an explicit migration conflict to the browser without exporting flag values', async () => {
  vi.spyOn(featureFlagService, 'getFeatureFlags').mockRejectedValue(new FeatureFlagConfigurationError());
  const app = express();
  app.use((req, _res, next) => {
    Object.assign(req, { user: mockUser(), isAuthenticated: () => true });
    next();
  });
  useExpressServer(app, { controllers: [FeatureFlagController], defaultErrorHandler: false });
  app.use(errorMiddleware);
  const response = await request(app).get('/featureflags');
  expect(response.status).toBe(409);
  expect(response.body).toEqual({ message: 'INVESTIGATION_FLAGS_REQUIRE_MIGRATION' });
});
