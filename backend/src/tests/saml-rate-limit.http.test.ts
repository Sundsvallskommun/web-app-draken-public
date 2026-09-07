import { once } from 'node:events';

import express from 'express';
import request from 'supertest';

import requestDiagnosticsMiddleware from '@/middlewares/request-diagnostics.middleware';
import { createSamlRateLimit } from '@/middlewares/saml-rate-limit.middleware';
import { logger } from '@/utils/logger';

const privateValue = 'synthetic-private-case-and-token';
const createApp = () => {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestDiagnosticsMiddleware);
  app.get('/saml/login', createSamlRateLimit(), (_req, res) => res.sendStatus(200));
  return app;
};
beforeEach(() => {
  vi.spyOn(logger, 'info').mockReturnValue(logger);
  vi.spyOn(logger, 'warn').mockReturnValue(logger);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

it('rejects malformed proxy client addresses without exposing the address, query or headers', async () => {
  const app = createApp();
  const response = await request(app)
    .get(`/saml/login?token=${privateValue}`)
    .set('X-Forwarded-For', privateValue)
    .set('Forwarded', `for=${privateValue}`);
  expect(response.status).toBe(400);
  expect(response.body).toEqual({ message: 'Invalid client address' });
  expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).toContain('SAML request rejected');
  expect(JSON.stringify([...vi.mocked(logger.warn).mock.calls, ...vi.mocked(logger.info).mock.calls])).not.toContain(privateValue);
  expect(console.error).not.toHaveBeenCalled();
  expect(console.warn).not.toHaveBeenCalled();
});

it('keeps an ignored Forwarded header visible as a safe operational warning', async () => {
  const response = await request(createApp()).get('/saml/login').set('Forwarded', `for=${privateValue}`);
  expect(response.status).toBe(200);
  expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).toContain('Forwarded header is ignored');
  expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(privateValue);
  expect(console.error).not.toHaveBeenCalled();
});

it.each([
  ['198.51.100.1', '198.51.100.1', '198.51.100.2'],
  ['2001:db8:1234:5600::1', '2001:db8:1234:5600::2', '2001:db8:9999:5600::1'],
])('retains the 100-request limit and IP/subnet grouping for %s', async (address, sameBucket, otherBucket) => {
  // One listener owns the whole sequence. Creating and closing a listener for each
  // request can race pooled sockets when the full suite runs concurrently.
  const server = createApp().listen(0);
  await once(server, 'listening');
  try {
    const client = request(server);
    for (let index = 0; index < 100; index += 1) {
      expect((await client.get('/saml/login').set('X-Forwarded-For', address)).status).toBe(200);
    }
    expect((await client.get('/saml/login').set('X-Forwarded-For', sameBucket)).status).toBe(429);
    expect((await client.get('/saml/login').set('X-Forwarded-For', otherBucket)).status).toBe(200);
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
});
