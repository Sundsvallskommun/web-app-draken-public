import assert from 'node:assert/strict';

import type { SupportErrandClassificationPlacement } from '@supportmanagement/investigation/iaf-vof-investigation-classification-policy';
import { IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY } from '@supportmanagement/investigation/iaf-vof-investigation-classification-policy';
import { test } from 'vitest';

import { resolveCategorizationControl, resolveCategorizationMode } from './categorization-control';

const defaultBasics: SupportErrandClassificationPlacement = { owner: 'basics', categorization: 'default' };

const iafVofPlacement = (owner: 'basics' | 'unavailable'): SupportErrandClassificationPlacement => ({
  owner,
  categorization: 'avvikelse',
  policy: IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY,
});

// Only the investigation-owned placement carries the resolved document keys; the type
// records that, so this variant cannot reuse the factory above.
const iafVofInvestigationPlacement: SupportErrandClassificationPlacement = {
  owner: 'investigation',
  categorization: 'avvikelse',
  policy: {
    ...IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY,
    defaultOwnerDocumentKey: 'manager-document',
    reportedMisconductOwnerDocumentKey: 'misconduct-document',
  },
};

test('resolves the categorization mode from the deployment flags', () => {
  assert.equal(
    resolveCategorizationMode({ useTwoLevelCategorization: true, useThreeLevelCategorization: false }),
    'two-level'
  );
  assert.equal(
    resolveCategorizationMode({ useTwoLevelCategorization: false, useThreeLevelCategorization: true }),
    'three-level'
  );
  assert.equal(
    resolveCategorizationMode({ useTwoLevelCategorization: false, useThreeLevelCategorization: false }),
    'none'
  );
});

test('prefers the label-backed mode when a deployment sets both flags', () => {
  // The flags encode one choice, so both-true is a misconfiguration. Picking the
  // label-backed mode keeps a single control rather than rendering two.
  assert.equal(
    resolveCategorizationMode({ useTwoLevelCategorization: true, useThreeLevelCategorization: true }),
    'three-level'
  );
});

test('renders the two-level control for a two-level deployment', () => {
  assert.deepEqual(resolveCategorizationControl('two-level', defaultBasics), { kind: 'two-level' });
});

test('renders the three-level control for a three-level deployment', () => {
  assert.deepEqual(resolveCategorizationControl('three-level', defaultBasics), { kind: 'three-level' });
});

test('renders nothing when no categorization is configured', () => {
  assert.deepEqual(resolveCategorizationControl('none', defaultBasics), { kind: 'none' });
});

test('renders the IAF/VOF control while Grundinformation owns classification', () => {
  assert.deepEqual(resolveCategorizationControl('three-level', iafVofPlacement('basics')), {
    kind: 'avvikelse',
    disabled: false,
    labelTree: IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.labelTree,
  });
});

test('renders the IAF/VOF control read-only when the capability is unavailable', () => {
  // Showing it disabled keeps a required field visible; hiding it would read as
  // "not required" while the errand still cannot be classified anywhere else.
  assert.deepEqual(resolveCategorizationControl('three-level', iafVofPlacement('unavailable')), {
    kind: 'avvikelse',
    disabled: true,
    labelTree: IAF_VOF_INVESTIGATION_CLASSIFICATION_POLICY.labelTree,
  });
});

test('renders nothing when the investigation document owns classification', () => {
  assert.deepEqual(resolveCategorizationControl('three-level', iafVofInvestigationPlacement), { kind: 'none' });
});

test('never renders a default-vocabulary control for an IAF/VOF placement', () => {
  // A two-level control would write the legacy category/type vocabulary onto an
  // errand whose labels use the IAF/VOF tree.
  assert.deepEqual(resolveCategorizationControl('two-level', iafVofPlacement('basics')), { kind: 'none' });
  assert.deepEqual(resolveCategorizationControl('none', iafVofPlacement('basics')), { kind: 'none' });
});

test('renders nothing when a default placement is not owned by Grundinformation', () => {
  // Unreachable today: every non-IAF/VOF application resolves to owner "basics".
  // The guard keeps a future placement change from double-rendering the control.
  assert.deepEqual(
    resolveCategorizationControl('three-level', {
      owner: 'investigation',
      categorization: 'default',
      // SupportErrandClassificationPlacement has no such member, so the cast is what
      // makes the case expressible at all. The guard defends against placements that
      // reach the control from untyped data, not against anything TypeScript allows.
    } as unknown as SupportErrandClassificationPlacement),
    { kind: 'none' }
  );
});
