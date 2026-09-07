import assert from 'node:assert/strict';

import { DRAGON_IDS, type DragonModule } from '@dragons/dragon-module';
import { kontaktSundsvallResolutionLabels } from '@supportmanagement/policy/resolution-label-presets';
import { defaultSupportErrandPolicy, getSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';
import { ongoingStatuses, Resolution, Status } from '@supportmanagement/services/support-errand-status';
import { test } from 'vitest';

import { buildSupportErrandPolicy, composeDragon } from './compose-dragon';
import { DRAGON_REGISTRY } from './dragon-registry.test-fixture';

test('an unknown identity throws and lists the valid ids', () => {
  assert.throws(() => composeDragon({ identity: 'NOPE', dragon: DRAGON_REGISTRY.KC }), {
    message: /Unknown dragon "NOPE".*KC, KA, MEX, PT, ROB, LOP, IK, MSVA, SE, BOU, LOK, IAF, VOF, AOT/,
  });
});

// An unset NEXT_PUBLIC_APPLICATION reads as '' and must fail the same way, not select a default.
test('an empty identity throws', () => {
  assert.throws(() => composeDragon({ identity: '', dragon: DRAGON_REGISTRY.KC }), {
    message: /Unknown dragon ""/,
  });
});

test('every registered id resolves to the module carrying that id', () => {
  for (const id of DRAGON_IDS) {
    assert.equal(composeDragon({ identity: id, dragon: DRAGON_REGISTRY[id] }).id, id);
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

test.each([
  [
    'KA',
    {
      SOLVED: 'Löst av Kontaktcenter',
      REGISTERED_EXTERNAL_SYSTEM: 'Vidarebefordrad (ärendet har överlämnats till annan funktion)',
    },
  ],
  ['BOU', { SOLVED: 'Löst', BACK_TO_CONTACT_SUNDSVALL: 'Åter till Kontakt Sundsvall' }],
  [
    'LOK',
    {
      SOLVED: 'Löst av VoF/IAF Lokalplanering',
      FORWARDED_TO_DRAKFASTIGHETER: 'Vidarebefordrat till Drakfastigheter',
      FORWARDED_TO_EXTERNAL_LANDLORD: 'Vidarebefordrat till extern hyresvärd',
      FORWARDED_TO_INTERNAL_CONTRACTOR: 'Vidarebefordrat till intern entreprenör',
      FORWARDED_TO_EXTERNAL_CONTRACTOR: 'Vidarebefordrat till extern entreprenör',
    },
  ],
  [
    'LOP',
    {
      CLOSED: 'Avslutat',
      BACK_TO_MANAGER: 'Åter till chef',
      BACK_TO_HR: 'Åter till HR',
      REGISTERED_EXTERNAL_SYSTEM: 'Registrerat i annat system',
    },
  ],
] as const)('%s exposes its own complete closing vocabulary', (id, labels) => {
  assert.deepEqual(buildSupportErrandPolicy(DRAGON_REGISTRY[id]).resolutions, labels);
});

test.each(['MSVA', 'AOT', 'IAF', 'VOF'] as const)('%s retains the shared closing behavior', (id) => {
  const policy = buildSupportErrandPolicy(DRAGON_REGISTRY[id]);
  assert.equal(policy.resolutions.SOLVED, 'Löst av Kontakt Sundsvall');
  assert.equal(policy.defaultResolution({ useClosedAsDefaultResolution: false }), Resolution.SOLVED);
  assert.equal(policy.defaultResolution({ useClosedAsDefaultResolution: true }), Resolution.CLOSED);
  assert.deepEqual(policy.ongoingStatuses, ongoingStatuses);
});

test('an override set to undefined is rejected instead of silently falling back', () => {
  const broken: DragonModule = { id: 'KC', supportErrandPolicy: { resolutions: undefined } };

  assert.throws(() => buildSupportErrandPolicy(broken), {
    message: /Dragon "KC" sets supportErrandPolicy.resolutions to undefined/,
  });
});

test('composeDragon hands the resolved dragon its policy', () => {
  const dragon = composeDragon({ identity: 'ROB', dragon: DRAGON_REGISTRY.ROB });

  assert.equal(dragon, DRAGON_REGISTRY.ROB);
  assert.equal(
    getSupportErrandPolicy().defaultResolution({ useClosedAsDefaultResolution: false }),
    Resolution.NEED_MET
  );
});

test('composition rejects another valid dragon even when it shares the same domain', () => {
  assert.throws(() => composeDragon({ identity: 'VOF', dragon: DRAGON_REGISTRY.IAF }), /cannot run/);
});
