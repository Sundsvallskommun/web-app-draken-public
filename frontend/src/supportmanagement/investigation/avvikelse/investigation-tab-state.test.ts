import assert from 'node:assert/strict';

import { test } from 'vitest';

import type { InvestigationProfile } from '../investigation-profile';
import { resolveInvestigationTabState } from './investigation-tab-state';

const document = () => ({
  key: 'utredning-enhetschef',
  schemaName: 'utredning-enhetschef',
  tabLabel: 'Utredning enhetschef',
  ownerLabel: 'Enhetschef',
});

const profile = (overrides: Partial<InvestigationProfile> = {}): InvestigationProfile =>
  ({
    application: 'IAF',
    state: 'active',
    documents: [document()],
    registration: { mode: 'enabled' },
    ...overrides,
  } as InvestigationProfile);

test('an unsettled profile shows the loading state', () => {
  assert.equal(resolveInvestigationTabState('idle', null), 'loading');
  assert.equal(resolveInvestigationTabState('loading', null), 'loading');
});

test('a failed profile load shows the error state', () => {
  assert.equal(resolveInvestigationTabState('error', null), 'error');
});

// "disabled" means the profile was never requested, which is not a fault worth warning about.
test('a profile that was never requested reads as not configured', () => {
  assert.equal(resolveInvestigationTabState('disabled', null), 'not-configured');
  assert.equal(resolveInvestigationTabState('ready', null), 'not-configured');
});

test('an unavailable profile is distinct from an inactive one', () => {
  assert.equal(resolveInvestigationTabState('ready', profile({ state: 'unavailable' })), 'unavailable');
  assert.equal(resolveInvestigationTabState('ready', profile({ state: 'inactive' })), 'not-configured');
});

test('an active profile with no documents reads as not configured', () => {
  assert.equal(resolveInvestigationTabState('ready', profile({ documents: [] })), 'not-configured');
});

test('an active profile with a configured document is ready', () => {
  assert.equal(resolveInvestigationTabState('ready', profile()), 'ready');
});
