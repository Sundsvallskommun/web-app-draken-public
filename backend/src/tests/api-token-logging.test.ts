import axios, { AxiosError } from 'axios';

import ApiTokenService from '@/services/api-token.service';
import { createRequestDiagnostics, withRequestDiagnostics } from '@/services/request-diagnostics';
import { logger } from '@/utils/logger';

vi.mock('@/utils/redis', () => ({ getRedisClient: async () => null }));

it('correlates OAuth failures without logging credentials or the Axios error object', async () => {
  const errorLog = vi.spyOn(logger, 'error').mockImplementation(() => logger);
  const diagnostics = createRequestDiagnostics('POST', () => '/errands/:id');
  const previousAdapter = axios.defaults.adapter;
  let upstreamId: unknown;
  vi.stubEnv('CLIENT_KEY', 'private-client-key');
  vi.stubEnv('CLIENT_SECRET', 'private-client-secret');
  axios.defaults.adapter = async config => {
    upstreamId = config.headers.get('X-Request-Id');
    throw new AxiosError('private-oauth-error', 'private-code', config, undefined, {
      config,
      data: { private: 'private-response' },
      headers: { 'private-header': 'private-value' },
      status: 403,
      statusText: 'private-status',
    });
  };

  try {
    await expect(withRequestDiagnostics(diagnostics, () => new ApiTokenService().getToken())).rejects.toMatchObject({ status: 502 });
    expect(upstreamId).toBe(diagnostics.requestId);
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining(`"requestId":"${diagnostics.requestId}"`));
    expect(errorLog).toHaveBeenCalledWith(expect.stringContaining('"errorCode":"UPSTREAM_HTTP_ERROR"'));
    const output = JSON.stringify(errorLog.mock.calls);
    expect(output).not.toContain('private');
    expect(output).not.toContain(Buffer.from('private-client-key:private-client-secret').toString('base64'));
  } finally {
    axios.defaults.adapter = previousAdapter;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  }
});
