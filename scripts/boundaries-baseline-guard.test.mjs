import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

test('baseline guard allows reductions and rejects growth, malformed baselines and unknown refs', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dragon-baseline-'));
  const dependencies = 'frontend/.dependency-cruiser-known-violations.json';
  const suppressions = 'frontend/eslint-suppressions.json';
  const edge = { rule: { name: 'domain-boundary' }, from: 'a.ts', to: 'b.ts' };
  const baseline = { 'a.ts': { 'test-rule': { count: 2 } } };
  const write = (file, data) => writeFileSync(join(directory, file), JSON.stringify(data));
  const git = (...args) => execFileSync('/usr/bin/git', ['-C', directory, ...args], { stdio: 'pipe' });
  try {
    mkdirSync(join(directory, 'scripts'));
    mkdirSync(join(directory, 'frontend'));
    const cli = join(directory, 'scripts/boundaries-baseline-guard.mjs');
    cpSync(fileURLToPath(new URL('./boundaries-baseline-guard.mjs', import.meta.url)), cli);
    write(dependencies, [edge]);
    write(suppressions, baseline);
    git('init', '--quiet');
    git('add', '.');
    git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'baseline');
    const check = (ref = 'HEAD') => spawnSync(process.execPath, [cli, ref], { encoding: 'utf8' });
    assert.equal(check().status, 0);

    write(dependencies, []);
    write(suppressions, { 'a.ts': { 'test-rule': { count: 1 } } });
    assert.equal(check().status, 0);

    write(dependencies, [edge, edge]);
    write(suppressions, { 'a.ts': { 'test-rule': { count: 3 } } });
    const growth = check();
    assert.equal(growth.status, 1);
    assert.match(growth.stdout, /domain-boundary: a.ts -> b.ts/);
    assert.match(growth.stdout, /a.ts \[test-rule\]/);

    write(dependencies, {});
    const malformed = check();
    assert.notEqual(malformed.status, 0);
    assert.match(malformed.stderr, /expected an array/);

    write(dependencies, [edge]);
    write(suppressions, null);
    assert.match(check().stderr, /expected an object/);
    assert.equal(check('missing-base-ref').status, 1);

    rmSync(join(directory, dependencies));
    rmSync(join(directory, suppressions));
    assert.equal(check().status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
