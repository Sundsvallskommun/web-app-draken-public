import assert from 'node:assert/strict';

import { test } from 'vitest';

import type { InvestigationProfile } from '../investigation-profile';
import { resolveInvestigationTabState, visibleInvestigationDocuments } from './investigation-tab-state';

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

test('a profile whose documents are all hidden reads as no access, not as unconfigured', () => {
  const hiddenDocument = { ...document(), access: 'hidden' };

  assert.equal(
    resolveInvestigationTabState('ready', profile({ documents: [hiddenDocument] } as Partial<InvestigationProfile>)),
    'no-access'
  );
});

test('only the documents the user reaches are offered as tabs', () => {
  const documents = [
    { ...document(), key: 'utredning-enhetschef', access: 'edit' },
    { ...document(), key: 'utredning-hsl', access: 'hidden' },
  ];
  const activeProfile = profile({ documents } as Partial<InvestigationProfile>);

  assert.deepEqual(
    visibleInvestigationDocuments(activeProfile).map(({ key }) => key),
    ['utredning-enhetschef']
  );
  assert.equal(resolveInvestigationTabState('ready', activeProfile), 'ready');
});

test('a document without an access field stays visible', () => {
  assert.deepEqual(visibleInvestigationDocuments(profile()).length, 1);
  assert.deepEqual(visibleInvestigationDocuments(null).length, 0);
});
