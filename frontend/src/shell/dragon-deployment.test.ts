import assert from 'node:assert/strict';

import { type AppConfig, appConfig } from '@config/appconfig';
import { test } from 'vitest';

import { validateDragonDeployment } from './compose-dragon';

const support: AppConfig = {
  ...appConfig,
  isCaseData: false,
  isSupportManagement: true,
  features: { ...appConfig.features },
};

test('the Avvikelse deployment accepts its own identity and can disable investigation for recovery', () => {
  assert.doesNotThrow(() => validateDragonDeployment('IAF', 'IAF', support));
  assert.doesNotThrow(() =>
    validateDragonDeployment('VOF', 'VOF', {
      ...support,
      features: { ...support.features, useInvestigation: true },
    })
  );
});

test('a build cannot be repurposed as a dragon in another dragon', () => {
  assert.throws(() => validateDragonDeployment('KC', 'IAF', support), /cannot run/);
  assert.throws(() => validateDragonDeployment('VOF', 'IAF', support), /cannot run/);
  assert.throws(() => validateDragonDeployment('IAF', 'KC', support), /cannot run/);
  assert.throws(() => validateDragonDeployment('UNKNOWN', 'KC', support), /Unknown dragon/);
});

test('the built domain must match the application', () => {
  assert.throws(() => validateDragonDeployment('IAF', 'IAF', { ...support, isCaseData: true }), /Domain configuration/);
  assert.throws(
    () => validateDragonDeployment('IAF', 'IAF', { ...support, isSupportManagement: false }),
    /Domain configuration/
  );
});

test('CaseData requires its catalog domain', () => {
  assert.doesNotThrow(() =>
    validateDragonDeployment('MEX', 'MEX', { ...support, isCaseData: true, isSupportManagement: false })
  );
  assert.throws(() => validateDragonDeployment('MEX', 'MEX', support), /Domain configuration/);
});
