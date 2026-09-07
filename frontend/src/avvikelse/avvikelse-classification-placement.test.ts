import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  configureAvvikelseClassification,
  resolveAvvikelseClassificationPlacement,
} from './avvikelse-classification-placement';

test('the consuming dragon accepts its own profile and refuses the other Avvikelse deployment', () => {
  const profile = {
    application: 'IAF',
    state: 'active' as const,
    documents: [
      { key: 'manager', schemaName: 'utredning-enhetschef' },
      { key: 'social', schemaName: 'utredning-sol-lss' },
    ],
  };
  configureAvvikelseClassification('IAF');
  assert.equal(resolveAvvikelseClassificationPlacement(profile).owner, 'investigation');
  configureAvvikelseClassification('VOF');
  assert.equal(resolveAvvikelseClassificationPlacement(profile).owner, 'unavailable');
  assert.equal(resolveAvvikelseClassificationPlacement({ ...profile, application: 'VOF' }).owner, 'investigation');
});
