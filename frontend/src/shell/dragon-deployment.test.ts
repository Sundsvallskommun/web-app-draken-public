import assert from 'node:assert/strict';

import { type AppConfig, appConfig } from '@config/appconfig';
import { test } from 'vitest';

import { validateDragonDeployment } from './compose-dragon';

const support: AppConfig = {
  ...appConfig,
  isCaseData: false,
  isSupportManagement: true,
  features: { ...appConfig.features, useAvvikelseInvestigation: false, useAotInvestigation: false },
};

test('the Avvikelse deployment accepts its own identity and can disable investigation for recovery', () => {
  assert.doesNotThrow(() => validateDragonDeployment('IAF', 'IAF', support));
  assert.doesNotThrow(() =>
    validateDragonDeployment('VOF', 'VOF', {
      ...support,
      features: { ...support.features, useAvvikelseInvestigation: true },
    })
  );
});

test('a build cannot be repurposed as a dragon in another dragon', () => {
  assert.throws(() => validateDragonDeployment('KC', 'IAF', support), /cannot run/);
  assert.throws(() => validateDragonDeployment('VOF', 'IAF', support), /cannot run/);
  assert.throws(() => validateDragonDeployment('IAF', 'KC', support), /cannot run/);
  assert.throws(() => validateDragonDeployment('UNKNOWN', 'KC', support), /Unknown dragon/);
});

test('runtime flags cannot enable another domain or investigation implementation', () => {
  assert.throws(() => validateDragonDeployment('IAF', 'IAF', { ...support, isCaseData: true }), /Domain flags/);
  assert.throws(
    () => validateDragonDeployment('IAF', 'IAF', { ...support, isSupportManagement: false }),
    /Domain flags/
  );
  assert.throws(
    () =>
      validateDragonDeployment('KC', 'KC', {
        ...support,
        features: { ...support.features, useAvvikelseInvestigation: true },
      }),
    /Avvikelse investigation requires/
  );
  assert.throws(
    () =>
      validateDragonDeployment('IAF', 'IAF', {
        ...support,
        features: { ...support.features, useAotInvestigation: true },
      }),
    /AOT investigation requires/
  );
});

test('CaseData requires its own domain flags', () => {
  assert.doesNotThrow(() =>
    validateDragonDeployment('MEX', 'MEX', { ...support, isCaseData: true, isSupportManagement: false })
  );
  assert.throws(() => validateDragonDeployment('MEX', 'MEX', support), /Domain flags/);
});

test('KC cannot enable AOT merely because both use SM', () => {
  assert.throws(
    () =>
      validateDragonDeployment('KC', 'KC', {
        ...support,
        features: { ...support.features, useAotInvestigation: true },
      }),
    /AOT investigation requires/
  );
  assert.doesNotThrow(() =>
    validateDragonDeployment('AOT', 'AOT', {
      ...support,
      features: { ...support.features, useAotInvestigation: true },
    })
  );
});
