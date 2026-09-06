import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('the CLI lists available dragons and rejects invalid build targets before running tools', () => {
  const cli = join(root, 'scripts/dragon.mjs');
  const list = spawnSync(process.execPath, [cli, 'list'], { encoding: 'utf8' });
  assert.equal(list.status, 0);
  assert.match(list.stdout, /IAF\s+supportmanagement \+ avvikelse/);
  for (const args of [['build', 'unknown'], ['build', 'IAF', 'unknown'], ['build-family', 'unknown']]) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
  }
});

test('immutable image metadata restricts runtime identity for both services', () => {
  const directory = mkdtempSync(join(tmpdir(), 'dragon-image-'));
  try {
    mkdirSync(join(directory, 'scripts'));
    cpSync(join(root, 'scripts/assert-dragon-image.cjs'), join(directory, 'scripts/assert-dragon-image.cjs'));
    cpSync(join(root, 'dragons.json'), join(directory, 'dragons.json'));
    writeFileSync(join(directory, 'dragon-build.json'), JSON.stringify({ id: 'IAF' }));
    for (const side of ['frontend', 'backend']) {
      for (const identity of ['IAF', 'VOF', 'KC', 'MEX', 'unknown', '']) {
        const result = spawnSync(process.execPath, [join(directory, 'scripts/assert-dragon-image.cjs'), side], {
          env: { ...process.env, APPLICATION: identity, NEXT_PUBLIC_APPLICATION: identity, DRAKEN_BUILD_DRAGON: identity },
          encoding: 'utf8',
        });
        assert.equal(result.status === 0, identity === 'IAF', `${side}: ${identity}`);
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('artifact checks reject unknown IDs and traversal before reading artifacts', () => {
  const cli = join(root, 'scripts/check-backend-artifact.mjs');
  for (const id of ['unknown', '../../../outside', 'IAF/../../outside', 'toString', '']) {
    const result = spawnSync(process.execPath, [cli, id], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Specify a valid dragon/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
  }
});
