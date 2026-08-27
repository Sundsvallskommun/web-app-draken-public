import assert from 'node:assert/strict';

import type { SupportErrandClassificationPlacement } from '@supportmanagement/investigation/classification-placement';
import { test } from 'vitest';

import { resolveCategorizationControl, resolveCategorizationMode } from './categorization-control';

const defaultBasics: SupportErrandClassificationPlacement = { owner: 'basics' };

// Deliberately not a real variant's vocabulary. Grundinformation only needs to know that *a* label
// tree came with the placement, so a fixture no variant would ever produce is the honest input:
// if this suite ever needs a concrete variant's tree, the shared control has grown a coupling.
const variantPlacement = (owner: 'basics' | 'unavailable' | 'investigation'): SupportErrandClassificationPlacement => ({
  owner,
  labelTree: { categoryClassification: 'FIXTURE_CATEGORY', typeClassification: 'FIXTURE_TYPE' },
});

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

test('defers to the variant while Grundinformation owns classification', () => {
  assert.deepEqual(resolveCategorizationControl('three-level', variantPlacement('basics')), {
    kind: 'variant',
    disabled: false,
  });
});

test('defers to the variant read-only when the capability is unavailable', () => {
  // Showing it disabled keeps a required field visible; hiding it would read as
  // "not required" while the errand still cannot be classified anywhere else.
  assert.deepEqual(resolveCategorizationControl('three-level', variantPlacement('unavailable')), {
    kind: 'variant',
    disabled: true,
  });
});

test('renders nothing when the investigation document owns classification', () => {
  assert.deepEqual(resolveCategorizationControl('three-level', variantPlacement('investigation')), { kind: 'none' });
});

test('never renders a default-vocabulary control for a placement with its own label tree', () => {
  // A two-level control would write the legacy category/type vocabulary onto an
  // errand whose labels use the variant's tree.
  assert.deepEqual(resolveCategorizationControl('two-level', variantPlacement('basics')), { kind: 'none' });
  assert.deepEqual(resolveCategorizationControl('none', variantPlacement('basics')), { kind: 'none' });
});

test('renders nothing when a default placement is not owned by Grundinformation', () => {
  // Unreachable today: an application with no investigation variant resolves to owner "basics".
  // The guard keeps a future placement change from double-rendering the control.
  assert.deepEqual(resolveCategorizationControl('three-level', { owner: 'investigation' }), { kind: 'none' });
});
