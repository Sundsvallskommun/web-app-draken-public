import assert from 'node:assert/strict';

import type { AppConfigFeatures } from '@config/appconfig';
import { resolveCategorizationControl } from '@supportmanagement/components/support-errand-basics-form/categorization-control';
import { test } from 'vitest';

import { defaultBasicsPlacement, type SupportErrandClassificationPlacement } from './classification-placement';
import {
  type InvestigationCapability,
  type InvestigationVariantModule,
  isInvestigationTabVisible,
  resolveInvestigationVariant,
} from './investigation-variant';

/**
 * Stage 4: prove the seam holds for an implementation that is not avvikelse.
 *
 * `investigation-variant.test.ts` covers the selection rules. This file covers the *shape* of the
 * contract: that a second variant with different needs can be written against it without changing
 * it. The fixtures below are deliberately not avvikelse and never import it - if this file ever
 * needs something from `avvikelse/`, the contract has grown a coupling to one implementation.
 */

const OTHER = 'useOtherInvestigation' as InvestigationCapability;

// Spread rather than a literal: with one capability defined today, TypeScript narrows a second key
// to the same one and rejects it as a duplicate property.
const features = (enabled: Partial<Record<string, boolean>>): AppConfigFeatures =>
  ({ useInvestigation: false, useAvvikelseInvestigation: false, ...enabled } as AppConfigFeatures);

/**
 * The minimum a variant must supply. No notice, no categorization control, and a placement with no
 * label tree - an investigation that categorizes from the ordinary category-root tree like every
 * drake outside IAF/VOF. That this compiles is half the assertion.
 */
const minimalVariant: InvestigationVariantModule = {
  id: 'fixture-minimal',
  label: 'Utredning',
  enabledBy: OTHER,
  resolveClassificationPlacement: () => defaultBasicsPlacement,
  renderTab: () => null,
};

/** A variant that does bring its own vocabulary, without being avvikelse. */
const ownVocabularyPlacement: SupportErrandClassificationPlacement = {
  owner: 'basics',
  labelTree: { categoryClassification: 'FIXTURE_CATEGORY', typeClassification: 'FIXTURE_TYPE' },
};

const ownVocabularyVariant: InvestigationVariantModule = {
  id: 'fixture-own-vocabulary',
  label: 'Egen utredning',
  enabledBy: OTHER,
  resolveClassificationPlacement: () => ownVocabularyPlacement,
  renderTab: () => null,
  renderNotice: () => null,
  renderCategorizationControl: () => null,
};

test('a variant needs only the required slots', () => {
  // The optional slots stay optional: a variant that has nothing to say above the tab strip and no
  // categorization control of its own does not have to supply stubs for them.
  assert.equal(minimalVariant.renderNotice, undefined);
  assert.equal(minimalVariant.renderCategorizationControl, undefined);
});

test('a second capability selects its own variant and leaves avvikelse unselected', () => {
  const both = [minimalVariant];

  assert.equal(resolveInvestigationVariant(features({ [OTHER]: true }), both), minimalVariant);
  assert.equal(resolveInvestigationVariant(features({ useAvvikelseInvestigation: true }), both), null);
});

test('the master switch gates a non-avvikelse variant the same way', () => {
  const enabled = features({ [OTHER]: true, useInvestigation: true });
  const masterOff = features({ [OTHER]: true });

  assert.equal(isInvestigationTabVisible(enabled, minimalVariant), true);
  assert.equal(isInvestigationTabVisible(masterOff, minimalVariant), false);
});

/**
 * The load-bearing one. A variant that does not bring its own label tree must leave Grundinformation
 * exactly as it is for every other drake - the ordinary two-/three-level control, chosen by the
 * deployment flags alone. If avvikelse's vocabulary had leaked into the seam, this would come back
 * as 'variant' or 'none'.
 */
test('a variant without its own label tree leaves the ordinary categorization control in place', () => {
  const placement = minimalVariant.resolveClassificationPlacement(null);

  assert.deepEqual(resolveCategorizationControl('three-level', placement), { kind: 'three-level' });
  assert.deepEqual(resolveCategorizationControl('two-level', placement), { kind: 'two-level' });
});

test('a variant with its own label tree takes over the categorization control', () => {
  const placement = ownVocabularyVariant.resolveClassificationPlacement(null);

  assert.deepEqual(resolveCategorizationControl('three-level', placement), { kind: 'variant', disabled: false });
});

/**
 * Ownership is the variant's decision, not the seam's: the same contract expresses "Grundinformation
 * keeps classification" and "the investigation owns it", and shared code reads only `owner`.
 */
test('a variant decides where classification is persisted', () => {
  const investigationOwned: InvestigationVariantModule = {
    ...minimalVariant,
    resolveClassificationPlacement: () => ({ owner: 'investigation' }),
  };

  assert.equal(minimalVariant.resolveClassificationPlacement(null).owner, 'basics');
  assert.equal(investigationOwned.resolveClassificationPlacement(null).owner, 'investigation');
  assert.deepEqual(
    resolveCategorizationControl('three-level', investigationOwned.resolveClassificationPlacement(null)),
    {
      kind: 'none',
    }
  );
});
