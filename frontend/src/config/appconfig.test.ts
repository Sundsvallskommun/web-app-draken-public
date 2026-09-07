import assert from 'node:assert/strict';

import { afterEach, beforeEach, test, vi } from 'vitest';

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

for (const domain of ['casedata', 'supportmanagement'] as const) {
  test(`${domain} stays fixed when Adminpanel returns stale or partial domain rows`, async () => {
    vi.stubEnv('DRAKEN_BUILD_DOMAIN', domain);
    const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');
    const expected = { isCaseData: domain === 'casedata', isSupportManagement: domain === 'supportmanagement' };

    applyRuntimeFeatureFlags([
      { name: 'isCaseData', enabled: !expected.isCaseData },
      { name: 'isSupportManagement', enabled: !expected.isSupportManagement },
      { name: 'useBilling', enabled: true },
    ]);

    assert.equal(appConfig.isCaseData, expected.isCaseData);
    assert.equal(appConfig.isSupportManagement, expected.isSupportManagement);
    assert.equal(appConfig.features.useBilling, true);

    applyRuntimeFeatureFlags([{ name: 'useDetailsTab', enabled: true }]);
    assert.equal(appConfig.isCaseData, expected.isCaseData);
    assert.equal(appConfig.isSupportManagement, expected.isSupportManagement);
    assert.equal(appConfig.features.useBilling, false);
    assert.equal(appConfig.features.useDetailsTab, true);

    assert.equal(Reflect.set(appConfig, 'isCaseData', !expected.isCaseData), false);
    assert.equal(Reflect.set(appConfig, 'isSupportManagement', !expected.isSupportManagement), false);
    vi.stubEnv('DRAKEN_BUILD_DOMAIN', domain === 'casedata' ? 'supportmanagement' : 'casedata');
    assert.equal(appConfig.isCaseData, expected.isCaseData);
    assert.equal(appConfig.isSupportManagement, expected.isSupportManagement);
  });
}

test('an empty Adminpanel response preserves the environment capabilities', async () => {
  vi.stubEnv('DRAKEN_BUILD_DOMAIN', 'supportmanagement');
  vi.stubEnv('NEXT_PUBLIC_USE_DETAILS_TAB', 'true');
  const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');

  applyRuntimeFeatureFlags([]);

  assert.equal(appConfig.isSupportManagement, true);
  assert.equal(appConfig.features.useDetailsTab, true);
});

test.each(['useAvvikelseInvestigation', 'useAotInvestigation'])(
  'rejects retired %s before applying any runtime changes',
  async (name) => {
    const { appConfig, applyRuntimeFeatureFlags, FeatureFlagConfigurationError } = await import('./appconfig');
    const before = { ...appConfig.features };
    for (const enabled of [true, false]) {
      assert.throws(
        () =>
          applyRuntimeFeatureFlags([
            { name: 'useInvestigation', enabled: true },
            { name, enabled },
          ]),
        FeatureFlagConfigurationError
      );
      assert.deepEqual(appConfig.features, before);
    }
  }
);

test('runtime uses only the master switch and ignores unknown names', async () => {
  const { appConfig, applyRuntimeFeatureFlags } = await import('./appconfig');
  for (const enabled of [true, false]) {
    applyRuntimeFeatureFlags([
      { name: 'useInvestigation', enabled },
      { name: '__proto__', enabled: true },
      { name: 'futureUnknown', enabled: true },
    ]);
    assert.equal(appConfig.features.useInvestigation, enabled);
    assert.equal(Object.hasOwn(appConfig.features, 'futureUnknown'), false);
    assert.equal(Object.hasOwn(appConfig.features, '__proto__'), false);
  }
});
