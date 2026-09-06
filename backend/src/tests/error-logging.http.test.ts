import express from 'express';
import request from 'supertest';

import { HttpException } from '@/exceptions/HttpException';
import errorMiddleware from '@/middlewares/error.middleware';
import { logger } from '@/utils/logger';

vi.mock('@/utils/logger', () => ({ logger: { error: vi.fn() } }));

it('returns the error response without writing case data or validation values to logs', async () => {
  const app = express();
  app.use(express.json());
  app.post('/errands/:id', (_req, _res, next) => {
    const error = new HttpException(400, 'Invalid private case description');
    error.errors = [{ property: 'private-property', constraints: { invalid: 'private-validation-value' } }];
    next(error);
  });
  app.use(errorMiddleware);

  const response = await request(app)
    .post('/errands/private-person-id?search=private-search')
    .set('Authorization', 'Bearer private-token')
    .send({ description: 'private-body' });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({ message: 'Invalid private case description' });
  expect(logger.error).toHaveBeenCalledWith('HTTP request failed: method=POST status=400');
  expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain('private');
});
