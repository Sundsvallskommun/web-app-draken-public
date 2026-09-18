import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test('service notes have one visibility flag, off unless a deployment turns it on', async () => {
  vi.stubEnv('NEXT_PUBLIC_USE_SERVICE_NOTES', '');
  vi.resetModules();
  const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');
  expect(appConfig.features.useServiceNotes).toBe(false);
  applyRuntimeFeatureFlags([{ name: 'useServiceNotes', enabled: true }]);
  expect(appConfig.features.useServiceNotes).toBe(true);
  applyRuntimeFeatureFlags([{ name: 'useMeasures', enabled: true }]);
  expect(appConfig.features.useServiceNotes).toBe(false);
});
