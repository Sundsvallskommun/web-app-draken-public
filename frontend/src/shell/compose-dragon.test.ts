import assert from 'node:assert/strict';

import { DRAGON_IDS, getDragonDefinition } from '@dragons/dragon-module';
import { getSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';
import { test } from 'vitest';

import { buildSupportErrandPolicy, composeDragon, resolveDragonModule } from './compose-dragon';
import { DRAGON_REGISTRY } from './dragon-registry';
import previous from './fixtures/develop-support-policies.json';

// Captured from develop 3f04aaaed: labels, order and both runtime flag states must survive extraction.
for (const id of DRAGON_IDS) {
  test(`${id} preserves the existing application policy`, () => {
    const dragon = composeDragon({ identity: id, registry: DRAGON_REGISTRY });
    assert.equal(dragon.id, id);
    if (id === 'MEX' || id === 'PT') {
      assert.equal(getDragonDefinition(id).domain, 'casedata');
      assert.equal(dragon.supportErrandPolicy, null);
      assert.throws(() => getSupportErrandPolicy(), /not configured/);
      return;
    }
    const policy = getSupportErrandPolicy();
    const expected = previous[id];
    assert.deepEqual(Object.entries(policy.resolutions), Object.entries(expected.resolutions));
    assert.deepEqual(policy.ongoingStatuses, expected.ongoingStatuses);
    assert.equal(policy.defaultResolution({ useClosedAsDefaultResolution: false }), expected.defaultResolution);
    assert.equal(policy.defaultResolution({ useClosedAsDefaultResolution: true }), expected.closedDefaultResolution);
  });
}

test('unknown or mismatched identities fail before an application is selected', () => {
  for (const identity of ['', 'NOPE'])
    assert.throws(() => resolveDragonModule(identity, DRAGON_REGISTRY), /Unknown dragon/);
  assert.throws(() => resolveDragonModule('KC', { ...DRAGON_REGISTRY, KC: DRAGON_REGISTRY.ROB }), /does not match/);
});

test('an SM application must choose a policy and CaseData cannot inherit one', () => {
  assert.throws(() => buildSupportErrandPolicy({ id: 'KC', supportErrandPolicy: null }), /explicitly select/);
  assert.throws(
    () =>
      composeDragon({
        identity: 'PT',
        registry: { ...DRAGON_REGISTRY, PT: { id: 'PT', supportErrandPolicy: DRAGON_REGISTRY.KC.supportErrandPolicy } },
      }),
    /must not select/
  );
});
