import assert from 'node:assert/strict';

import { test } from 'vitest';

import type { InvestigationProfile } from './investigation-profile';
import { resolveInvestigationTabState } from './investigation-tab-state';

const document = (canRead: boolean) => ({
  key: 'utredning-enhetschef',
  schemaName: 'utredning-enhetschef',
  tabLabel: 'Utredning enhetschef',
  ownerLabel: 'Enhetschef',
  permissions: { canRead, canWrite: false },
});

const profile = (overrides: Partial<InvestigationProfile> = {}): InvestigationProfile =>
  ({
    application: 'IAF',
    state: 'active',
    documents: [document(true)],
    registration: { mode: 'enabled' },
    ...overrides,
  } as InvestigationProfile);

test('an unsettled profile shows the loading state', () => {
  assert.equal(resolveInvestigationTabState('idle', null, 0), 'loading');
  assert.equal(resolveInvestigationTabState('loading', null, 0), 'loading');
});

test('a failed profile load shows the error state', () => {
  assert.equal(resolveInvestigationTabState('error', null, 0), 'error');
});

// "disabled" means the profile was never requested, which is not a fault worth warning about.
test('a profile that was never requested reads as not configured', () => {
  assert.equal(resolveInvestigationTabState('disabled', null, 0), 'not-configured');
  assert.equal(resolveInvestigationTabState('ready', null, 0), 'not-configured');
});

test('an unavailable profile is distinct from an inactive one', () => {
  assert.equal(resolveInvestigationTabState('ready', profile({ state: 'unavailable' }), 1), 'unavailable');
  assert.equal(resolveInvestigationTabState('ready', profile({ state: 'inactive' }), 1), 'not-configured');
});

test('an active profile with no documents reads as not configured', () => {
  assert.equal(resolveInvestigationTabState('ready', profile({ documents: [] }), 0), 'not-configured');
});

test('documents the user cannot read are reported as missing access, not as missing configuration', () => {
  assert.equal(resolveInvestigationTabState('ready', profile({ documents: [document(false)] }), 0), 'no-access');
});

test('an active profile with a readable document is ready', () => {
  assert.equal(resolveInvestigationTabState('ready', profile(), 1), 'ready');
});
