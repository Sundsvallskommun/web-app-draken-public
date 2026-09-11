import assert from 'node:assert/strict';

import type { AppConfigFeatures } from '@config/appconfig';
import type { SupportPhaseContext } from '@supportmanagement/services/support-phase-service';
import { test } from 'vitest';

import { defaultBasicsPlacement } from './classification-placement';
import {
  type InvestigationCapability,
  type InvestigationVariantModule,
  isDecisionTabVisible,
  isInvestigationTabVisible,
  resolveInvestigationVariant,
} from './investigation-variant';

// Only the capability flags matter here; the rest of the feature block is irrelevant to selection.
const features = (enabled: Partial<Record<InvestigationCapability, boolean>>): AppConfigFeatures =>
  ({ useAvvikelseInvestigation: false, useAotInvestigation: false, ...enabled } as AppConfigFeatures);

const stub = (id: string, enabledBy: InvestigationCapability): InvestigationVariantModule => ({
  id,
  label: 'Utredning',
  enabledBy,
  resolveClassificationPlacement: () => defaultBasicsPlacement,
  renderTab: () => null,
});

/** A deployment running no workflow: the phase gate has nothing to compare and lets every tab past. */
const noPhases: SupportPhaseContext = { metadataPhases: undefined, errandPhases: undefined };

test('no enabled capability resolves to no variant', () => {
  assert.equal(resolveInvestigationVariant(features({}), [stub('avvikelse', 'useAvvikelseInvestigation')]), null);
});

test('the enabled capability selects its variant', () => {
  const avvikelse = stub('avvikelse', 'useAvvikelseInvestigation');
  const aot = stub('aot', 'useAotInvestigation');

  assert.equal(resolveInvestigationVariant(features({ useAvvikelseInvestigation: true }), [avvikelse]), avvikelse);
  assert.equal(resolveInvestigationVariant(features({ useAotInvestigation: true }), [aot]), aot);
});

// Implementations are mutually exclusive, so two enabled flags are a configuration error. Pinning
// first-wins keeps that error deterministic rather than dependent on registration order luck.
test('two enabled capabilities resolve to the first registered variant', () => {
  const first = stub('first', 'useAvvikelseInvestigation');
  const second = stub('second', 'useAotInvestigation');
  const bothEnabled = features({ useAvvikelseInvestigation: true, useAotInvestigation: true });

  assert.equal(resolveInvestigationVariant(bothEnabled, [first, second]), first);
  assert.equal(resolveInvestigationVariant(bothEnabled, [second, first]), second);
});

// Two flags deliberately: the capability picks the implementation, useInvestigation is the master
// switch that turns the tab off across every variant at once.
test('the tab needs both the master switch and a claiming variant', () => {
  const variant = stub('avvikelse', 'useAvvikelseInvestigation');
  const visible = (useInvestigation: boolean, resolved: InvestigationVariantModule | null) =>
    isInvestigationTabVisible({ ...features({}), useInvestigation } as AppConfigFeatures, resolved, noPhases);

  assert.equal(visible(true, variant), true);
  assert.equal(visible(false, variant), false);
  assert.equal(visible(true, null), false);
  assert.equal(visible(false, null), false);
});

// The decision tab is the variant's call per errand, behind the same master switch. A variant
// without the slot never gets the tab, whatever the errand looks like.
test('the decision tab needs the master switch, a slot, and the slot saying yes', () => {
  const withoutSlot = stub('plain', 'useAvvikelseInvestigation');
  const withSlot: InvestigationVariantModule = {
    ...withoutSlot,
    decisionTab: { label: 'Beslut', isVisible: (errand) => errand?.id === 'decided', render: () => null },
  };
  const decided = { id: 'decided' } as Parameters<typeof isDecisionTabVisible>[2];
  const other = { id: 'other' } as Parameters<typeof isDecisionTabVisible>[2];
  const on = { ...features({}), useInvestigation: true } as AppConfigFeatures;
  const off = { ...features({}), useInvestigation: false } as AppConfigFeatures;

  assert.equal(isDecisionTabVisible(on, withSlot, decided, null, noPhases), true);
  assert.equal(isDecisionTabVisible(on, withSlot, other, null, noPhases), false);
  assert.equal(isDecisionTabVisible(off, withSlot, decided, null, noPhases), false);
  assert.equal(isDecisionTabVisible(on, withoutSlot, decided, null, noPhases), false);
  assert.equal(isDecisionTabVisible(on, null, decided, null, noPhases), false);
});

// The phase a variant names is part of what makes a tab visible, so the two switches compose: the
// flags say the tab exists at all, the phase says the errand has got to the work it holds.
test('a tab waiting for a phase stays away until the errand reaches it', () => {
  const metadataPhases = [
    { id: 'received', name: 'Inkommet', phaseOrder: 1 },
    { id: 'investigation', name: 'Utredning', phaseOrder: 2 },
    { id: 'decision', name: 'Beslut', phaseOrder: 3 },
  ];
  const inPhase = (phaseId: string): SupportPhaseContext => ({
    metadataPhases,
    errandPhases: [{ phaseId }],
  });
  const variant: InvestigationVariantModule = {
    ...stub('avvikelse', 'useAvvikelseInvestigation'),
    requiredPhaseName: 'Utredning',
    decisionTab: { label: 'Beslut', requiredPhaseName: 'Beslut', isVisible: () => true, render: () => null },
  };
  const on = { ...features({}), useInvestigation: true } as AppConfigFeatures;
  const errand = { id: 'errand' } as Parameters<typeof isDecisionTabVisible>[2];

  assert.equal(isInvestigationTabVisible(on, variant, inPhase('received')), false);
  assert.equal(isInvestigationTabVisible(on, variant, inPhase('investigation')), true);
  assert.equal(isInvestigationTabVisible(on, variant, inPhase('decision')), true);

  assert.equal(isDecisionTabVisible(on, variant, errand, null, inPhase('investigation')), false);
  assert.equal(isDecisionTabVisible(on, variant, errand, null, inPhase('decision')), true);
});
