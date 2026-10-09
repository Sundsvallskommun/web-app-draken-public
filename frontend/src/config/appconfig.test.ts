import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test('preserves local feature configuration when the backend supplies no Adminpanel overrides', async () => {
  vi.stubEnv('NEXT_PUBLIC_IS_SUPPORTMANAGEMENT', 'true');
  vi.stubEnv('NEXT_PUBLIC_USE_INVESTIGATION', 'true');
  vi.stubEnv('NEXT_PUBLIC_USE_CONTRACTS', 'false');
  vi.resetModules();
  const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');
  const localConfig = structuredClone(appConfig);

  applyRuntimeFeatureFlags([]);

  expect(appConfig).toEqual(localConfig);
  expect(appConfig.isSupportManagement).toBe(true);
  expect(appConfig.features.useInvestigation).toBe(true);
  expect(appConfig.features.useContracts).toBe(false);
});
