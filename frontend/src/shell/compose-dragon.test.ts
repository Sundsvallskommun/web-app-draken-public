import assert from 'node:assert/strict';

import type { AppConfigFeatures } from '@config/appconfig';
import { DRAGON_IDS, type DragonModule } from '@dragons/dragon-module';
import { kontaktSundsvallResolutionLabels } from '@supportmanagement/policy/resolution-label-presets';
import { defaultSupportErrandPolicy, getSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';
import { ongoingStatuses, Resolution, Status } from '@supportmanagement/services/support-errand-status';
import { test } from 'vitest';

import {
  buildSupportErrandPolicy,
  composeDragon,
  resolveDragonModule,
  validateDragonConfiguration,
} from './compose-dragon';
import { DRAGON_REGISTRY } from './dragon-registry';

// Only the variant flags matter to validation; the rest of the feature block is irrelevant here.
const features = (enabled: Partial<AppConfigFeatures> = {}): AppConfigFeatures =>
  ({ useAvvikelseInvestigation: false, useAotInvestigation: false, ...enabled } as AppConfigFeatures);

test('an unknown identity throws and lists the valid ids', () => {
  assert.throws(() => resolveDragonModule('NOPE', DRAGON_REGISTRY), {
    message: /Unknown dragon "NOPE".*KC, KA, MEX, PT, ROB, LOP, IK, MSVA, SE, BOU, LOK, IAF, VOF, AOT/,
  });
});

// An unset NEXT_PUBLIC_APPLICATION reads as '' and must fail the same way, not select a default.
test('an empty identity throws', () => {
  assert.throws(() => resolveDragonModule('', DRAGON_REGISTRY), { message: /Unknown dragon ""/ });
});

test('every registered id resolves to the module carrying that id', () => {
  for (const id of DRAGON_IDS) {
    assert.equal(resolveDragonModule(id, DRAGON_REGISTRY).id, id);
  }
});

test('ROB gets its own ongoing statuses, resolution labels and default resolution', () => {
  const policy = buildSupportErrandPolicy(DRAGON_REGISTRY.ROB);

  assert.deepEqual(policy.ongoingStatuses, [
    ...ongoingStatuses,
    Status.UPSTART,
    Status.PUBLISH_SELECTION,
    Status.INTERNAL_CONTROL_AND_INTERVIEWS,
    Status.REFERENCE_CHECK,
    Status.REVIEW,
    Status.SECURITY_CLEARENCE,
    Status.FEEDBACK_CLOSURE,
    Status.SUBPACKAGE_HANDLED,
  ]);
  assert.deepEqual(policy.resolutions, {
    NEED_MET: 'Behov uppfyllt',
    RECRUITED_FEWER: 'Rekryterat färre',
    RECRUITED_MORE: 'Rekryterat fler',
    CANCELLED: 'Avbruten',
  });
  // ROB's default does not depend on useClosedAsDefaultResolution.
  assert.equal(policy.defaultResolution({ useClosedAsDefaultResolution: false }), Resolution.NEED_MET);
  assert.equal(policy.defaultResolution({ useClosedAsDefaultResolution: true }), Resolution.NEED_MET);
  assert.equal(policy.solvedStatusLabel(Resolution.RECRUITED_MORE), 'Rekryterat fler');
  assert.equal(policy.solvedStatusLabel('SOMETHING_ELSE'), 'Löst');
});

test('KC gets the default policy', () => {
  const policy = buildSupportErrandPolicy(DRAGON_REGISTRY.KC);

  assert.deepEqual(policy.ongoingStatuses, ongoingStatuses);
  assert.equal(policy.resolutions, kontaktSundsvallResolutionLabels);
  assert.equal(policy.defaultResolution({ useClosedAsDefaultResolution: false }), Resolution.SOLVED);
  assert.equal(policy.defaultResolution({ useClosedAsDefaultResolution: true }), Resolution.CLOSED);
  assert.equal(policy.solvedStatusLabel, defaultSupportErrandPolicy.solvedStatusLabel);
});

test('IK and SE share the internal customer service resolution labels', () => {
  const ik = buildSupportErrandPolicy(DRAGON_REGISTRY.IK);
  const se = buildSupportErrandPolicy(DRAGON_REGISTRY.SE);

  assert.equal(ik.resolutions, se.resolutions);
  assert.equal(ik.resolutions[Resolution.SOLVED], 'Informerat / Intern Kundtjänst har löst ärendet');
});

test('an override set to undefined is rejected instead of silently falling back', () => {
  const broken: DragonModule = { id: 'KC', supportErrandPolicy: { resolutions: undefined } };

  assert.throws(() => buildSupportErrandPolicy(broken), {
    message: /Dragon "KC" sets supportErrandPolicy.resolutions to undefined/,
  });
});

test('enabling both investigation variants is a startup error', () => {
  assert.throws(
    () => validateDragonConfiguration(features({ useAvvikelseInvestigation: true, useAotInvestigation: true })),
    { message: /mutually exclusive/ }
  );
});

test('a single investigation variant, or none, passes validation', () => {
  assert.doesNotThrow(() => validateDragonConfiguration(features({ useAvvikelseInvestigation: true })));
  assert.doesNotThrow(() => validateDragonConfiguration(features({ useAotInvestigation: true })));
  assert.doesNotThrow(() => validateDragonConfiguration(features()));
});

test('composeDragon hands the resolved dragon its policy', () => {
  const dragon = composeDragon({ identity: 'ROB', registry: DRAGON_REGISTRY, features: features() });

  assert.equal(dragon, DRAGON_REGISTRY.ROB);
  assert.equal(
    getSupportErrandPolicy().defaultResolution({ useClosedAsDefaultResolution: false }),
    Resolution.NEED_MET
  );
});

test('composeDragon validates before it resolves, so a conflict is reported even for a valid dragon', () => {
  assert.throws(
    () =>
      composeDragon({
        identity: 'IAF',
        registry: DRAGON_REGISTRY,
        features: features({ useAvvikelseInvestigation: true, useAotInvestigation: true }),
      }),
    { message: /mutually exclusive/ }
  );
});
