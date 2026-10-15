import assert from 'node:assert/strict';

import { test } from 'vitest';

import { isSupportErrandEmpty } from './support-errand-emptiness';

const classified = {
  id: 'errand-id',
  classification: { category: 'IT', type: 'SUPPORT' },
  category: 'IT',
  type: 'SUPPORT',
};
const unclassified = { id: 'errand-id', classification: { category: 'NONE', type: 'NONE' }, category: '', type: '' };

test('an errand without an id is empty whoever owns classification', () => {
  assert.equal(isSupportErrandEmpty(undefined, true), true);
  assert.equal(isSupportErrandEmpty(undefined, false), true);
  assert.equal(isSupportErrandEmpty({ ...classified, id: undefined }, false), true);
});

test('classification decides while Grundinformation accepts one', () => {
  assert.equal(isSupportErrandEmpty(unclassified, true), true);
  assert.equal(isSupportErrandEmpty({ id: 'errand-id' }, true), true);
  assert.equal(isSupportErrandEmpty(classified, true), false);
});

// Without this an avvikelse errand stays a draft forever: its classification is written by the
// investigation document, and while that capability is unavailable Grundinformation's control is
// read-only, so nothing on that screen can give the errand one.
test('an errand is not a draft for lacking a classification it cannot be given there', () => {
  assert.equal(isSupportErrandEmpty(unclassified, false), false);
  assert.equal(isSupportErrandEmpty({ id: 'errand-id' }, false), false);
  assert.equal(isSupportErrandEmpty(classified, false), false);
});
