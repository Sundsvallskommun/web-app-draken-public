import assert from 'node:assert/strict';

import { supportResolutionHistoryLabels } from '@supportmanagement/policy/support-resolution-history';
import { Resolution } from '@supportmanagement/services/support-errand-status';
import { parseDiff } from '@supportmanagement/services/support-revision-service';
import { test } from 'vitest';

import { buildSupportErrandPolicy } from './compose-dragon';
import { DRAGON_REGISTRY } from './dragon-registry.test-fixture';

for (const id of ['IK', 'SE'] as const) {
  test(`${id} history describes CLOSED even though it is absent from the current close-dialog choices`, () => {
    const policy = buildSupportErrandPolicy(DRAGON_REGISTRY[id]);
    const resolution = policy.defaultResolution({ useClosedAsDefaultResolution: true });
    const labels = { ...supportResolutionHistoryLabels, ...policy.resolutions };

    const result = parseDiff(
      { op: 'replace', path: '/resolution', fromValue: Resolution.SOLVED, value: resolution },
      labels,
      []
    );

    assert.equal(result.title, 'Lösning ändrades');
    assert.match(result.description, /Efter: Avslutat/);
    assert.match(result.description, /Före: Informerat \/ Intern Kundtjänst har löst ärendet/);
    assert.equal(policy.resolutions[Resolution.CLOSED], undefined);
  });
}

test('every persisted resolution remains readable without being a current dragon choice', () => {
  for (const resolution of [...Object.values(Resolution), 'REFERRED_TO_RETURN']) {
    const result = parseDiff(
      { op: 'add', path: '/resolution', fromValue: '', value: resolution },
      supportResolutionHistoryLabels,
      []
    );

    assert.ok(Object.hasOwn(supportResolutionHistoryLabels, resolution), `Missing historical label: ${resolution}`);
    assert.doesNotMatch(result.description, /undefined/);
    assert.ok(!result.description.includes(resolution));
  }
});

test('unknown historical codes preserve both previous and new values as text', () => {
  const result = parseDiff(
    { op: 'replace', path: '/resolution', fromValue: 'LEGACY_CLOSED', value: '<b>FUTURE & CODE</b>' },
    supportResolutionHistoryLabels,
    []
  );

  assert.match(result.description, /Före: LEGACY_CLOSED/);
  assert.match(result.description, /Efter: &lt;b&gt;FUTURE &amp; CODE&lt;\/b&gt;/);
  assert.doesNotMatch(result.description, /undefined|\(tomt\)|<b>/);
});

test('removed resolutions use their historical label and prototype names remain literal codes', () => {
  const removed = parseDiff(
    { op: 'remove', path: '/resolution', fromValue: '', value: Resolution.CLOSED },
    supportResolutionHistoryLabels,
    []
  );
  const unknown = parseDiff(
    { op: 'add', path: '/resolution', fromValue: '', value: 'constructor' },
    supportResolutionHistoryLabels,
    []
  );

  assert.equal(removed.title, 'Lösning togs bort');
  assert.match(removed.description, /Avslutat/);
  assert.equal(unknown.description, '<p><p>constructor</p></p>');
});

test('history still translates boolean metadata and preserves formatted free text', () => {
  const businessRelated = parseDiff(
    { op: 'replace', path: '/businessRelated', fromValue: '{"value":true}', value: 'false' },
    { true: 'Ja', false: 'Nej' },
    []
  );
  const description = parseDiff(
    { op: 'add', path: '/description', fromValue: '', value: '<p>En <strong>beskrivning</strong></p>' },
    {},
    []
  );

  assert.match(businessRelated.description, /Före: Ja/);
  assert.match(businessRelated.description, /Efter: Nej/);
  assert.match(description.description, /<strong>beskrivning<\/strong>/);
});
