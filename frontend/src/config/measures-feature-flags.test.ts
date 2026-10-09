import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test('measures have one visibility flag independent of investigation', async () => {
  vi.stubEnv('NEXT_PUBLIC_USE_MEASURES', '');
  vi.stubEnv('NEXT_PUBLIC_USE_INVESTIGATION', 'true');
  vi.resetModules();
  const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');
  expect(appConfig.features.useMeasures).toBe(false);
  applyRuntimeFeatureFlags([{ name: 'useMeasures', enabled: true }]);
  expect(appConfig.features.useMeasures).toBe(true);
  expect(appConfig.features.useInvestigation).toBe(false);
});
