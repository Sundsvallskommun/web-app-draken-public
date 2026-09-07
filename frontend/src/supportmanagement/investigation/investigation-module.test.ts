import { appConfig } from '@config/appconfig';
import { afterEach, expect, test } from 'vitest';

import { defaultBasicsPlacement } from './classification-placement';
import { configureInvestigation, getInvestigation } from './configured-investigation';
import { type InvestigationModule, isInvestigationTabVisible } from './investigation-module';

const original = appConfig.features.useInvestigation;
afterEach(() => {
  appConfig.features.useInvestigation = original;
  configureInvestigation(null);
});
const implementation: InvestigationModule = {
  id: 'fixed',
  label: 'Utredning',
  resolveClassificationPlacement: () => defaultBasicsPlacement,
  renderTab: () => null,
};

test('the master switch controls visibility without changing the application implementation', () => {
  configureInvestigation(implementation);
  for (const enabled of [false, true, false]) {
    appConfig.features.useInvestigation = enabled;
    expect(getInvestigation()).toBe(implementation);
    expect(isInvestigationTabVisible(appConfig.features, implementation)).toBe(enabled);
  }
});

test('an application without investigation can run with the flag off', () => {
  configureInvestigation(null);
  appConfig.features.useInvestigation = false;
  expect(getInvestigation()).toBeNull();
  expect(isInvestigationTabVisible(appConfig.features, null)).toBe(false);
});

test('enabling investigation without an implementation is an explicit configuration error', () => {
  configureInvestigation(null);
  appConfig.features.useInvestigation = true;
  expect(() => getInvestigation()).toThrow('no investigation implementation');
  expect(() => isInvestigationTabVisible(appConfig.features, null)).toThrow('no investigation implementation');
});
