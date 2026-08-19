import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isReportedMisconductErrandForPolicy,
  resolveSupportErrandClassificationPlacement,
  resolveSupportInvestigationClassificationOwnerDocumentKey,
} from './investigation-classification-policy.ts';

const policy = (overrides = {}) => ({
  strategy: 'reported-misconduct',
  defaultOwnerDocumentKey: 'default-investigation',
  reportedMisconductOwnerDocumentKey: 'regulatory-investigation',
  reportedMisconductSelector: {
    parameter: { key: 'reportKind', values: ['REGULATORY'] },
    labels: { resourcePaths: ['REPORT_KIND/REGULATORY'], resourceNames: ['REGULATORY'] },
  },
  labelTree: {
    root: { resource: 'CATEGORY', classification: 'CATEGORY_ROOT' },
    ownerClassification: 'PROVISION_CATEGORY',
    categoryClassification: 'CATEGORY',
    typeClassification: 'TYPE',
  },
  forcedLegalBases: ['ACT-B'],
  legalBasesPointer: '/assessment/applicableActs',
  legalBaseRules: [
    { legalBase: 'ACT-A', allowedClassificationCategories: ['CATEGORY/ACT_A'] },
    { legalBase: 'ACT-B', allowedClassificationCategories: ['CATEGORY/ACT_B'] },
  ],
  ...overrides,
});

const profile = (overrides = {}) => ({
  state: 'active',
  classificationPolicy: policy(),
  ...overrides,
});

test('resolves placement only from canonical profile state and policy', () => {
  assert.deepEqual(resolveSupportErrandClassificationPlacement(profile()), {
    owner: 'investigation',
    categorization: 'reported-misconduct',
    policy: policy(),
  });
  assert.deepEqual(resolveSupportErrandClassificationPlacement(profile({ state: 'inactive' })), {
    owner: 'basics',
    categorization: 'reported-misconduct',
    policy: policy(),
  });
  assert.deepEqual(resolveSupportErrandClassificationPlacement(profile({ state: 'unavailable' })), {
    owner: 'unavailable',
    categorization: 'reported-misconduct',
    policy: policy(),
  });
});

test('keeps legacy classification in basics when the profile has no policy', () => {
  assert.deepEqual(resolveSupportErrandClassificationPlacement(undefined), {
    owner: 'basics',
    categorization: 'default',
  });
  assert.deepEqual(resolveSupportErrandClassificationPlacement(profile({ classificationPolicy: undefined })), {
    owner: 'basics',
    categorization: 'default',
  });
});

test('uses configured selectors and returns configured document keys verbatim', () => {
  assert.equal(
    resolveSupportInvestigationClassificationOwnerDocumentKey(policy(), {
      parameters: [{ key: 'reportKind', values: [' regulatory '] }],
    }),
    'regulatory-investigation'
  );
  assert.equal(
    resolveSupportInvestigationClassificationOwnerDocumentKey(policy(), {
      parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE'] }],
    }),
    'default-investigation'
  );
});

test('treats resourcePath as authoritative and resourceName only as a pathless fallback', () => {
  assert.equal(
    isReportedMisconductErrandForPolicy(policy(), {
      labels: [{ resourcePath: 'OTHER/REGULATORY', resourceName: 'REGULATORY' }],
    }),
    false
  );
  assert.equal(isReportedMisconductErrandForPolicy(policy(), { labels: [{ resourceName: ' regulatory ' }] }), true);
  assert.equal(
    isReportedMisconductErrandForPolicy(policy(), { labels: [{ resourcePath: '/report_kind/regulatory/' }] }),
    true
  );
});

test('does not accept parameter or label suffixes', () => {
  for (const errand of [
    { parameters: [{ key: 'reportKind', values: ['REGULATORY_SUFFIX'] }] },
    { labels: [{ resourcePath: 'OTHER/REPORT_KIND/REGULATORY', resourceName: 'REGULATORY' }] },
    { labels: [{ resourceName: 'OTHER_REGULATORY' }] },
  ]) {
    assert.equal(resolveSupportInvestigationClassificationOwnerDocumentKey(policy(), errand), 'default-investigation');
  }
});
