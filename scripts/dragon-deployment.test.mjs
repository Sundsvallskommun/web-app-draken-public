import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { assertSafeRuntimeEnvironment, composeRelease, deploymentIdentity, runtimeEnvironment, validateRelease } from './dragon-deployment.cjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const example = JSON.parse(readFileSync(join(root, 'deployments/example-iaf-test.json'), 'utf8'));
const fixture = () => structuredClone(example);
const build = { id: 'IAF', revision: example.revision };

function withSecrets(run) {
  const directory = mkdtempSync(join(tmpdir(), 'draken-release-'));
  const release = fixture();
  try {
    for (const [name, reference] of Object.entries(release.backend.secrets)) {
      const file = join(directory, reference);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, `private-fixture-${name}\n`, { mode: 0o600 });
    }
    return run(release, directory);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

test('a reviewed release binds image digests, namespaces, municipality, API target and secret references', () => {
  assert.equal(validateRelease(fixture()).dragon, 'IAF');
  const invalid = [
    release => { release.frontend.image = 'registry.example/frontend:latest'; },
    release => { release.frontend.environment.NEXT_PUBLIC_MUNICIPALITY_ID = '2260'; },
    release => { release.backend.environment.CASEDATA_NAMESPACE = 'OTHER'; },
    release => { release.backend.secrets.CLIENT_SECRET = 'vof/test/client-secret'; },
    release => { release.backend.secrets.CLIENT_SECRET = 'iaf/production/client-secret'; },
    release => { release.backend.secrets.CLIENT_SECRET = 'iaf/test/../../outside'; },
    release => { release.backend.environment.CLIENT_SECRET = 'should-not-be-printed'; },
    release => { release.backend.environment.REDIS_PASSWORD = 'should-not-be-printed'; },
    release => { release.frontend.environment.NEXT_PUBLIC_IS_CASEDATA = 'true'; },
    release => { release.backend.environment.APPLICATION = 'VOF'; },
    release => { release.frontend.environment.NEXT_PUBLIC_API_URL = 'https://api.example/vof'; },
    release => { release.frontend.environment.NEXT_PUBLIC_API_URL = 'https://private:password@example/iaf'; },
    release => { release.frontend.environment.NEXT_PUBLIC_USE_AOT_INVESTIGATION = 'true'; },
    release => { release.backend.environment.NEXT_PUBLIC_USE_INVESTIGATION = 'false'; },
    release => { release.frontend.environment.NEXT_PUBLIC_USE_INVESTIGATION = 'yes'; },
    release => { release.frontend.environment.NEXT_PUBLIC_USE_AVVIKELSE_INVESTIGATION = 'false'; },
    release => { release.backend.port = release.frontend.port; },
    release => { release.frontend.port = 65536; },
    release => { release.dataVolume = '../other-volume'; },
    release => { release.backend.environment.NODE_DEBUG = 'child_process'; },
  ];
  for (const mutate of invalid) {
    const release = fixture(); mutate(release);
    assert.throws(() => validateRelease(release), error => {
      assert.doesNotMatch(error.message, /should-not-be-printed|private:password/u);
      return true;
    });
  }
});

test('the deployment id is stable for key order and changes for either image, config or secret reference', () => {
  const release = fixture();
  const expected = deploymentIdentity(release);
  // Existing reviewed releases must keep their identity when serialization is refactored.
  assert.equal(expected.deployment, '623609296854dacd5be76ccd2f641ac9cf86627d1460bdcb0fb18d1d3abdc8ad');
  assert.deepEqual(deploymentIdentity(Object.fromEntries(Object.entries(release).reverse())), expected);
  for (const mutate of [
    value => { value.frontend.image = value.frontend.image.replace(/0{64}$/u, 'a'.repeat(64)); },
    value => { value.backend.image = value.backend.image.replace(/0{64}$/u, 'b'.repeat(64)); },
    value => { value.backend.environment.SUPPORTMANAGEMENT_NAMESPACE = 'OTHER'; },
    value => { value.backend.secrets.CLIENT_SECRET = 'iaf/test/rotated-client-secret'; },
  ]) {
    const changed = fixture(); mutate(changed);
    assert.notEqual(deploymentIdentity(changed).deployment, expected.deployment);
  }
});

test('runtime rejects image mixups and copied environment values before starting the server', () => withSecrets((release, directory) => {
  const environment = runtimeEnvironment('backend', build, release, {}, directory);
  assert.equal(environment.APPLICATION, 'IAF');
  assert.equal(environment.NEXT_PUBLIC_USE_INVESTIGATION, release.frontend.environment.NEXT_PUBLIC_USE_INVESTIGATION);
  const off = structuredClone(release);
  off.frontend.environment.NEXT_PUBLIC_USE_INVESTIGATION = 'false';
  assert.equal(runtimeEnvironment('backend', build, off, {}, directory).NEXT_PUBLIC_USE_INVESTIGATION, 'false');
  assert.throws(() => runtimeEnvironment('backend', build, off, { NEXT_PUBLIC_USE_INVESTIGATION: 'true' }, directory), /differs from the reviewed release/u);
  assert.equal(environment.CLIENT_SECRET, 'private-fixture-CLIENT_SECRET');
  assert.equal(environment.SUPPORTMANAGEMENT_NAMESPACE, 'HEALTHCAREDEVIATIONIAF');
  assert.equal(environment.NODE_ENV, 'production');
  assert.equal(environment.DRAKEN_DEPLOYMENT_ID, deploymentIdentity(release).deployment);
  for (const wrong of [{ ...build, id: 'VOF' }, { ...build, revision: 'a'.repeat(40) }]) {
    assert.throws(() => runtimeEnvironment('backend', wrong, release, {}, directory), /image identity or revision/);
  }
  for (const inherited of [
    { APPLICATION: 'VOF' },
    { SUPPORTMANAGEMENT_NAMESPACE: 'HEALTHCAREDEVIATIONVOF' },
    { API_BASE_URL: 'https://other.example' },
    { CLIENT_SECRET: 'copied-secret-must-not-leak' },
    { AUTHORIZED_GROUPS: 'other-dragons-group' },
    { CASEDATA_NAMESPACE: 'OTHER' },
    { NEXT_PUBLIC_USE_AOT_INVESTIGATION: 'true' },
    { ADMINPANEL_URL: 'https://other.example/flags' },
    { DEBUG: 'private-fixture-debug-selector' },
    { NODE_DEBUG: 'http,child_process' },
    { NODE_DEBUG_NATIVE: 'private-fixture-debug-selector' },
  ]) assert.throws(() => runtimeEnvironment('backend', build, release, inherited, directory), error => {
    assert.doesNotMatch(error.message, /copied-secret-must-not-leak|other-dragons-group|private-fixture-debug-selector/);
    return true;
  });
  assert.throws(() => runtimeEnvironment('backend', build, release, {}, join(directory, 'missing')), /secret reference/);
}));

test('the same diagnostic environment policy applies before development and production processes start', () => {
  assert.doesNotThrow(() => assertSafeRuntimeEnvironment({ DEBUG: '', NODE_DEBUG: '' }));
  assert.throws(() => assertSafeRuntimeEnvironment({ CLIENT_SECRET: 'private-fixture\0secret' }), error => {
    assert.match(error.message, /null byte/);
    assert.doesNotMatch(error.message, /private-fixture|secret/);
    return true;
  });
  for (const name of ['DEBUG', 'NODE_DEBUG', 'NODE_DEBUG_NATIVE']) {
    assert.throws(() => assertSafeRuntimeEnvironment({ [name]: 'private-fixture-selector' }), error => {
      assert.match(error.message, /not supported; use the application's safe diagnostics/);
      assert.doesNotMatch(error.message, /private-fixture-selector/);
      return true;
    });
  }
});

test('log retention is an explicit reviewed backend setting and cannot be overridden at startup', () => withSecrets((release, directory) => {
  assert.throws(() => runtimeEnvironment('backend', build, release, { LOG_RETENTION_DAYS: '7' }, directory), /not declared/);
  const priorIdentity = deploymentIdentity(release);
  release.backend.environment.LOG_RETENTION_DAYS = '7';
  assert.notEqual(deploymentIdentity(release).deployment, priorIdentity.deployment);
  assert.equal(runtimeEnvironment('backend', build, release, {}, directory).LOG_RETENTION_DAYS, '7');
  assert.throws(() => runtimeEnvironment('backend', build, release, { LOG_RETENTION_DAYS: '14' }, directory), /differs/);
  for (const invalid of ['0', '-1', '1.5', '7d', '', '9007199254740992']) {
    release.backend.environment.LOG_RETENTION_DAYS = invalid;
    assert.throws(() => validateRelease(release), /positive integer/);
  }
  delete release.backend.environment.LOG_RETENTION_DAYS;
  release.frontend.environment.LOG_RETENTION_DAYS = '7';
  assert.throws(() => validateRelease(release), /belongs to backend/);
}));

test('every backend environment read stays under the reviewed runtime contract as configuration grows', () => withSecrets((release, directory) => {
  const source = join(root, 'backend/src');
  const names = new Set();
  for (const file of readdirSync(source, { recursive: true }).filter(file => file.endsWith('.ts') && !file.startsWith('tests/') && !file.includes('/data-contracts/'))) {
    const text = readFileSync(join(source, file), 'utf8');
    for (const [, name] of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/gu)) names.add(name);
    for (const [, fields] of text.matchAll(/export const\s*\{([^}]+)\}\s*=\s*process\.env/gu)) {
      for (const name of fields.split(',').map(field => field.trim()).filter(Boolean)) names.add(name);
    }
  }
  for (const name of names) {
    // These select the manifest/secret directory itself and are checked by the launcher.
    if (['DRAKEN_DEPLOYMENT_FILE', 'DRAKEN_SECRET_DIRECTORY'].includes(name)) continue;
    assert.throws(() => runtimeEnvironment('backend', build, release, { [name]: 'undeclared-fixture-value' }, directory),
      /runtime value/, `${name} must not bypass the reviewed release`);
  }
}));

