import assert from 'node:assert/strict';

import type { AppConfigFeatures } from '@config/appconfig';
import { test } from 'vitest';

import { defaultBasicsPlacement } from './classification-placement';
import {
  type InvestigationCapability,
  type InvestigationVariantModule,
  isInvestigationTabVisible,
  resolveInvestigationVariant,
} from './investigation-variant';

// Only the capability flags matter here; the rest of the feature block is irrelevant to selection.
const features = (enabled: Partial<Record<InvestigationCapability, boolean>>): AppConfigFeatures =>
  ({ useAvvikelseInvestigation: false, ...enabled } as AppConfigFeatures);

const stub = (id: string, enabledBy: InvestigationCapability): InvestigationVariantModule => ({
  id,
  label: 'Utredning',
  enabledBy,
  resolveClassificationPlacement: () => defaultBasicsPlacement,
  renderTab: () => null,
});

test('no enabled capability resolves to no variant', () => {
  assert.equal(resolveInvestigationVariant(features({}), [stub('avvikelse', 'useAvvikelseInvestigation')]), null);
});

test('the enabled capability selects its variant', () => {
  const avvikelse = stub('avvikelse', 'useAvvikelseInvestigation');

  assert.equal(resolveInvestigationVariant(features({ useAvvikelseInvestigation: true }), [avvikelse]), avvikelse);
});

// Implementations are mutually exclusive, so two enabled flags are a configuration error. Pinning
// first-wins keeps that error deterministic rather than dependent on registration order luck.
test('two enabled capabilities resolve to the first registered variant', () => {
  const other = 'useOtherInvestigation' as InvestigationCapability;
  const first = stub('first', 'useAvvikelseInvestigation');
  const second = stub('second', other);
  // Spread rather than a literal: with one capability defined today, TypeScript narrows `other` to
  // the same key and rejects it as a duplicate property.
  const bothEnabled = { ...features({ useAvvikelseInvestigation: true }), [other]: true } as AppConfigFeatures;

  assert.equal(resolveInvestigationVariant(bothEnabled, [first, second]), first);
  assert.equal(resolveInvestigationVariant(bothEnabled, [second, first]), second);
});

// Two flags deliberately: the capability picks the implementation, useInvestigation is the master
// switch that turns the tab off across every variant at once.
test('the tab needs both the master switch and a claiming variant', () => {
  const variant = stub('avvikelse', 'useAvvikelseInvestigation');
  const visible = (useInvestigation: boolean, resolved: InvestigationVariantModule | null) =>
    isInvestigationTabVisible({ ...features({}), useInvestigation } as AppConfigFeatures, resolved);

  assert.equal(visible(true, variant), true);
  assert.equal(visible(false, variant), false);
  assert.equal(visible(true, null), false);
  assert.equal(visible(false, null), false);
});
