import assert from 'node:assert/strict';

import { test } from 'vitest';

import { toStrongSupportErrandETag } from './support-errand-write-version';

test('creates canonical strong ETags from valid support errand versions', () => {
  assert.equal(toStrongSupportErrandETag(0), '"0"');
  assert.equal(toStrongSupportErrandETag(7), '"7"');
  assert.equal(toStrongSupportErrandETag(Number.MAX_SAFE_INTEGER), `"${Number.MAX_SAFE_INTEGER}"`);
});

test('rejects absent or non-canonical support errand versions before a write', () => {
  for (const version of [
    undefined,
    null,
    '',
    '7',
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ]) {
    assert.throws(() => toStrongSupportErrandETag(version), /valid support errand version/u);
  }
});