test('Compose includes only the correct service secrets, immutable images and a stable volume owner for rollback', () => withSecrets((release, directory) => {
  const compose = composeRelease(release, join(directory, 'release.json'), directory);
  assert.equal(compose.name, 'draken-iaf-test');
  assert.equal(compose.services.frontend.image, release.frontend.image);
  assert.equal(compose.services.backend.image, release.backend.image);
  assert.equal(compose.services.frontend.volumes.length, 1);
  assert.equal(compose.services.backend.volumes.filter(volume => volume.target.startsWith('/run/draken-secrets/')).length, 6);
  assert.doesNotMatch(JSON.stringify(compose), /private-fixture-/);
  assert.ok(compose.services.backend.volumes.filter(volume => volume.type === 'bind').every(volume => volume.read_only));
  const older = fixture(); older.revision = 'c'.repeat(40);
  assert.equal(composeRelease(older, join(directory, 'older.json'), directory).name, compose.name);
  assert.deepEqual(composeRelease(older, join(directory, 'older.json'), directory).volumes, compose.volumes);
}));

test('image startup requires a reviewed release and immutable revision even if runtime build variables are changed', () => withSecrets((release, directory) => {
  mkdirSync(join(directory, 'scripts'));
  for (const file of ['assert-dragon-image.cjs', 'dragon-deployment.cjs']) cpSync(join(root, 'scripts', file), join(directory, 'scripts', file));
  cpSync(join(root, 'dragons.json'), join(directory, 'dragons.json'));
  writeFileSync(join(directory, 'dragon-build.json'), JSON.stringify(build));
  writeFileSync(join(directory, 'release.json'), JSON.stringify(release));
  const cli = join(directory, 'scripts/assert-dragon-image.cjs');
  const env = { DRAKEN_DEPLOYMENT_FILE: join(directory, 'release.json'), DRAKEN_SECRET_DIRECTORY: directory };
  for (const side of ['frontend', 'backend']) {
    assert.equal(spawnSync(process.execPath, [cli, side], { env, encoding: 'utf8' }).status, 0);
    assert.notEqual(spawnSync(process.execPath, [cli, side], { env: {}, encoding: 'utf8' }).status, 0);
    const identityName = side === 'frontend' ? 'NEXT_PUBLIC_APPLICATION' : 'APPLICATION';
    const wrong = spawnSync(process.execPath, [cli, side], { env: { ...env, [identityName]: 'VOF', DRAKEN_BUILD_DRAGON: 'VOF', DEPLOY_COMMIT: 'a'.repeat(40) }, encoding: 'utf8' });
    assert.notEqual(wrong.status, 0);
    assert.doesNotMatch(wrong.stderr, /private-fixture-/);
  }
}));

