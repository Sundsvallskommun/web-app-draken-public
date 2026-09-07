import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { migrateInvestigationFlags } from './migrate-investigation-flags.mjs';

const row = (name, enabled, extra = {}) => ({ application: 'IAF', namespace: 'iaf', name, enabled, ...extra });
const fixture = (changes = {}) => ({ version: 1, application: 'IAF', namespace: 'iaf', implementation: 'avvikelse', environment: {}, flags: [], ...changes });

for (const implementation of ['avvikelse', 'aot']) {
  const legacy = implementation === 'avvikelse' ? 'useAvvikelseInvestigation' : 'useAotInvestigation';
  const envLegacy = implementation === 'avvikelse' ? 'NEXT_PUBLIC_USE_AVVIKELSE_INVESTIGATION' : 'NEXT_PUBLIC_USE_AOT_INVESTIGATION';
  for (const master of [true, false, undefined]) for (const variant of [true, false, undefined]) {
    test(`${implementation}: preserves effective master=${master}, variant=${variant}, including absent flags`, () => {
      const flags = [row('useDetailsTab', true)];
      if (master !== undefined) flags.push(row('useInvestigation', master, { id: 7 }));
      if (variant !== undefined) flags.push(row(legacy, variant));
      const environment = {};
      if (master !== undefined) environment.NEXT_PUBLIC_USE_INVESTIGATION = String(master);
      if (variant !== undefined) environment[envLegacy] = String(variant);
      const input = fixture({ implementation, flags, environment });
      const copy = structuredClone(input);
      const result = migrateInvestigationFlags(input);
      const expected = master === true && variant === true;
      assert.equal(result.effectiveInvestigationEnabled, expected);
      assert.equal(result.flags.find(flag => flag.name === 'useInvestigation').enabled, expected);
      assert.equal(result.flags.some(flag => flag.name === legacy), false);
      assert.deepEqual(result.environment, { NEXT_PUBLIC_USE_INVESTIGATION: String(expected) });
      assert.deepEqual(migrateInvestigationFlags(result), result);
      assert.deepEqual(input, copy);
      const environmentOnly = migrateInvestigationFlags({ ...input, flags: [] });
      assert.equal(environmentOnly.effectiveInvestigationEnabled, expected);
      assert.deepEqual(environmentOnly.flags, []);
    });
  }
}

test('migration preserves metadata, unrelated flags and other application/namespace rows', () => {
  const master = row('useInvestigation', true, { id: 1, description: 'Existing description' });
  const unrelated = [row('useDetailsTab', true), row('useAvvikelseInvestigation', true, { application: 'VOF' }), row('useAotInvestigation', true, { namespace: 'other' })];
  const result = migrateInvestigationFlags(fixture({ flags: [master, row('useAvvikelseInvestigation', true), ...unrelated] }));
  assert.deepEqual(result.flags, [master, ...unrelated]);
});

test('an application without an implementation cannot be activated by old flags', () => {
  const result = migrateInvestigationFlags(fixture({ implementation: 'none', flags: [row('useInvestigation', true), row('useAvvikelseInvestigation', true)] }));
  assert.equal(result.effectiveInvestigationEnabled, false);
});

test('migrating the supplied Adminpanel list changes only the two retired investigation rows', () => {
  const { flags } = JSON.parse(readFileSync(new URL('../frontend/src/config/adminpanel-flags.test-fixture.json', import.meta.url), 'utf8'));
  const before = structuredClone(flags);
  let migratedFlags = flags;
  for (const application of ['IAF', 'VOF']) {
    const namespace = `HEALTHCAREDEVIATION${application}`;
    const result = migrateInvestigationFlags({
      version: 1, application, namespace, implementation: 'avvikelse',
      // Fixture values exercise the migration; the supplied list has no environment export.
      environment: { NEXT_PUBLIC_USE_INVESTIGATION: 'true', NEXT_PUBLIC_USE_AVVIKELSE_INVESTIGATION: 'true' },
      flags: migratedFlags,
    });
    assert.equal(result.effectiveInvestigationEnabled, true);
    migratedFlags = result.flags;
  }
  assert.deepEqual(migratedFlags, before.filter(flag => flag.name !== 'useAvvikelseInvestigation'));
  assert.equal(before.length - migratedFlags.length, 2);
  assert.deepEqual(flags, before);
});

test('rejects ambiguous, unversioned and malformed exports without echoing values', () => {
  for (const input of [
    fixture({ version: undefined }), fixture({ version: 3 }),
    fixture({ version: 2, flags: [row('useAvvikelseInvestigation', false)] }),
    fixture({ flags: [row('useInvestigation', true), row('useInvestigation', false)] }),
    fixture({ flags: [row('useInvestigation', 'private-value')] }),
    fixture({ environment: { CLIENT_SECRET: 'private-value' } }),
  ]) assert.throws(() => migrateInvestigationFlags(input), error => {
    assert.doesNotMatch(error.message, /private-value/u);
    return /Invalid migration input/u.test(error.message);
  });
});

test('CLI writes a separate proposal, never overwrites a file or prints exported rows', () => {
  const directory = mkdtempSync(join(tmpdir(), 'investigation-migration-'));
  try {
    const source = join(directory, 'source.json');
    const destination = join(directory, 'proposal.json');
    writeFileSync(source, JSON.stringify(fixture({ flags: [row('unrelated', true, { description: 'private-value' })] })));
    const run = () => spawnSync(process.execPath, ['scripts/migrate-investigation-flags.mjs', source, destination], { encoding: 'utf8' });
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.doesNotMatch(first.stdout + first.stderr, /private-value/u);
    const proposal = readFileSync(destination, 'utf8');
    assert.equal(run().status, 1);
    assert.equal(readFileSync(destination, 'utf8'), proposal);
    assert.equal(JSON.parse(readFileSync(source, 'utf8')).version, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
