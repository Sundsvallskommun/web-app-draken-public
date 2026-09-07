import assert from 'node:assert/strict';

import { type AxiosAdapter, AxiosError, AxiosHeaders, type AxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, test, vi } from 'vitest';

const deployment = { dragon: 'IK', revision: 'a'.repeat(40), deployment: 'b'.repeat(64) };

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://draken.test/api');
});
afterEach(() => vi.unstubAllEnvs());

for (const method of ['get', 'post', 'patch', 'put', 'deleteRequest'] as const) {
  test(`${method} sends the configured deployment without accepting header overrides`, async () => {
    const { apiService, configureApiDeployment } = await import('./api-service');
    configureApiDeployment(deployment);
    let requests = 0;
    const adapter: AxiosAdapter = async (config) => {
      requests += 1;
      assert.equal(config.headers.get('X-Draken-Dragon'), deployment.dragon);
      assert.equal(config.headers.get('X-Draken-Revision'), deployment.revision);
      assert.equal(config.headers.get('X-Draken-Deployment'), deployment.deployment);
      assert.equal(config.headers.get('If-Match'), '"12"');
      assert.equal(config.timeout, 456);
      assert.equal(config.withCredentials, true);
      return { data: { saved: true }, status: 200, statusText: 'OK', headers: {}, config };
    };
    const callerHeaders = new AxiosHeaders({
      'x-draken-dragon': 'MEX',
      'X-DRAKEN-REVISION': 'another-version',
      'x-draken-deployment': false,
      'If-Match': '"12"',
    });
    const options: AxiosRequestConfig = { adapter, headers: callerHeaders, timeout: 456 };

    if (method === 'get' || method === 'deleteRequest') await apiService[method]('errands', options);
    else await apiService[method]('errands', { title: 'Ärende' }, options);

    assert.equal(requests, 1);
    assert.equal(callerHeaders.get('x-draken-dragon'), 'MEX', 'Caller headers must not be mutated');
  });
}

test('a deployment conflict stops requests and notifies the application without replaying a write', async () => {
  const {
    apiService,
    configureApiDeployment,
    ApiDeploymentMismatchError,
    DEPLOYMENT_MISMATCH_CODE,
    getApiDeploymentError,
    subscribeApiDeploymentError,
  } = await import('./api-service');
  configureApiDeployment(deployment);
  let requests = 0;
  let notifications = 0;
  const unsubscribe = subscribeApiDeploymentError(() => {
    notifications += 1;
  });
  const adapter: AxiosAdapter = async (config) => {
    requests += 1;
    throw new AxiosError('Conflict', 'ERR_BAD_REQUEST', config, undefined, {
      data: { code: DEPLOYMENT_MISMATCH_CODE, message: 'Untrusted server details' },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config,
    });
  };

  await assert.rejects(apiService.post('errands', { title: 'Ärende' }, { adapter }), ApiDeploymentMismatchError);
  assert.equal(requests, 1);
  assert.equal(notifications, 1);
  assert.match(getApiDeploymentError()?.message ?? '', /Ladda om sidan/);
  assert.doesNotMatch(getApiDeploymentError()?.message ?? '', /Untrusted server details/);
  await assert.rejects(apiService.post('errands', { title: 'Ärende' }, { adapter }), ApiDeploymentMismatchError);
  assert.equal(requests, 1);
  unsubscribe();
});

test('an ordinary version conflict stays an ordinary error and permits a corrected request', async () => {
  const { apiService, configureApiDeployment, getApiDeploymentError } = await import('./api-service');
  configureApiDeployment(deployment);
  const adapter: AxiosAdapter = async (config) => {
    throw new AxiosError('Stale version', 'ERR_BAD_REQUEST', config, undefined, {
      data: { message: 'Version conflict' },
      status: 409,
      statusText: 'Conflict',
      headers: {},
      config,
    });
  };

  await assert.rejects(apiService.patch('errands/1', { title: 'Ärende' }, { adapter }), /Stale version/);
  assert.equal(getApiDeploymentError(), null);
});

test('requests require a valid deployment and its identity cannot change in a running page', async () => {
  const { apiService, configureApiDeployment } = await import('./api-service');
  await assert.rejects(apiService.get('errands'), /has not configured/);
  assert.throws(() => configureApiDeployment({ ...deployment, revision: 'invalid' }), /Invalid API deployment/);
  configureApiDeployment(deployment);
  assert.doesNotThrow(() => configureApiDeployment({ ...deployment }));
  assert.throws(() => configureApiDeployment({ ...deployment, dragon: 'MEX' }), /cannot change/);
});