test('production CLI does not fall back to an available development env file', () => {
  const result = spawnSync(process.execPath, [join(root, 'scripts/dragon.mjs'), 'start', 'IAF', 'backend'], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Production backend start requires DRAKEN_DEPLOYMENT_FILE/);
});

test('the real image launcher rejects corrupt secrets without echoing them into startup logs', () => withSecrets((release, directory) => {
  mkdirSync(join(directory, 'scripts'));
  for (const file of ['start-dragon.cjs', 'assert-dragon-image.cjs', 'dragon-deployment.cjs', 'replace-frontend-env.cjs']) {
    cpSync(join(root, 'scripts', file), join(directory, 'scripts', file));
  }
  cpSync(join(root, 'dragons.json'), join(directory, 'dragons.json'));
  writeFileSync(join(directory, 'dragon-build.json'), JSON.stringify(build));
  release.frontend.secrets.HEALTH_PASSWORD = 'iaf/test/health-password';
  writeFileSync(join(directory, 'release.json'), JSON.stringify(release));
  const environment = { DRAKEN_DEPLOYMENT_FILE: join(directory, 'release.json'), DRAKEN_SECRET_DIRECTORY: directory };
  for (const [side, name] of [['backend', 'CLIENT_SECRET'], ['frontend', 'HEALTH_PASSWORD']]) {
    writeFileSync(join(directory, release[side].secrets[name]), 'private-fixture-startup-secret\0corrupted');
    const result = spawnSync(process.execPath, [join(directory, 'scripts/start-dragon.cjs'), side], { env: environment, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /secret reference for .* contains a null byte/);
    assert.doesNotMatch(result.stdout + result.stderr, /private-fixture-startup-secret|corrupted/);
  }
  writeFileSync(join(directory, release.backend.secrets.CLIENT_SECRET), 'safe-fixture-secret');
  const pem = '-----BEGIN PRIVATE KEY-----\nprivate-fixture-pem\n-----END PRIVATE KEY-----';
  writeFileSync(join(directory, release.backend.secrets.SAML_PRIVATE_KEY), pem + '\n');
  assert.equal(runtimeEnvironment('backend', build, release, {}, directory).SAML_PRIVATE_KEY, pem);
}));


test('image launcher rejects directory traversal before reading deployment files or starting a process', () => {
  for (const side of ['../outside', '/tmp', 'frontend/../../outside', 'unknown', '']) {
    const result = spawnSync(process.execPath, [join(root, 'scripts/start-dragon.cjs'), side], { env: {}, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Select frontend or backend/);
    assert.doesNotMatch(result.stderr, /ENOENT|DRAKEN_DEPLOYMENT_FILE/);
  }
});
