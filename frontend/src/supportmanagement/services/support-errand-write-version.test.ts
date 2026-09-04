import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  isSupportErrandWriteConflict,
  SUPPORT_ERRAND_STATUS_AFTER_ASSIGNMENT_MESSAGE,
  SUPPORT_ERRAND_WRITE_CONFLICT_MESSAGE,
  SupportErrandStatusAfterAssignmentError,
  supportErrandWriteErrorMessage,
  toStrongSupportErrandETag,
} from './support-errand-write-version';

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

test('treats the conditional-write rejections as conflicts', () => {
  for (const status of [409, 412]) {
    assert.equal(isSupportErrandWriteConflict({ response: { status } }), true);
  }
});

test('leaves every other failure to its own message', () => {
  for (const error of [
    undefined,
    null,
    new Error('Support errand was updated, but note could not be saved'),
    { response: { status: 400 } },
    { response: { status: 428 } },
    { response: { status: 500 } },
    { response: {} },
    { response: { status: '412' } },
    { status: 412 },
  ]) {
    assert.equal(isSupportErrandWriteConflict(error), false);
  }
});

test('replaces the message only for conflicts', () => {
  assert.equal(
    supportErrandWriteErrorMessage({ response: { status: 412 } }, 'fallback'),
    SUPPORT_ERRAND_WRITE_CONFLICT_MESSAGE
  );
  assert.equal(
    supportErrandWriteErrorMessage({ response: { status: 409 } }, 'fallback'),
    SUPPORT_ERRAND_WRITE_CONFLICT_MESSAGE
  );
  assert.equal(supportErrandWriteErrorMessage(new Error('boom'), 'fallback'), 'fallback');
});

// The assignment landed, so "reload and redo the change" would be wrong advice however the status
// change failed - including when it failed with a conflict of its own.
test('says which half of taking an errand is missing', () => {
  for (const reason of [new Error('boom'), { response: { status: 409 } }, { response: { status: 400 } }]) {
    assert.equal(
      supportErrandWriteErrorMessage(new SupportErrandStatusAfterAssignmentError(reason), 'fallback'),
      SUPPORT_ERRAND_STATUS_AFTER_ASSIGNMENT_MESSAGE
    );
  }
});
