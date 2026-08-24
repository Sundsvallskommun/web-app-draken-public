import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  isIafVofReportedMisconductErrand,
  resolveIafVofInvestigationClassificationOwnerDocumentKey,
  resolveSupportErrandClassificationPlacement,
} from './iaf-vof-investigation-classification-policy';

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

test('moves IAF and VOF classification only for an active profile with both fixed schema roles', () => {
  for (const application of ['IAF', 'VOF']) {
    const placement = resolveSupportErrandClassificationPlacement({ application, profile: profile({ application }) });
    assert.equal(placement.owner, 'investigation');
    assert.equal(placement.categorization, 'iaf-vof');
    assert.equal(placement.policy.defaultOwnerDocumentKey, 'manager-document');
    assert.equal(placement.policy.reportedMisconductOwnerDocumentKey, 'misconduct-document');
  }
});

test('keeps other applications on the ordinary basics categorization', () => {
  assert.deepEqual(resolveSupportErrandClassificationPlacement({ application: 'KC', profile: undefined }), {
    owner: 'basics',
    categorization: 'default',
  });
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
    resolveIafVofInvestigationClassificationOwnerDocumentKey(placement, {
      parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }],
    }),
    'manager-document'
  );
  assert.equal(
    resolveIafVofInvestigationClassificationOwnerDocumentKey(placement, {
      parameters: [{ key: 'eventType', values: [' missforhallande '] }],
    }),
    'misconduct-document'
  );
});

test('treats resourcePath as authoritative and resourceName only as a pathless fallback', () => {
  assert.equal(
    isIafVofReportedMisconductErrand({ labels: [{ resourcePath: 'OTHER/ABUSE', resourceName: 'ABUSE' }] }),
    false
  );
  assert.equal(isIafVofReportedMisconductErrand({ labels: [{ resourceName: ' abuse ' }] }), true);
  assert.equal(isIafVofReportedMisconductErrand({ labels: [{ resourcePath: '/report_type/abuse/' }] }), true);
});

test('does not accept selector suffixes or another label path', () => {
  for (const errand of [
    { parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE_SUFFIX'] }] },
    { labels: [{ resourcePath: 'OTHER/REPORT_TYPE/ABUSE', resourceName: 'ABUSE' }] },
    { labels: [{ resourceName: 'OTHER_ABUSE' }] },
  ]) {
    assert.equal(isIafVofReportedMisconductErrand(errand), false);
  }
});
