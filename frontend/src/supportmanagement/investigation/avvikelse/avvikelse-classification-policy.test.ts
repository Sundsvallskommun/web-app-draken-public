import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  AVVIKELSE_CLASSIFICATION_POLICY,
  isAvvikelseReportedMisconductErrand,
  resolveAvvikelseClassificationOwnerDocumentKey,
  resolveSupportErrandClassificationPlacement,
} from './avvikelse-classification-policy';

const documents = () => [
  { key: 'manager-document', schemaName: 'utredning-enhetschef' },
  { key: 'misconduct-document', schemaName: 'utredning-sol-lss' },
];

const profile = (overrides = {}) => ({
  application: 'IAF',
  state: 'active' as const,
  documents: documents(),
  ...overrides,
});

// IAF and VOF are the applications that enable this policy today. The resolver treats them as
// ordinary input, not as a condition - see the test below.
test('moves classification to the investigation document for an active profile with both schema roles', () => {
  for (const application of ['IAF', 'VOF']) {
    const placement = resolveSupportErrandClassificationPlacement({ application, profile: profile({ application }) });
    assert.equal(placement.owner, 'investigation');
    assert.equal(placement.labelTree, AVVIKELSE_CLASSIFICATION_POLICY.labelTree);
    assert.equal(placement.policy.defaultOwnerDocumentKey, 'manager-document');
    assert.equal(placement.policy.reportedMisconductOwnerDocumentKey, 'misconduct-document');
  }
});

// Which applications get this policy is decided by the capability flag, not here - see
// investigation-variant.test.ts. The resolver runs only once that flag has selected it, so it no
// longer inspects the application name to decide whether it applies.
test('does not gate on the application name', () => {
  const placement = resolveSupportErrandClassificationPlacement({
    application: 'ANY-APPLICATION',
    profile: profile({ application: 'ANY-APPLICATION' }),
  });

  assert.equal(placement.owner, 'investigation');
  assert.equal(placement.labelTree, AVVIKELSE_CLASSIFICATION_POLICY.labelTree);
});

test('uses profile state as the classification ownership authority for IAF/VOF', () => {
  assert.equal(
    resolveSupportErrandClassificationPlacement({ application: 'IAF', profile: undefined }).owner,
    'unavailable'
  );
  assert.equal(
    resolveSupportErrandClassificationPlacement({ application: 'IAF', profile: profile({ state: 'unavailable' }) })
      .owner,
    'unavailable'
  );
  assert.equal(
    resolveSupportErrandClassificationPlacement({ application: 'IAF', profile: profile({ state: 'inactive' }) }).owner,
    'basics'
  );
  assert.equal(
    resolveSupportErrandClassificationPlacement({ application: 'IAF', profile: profile({ application: 'VOF' }) }).owner,
    'unavailable'
  );
});

test('falls back to IAF/VOF basics when either fixed owner schema is missing or ambiguous', () => {
  const missing = profile({ documents: documents().slice(0, 1) });
  const ambiguous = profile({
    documents: [...documents(), { key: 'manager-copy', schemaName: 'utredning-enhetschef' }],
  });
  assert.equal(resolveSupportErrandClassificationPlacement({ application: 'IAF', profile: missing }).owner, 'basics');
  assert.equal(resolveSupportErrandClassificationPlacement({ application: 'IAF', profile: ambiguous }).owner, 'basics');
});

test('selects the configured profile keys for ordinary deviations and reported misconduct', () => {
  const placement = resolveSupportErrandClassificationPlacement({ application: 'IAF', profile: profile() });
  assert.equal(placement.owner, 'investigation');
  if (placement.owner !== 'investigation') throw new Error('Expected investigation placement');

  assert.equal(
    resolveAvvikelseClassificationOwnerDocumentKey(placement, {
      parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }],
    }),
    'manager-document'
  );
  assert.equal(
    resolveAvvikelseClassificationOwnerDocumentKey(placement, {
      parameters: [{ key: 'eventType', values: [' missforhallande '] }],
    }),
    'misconduct-document'
  );
});

test('treats resourcePath as authoritative and resourceName only as a pathless fallback', () => {
  assert.equal(
    isAvvikelseReportedMisconductErrand({ labels: [{ resourcePath: 'OTHER/ABUSE', resourceName: 'ABUSE' }] }),
    false
  );
  assert.equal(isAvvikelseReportedMisconductErrand({ labels: [{ resourceName: ' abuse ' }] }), true);
  assert.equal(isAvvikelseReportedMisconductErrand({ labels: [{ resourcePath: '/report_type/abuse/' }] }), true);
});

test('does not accept selector suffixes or another label path', () => {
  for (const errand of [
    { parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE_SUFFIX'] }] },
    { labels: [{ resourcePath: 'OTHER/REPORT_TYPE/ABUSE', resourceName: 'ABUSE' }] },
    { labels: [{ resourceName: 'OTHER_ABUSE' }] },
  ]) {
    assert.equal(isAvvikelseReportedMisconductErrand(errand), false);
  }
});
