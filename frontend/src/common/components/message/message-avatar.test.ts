import assert from 'node:assert/strict';

import { test } from 'vitest';

import { getSenderInitials } from './message-avatar.component';

test('message avatars display sender initials for named contacts and support senders', () => {
  assert.equal(getSenderInitials({ firstName: 'Anna', lastName: 'Andersson' }), 'AA');
  assert.equal(getSenderInitials({ sender: 'Anna Andersson' }), 'AA');
  assert.equal(getSenderInitials({ sender: ' Anna   Andersson ' }), 'AA');
});

test('missing contact names never appear as undefined in an avatar', () => {
  assert.equal(getSenderInitials({ firstName: undefined, lastName: undefined }), '@');
  assert.equal(getSenderInitials({ firstName: 'Anna', lastName: '' }), 'A');
  assert.equal(getSenderInitials({ sender: 'service@example.test' }), '@');
  assert.equal(getSenderInitials({}), '@');
});
