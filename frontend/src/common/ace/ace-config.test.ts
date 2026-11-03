import { afterEach, describe, expect, test, vi } from 'vitest';

import { getAceConfig, resolveAceConfig } from './ace-config';

describe('getAceConfig test override', () => {
  const testConfig = { origin: 'https://ace.e2e.test', company: 'e2e' };
  const scriptUrl = 'https://ace.e2e.test/enClient/JSApi/external/JSApi.js?company=e2e';

  const given = (environment: string, nodeEnv = 'production') => {
    vi.stubEnv('NEXT_PUBLIC_ACE_ORIGIN', '');
    vi.stubEnv('NEXT_PUBLIC_ACE_COMPANY', '');
    vi.stubEnv('NEXT_PUBLIC_ENVIRONMENT', environment);
    vi.stubEnv('NODE_ENV', nodeEnv);
    vi.stubGlobal('window', { __DRAKEN_ACE_TEST_CONFIG__: testConfig });
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test('enables ACE from the page in a TEST build', () => {
    given('TEST');
    expect(getAceConfig()).toEqual({ mode: 'script', scriptUrl });
  });

  test('enables ACE from the page in development', () => {
    given('', 'development');
    expect(getAceConfig()).toEqual({ mode: 'script', scriptUrl });
  });

  test('ignores the page in other builds', () => {
    given('PROD');
    expect(getAceConfig()).toBeNull();
    given('NEXT_PUBLIC_ENVIRONMENT_PLACEHOLDER');
    expect(getAceConfig()).toBeNull();
  });
});

describe('resolveAceConfig', () => {
  test('builds the external JS API url from origin and company', () => {
    expect(resolveAceConfig({ origin: 'https://ace.example.se', company: 'Sundsvall' })).toEqual({
      mode: 'script',
      scriptUrl: 'https://ace.example.se/enClient/JSApi/external/JSApi.js?company=Sundsvall',
    });
  });

  test('uses only the origin of the configured url', () => {
    expect(resolveAceConfig({ origin: 'https://ace.example.se/telia/aceInteract/', company: 'Sundsvall' })).toEqual({
      mode: 'script',
      scriptUrl: 'https://ace.example.se/enClient/JSApi/external/JSApi.js?company=Sundsvall',
    });
  });

  test('is disabled when origin or company is missing', () => {
    expect(resolveAceConfig({})).toBeNull();
    expect(resolveAceConfig({ origin: '', company: '' })).toBeNull();
    expect(resolveAceConfig({ origin: 'https://ace.example.se', company: ' ' })).toBeNull();
    expect(resolveAceConfig({ origin: '', company: 'Sundsvall' })).toBeNull();
  });

  test('is disabled when the Docker build placeholder was never replaced', () => {
    expect(
      resolveAceConfig({ origin: 'NEXT_PUBLIC_ACE_ORIGIN_PLACEHOLDER', company: 'NEXT_PUBLIC_ACE_COMPANY_PLACEHOLDER' })
    ).toBeNull();
  });

  test('rejects origins that are not http(s)', () => {
    expect(resolveAceConfig({ origin: 'javascript:alert(1)', company: 'Sundsvall' })).toBeNull();
  });

  test('uses the mock only in development', () => {
    expect(resolveAceConfig({ mock: 'true', isDevelopment: true })).toEqual({ mode: 'mock' });
    expect(resolveAceConfig({ mock: 'true', isDevelopment: false })).toBeNull();
    expect(resolveAceConfig({ mock: 'false', isDevelopment: true })).toBeNull();
  });
});
